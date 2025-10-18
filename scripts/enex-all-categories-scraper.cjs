const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const DELAY_BETWEEN_PRODUCTS = 1500;
const DELAY_BETWEEN_CATEGORIES = 3000;
const MAX_RETRIES = 3;
const SAVE_INTERVAL = 10;

const CATEGORIES = [
  "enex-리모델링주방.json",
  "enex-붙박이장.json",
  "enex-서재오피스.json",
  "enex-소파거실.json",
  "enex-식탁다이닝.json",
  "enex-옷장드레스룸.json",
  "enex-중문.json",
  "enex-침실가구.json",
];

const excludePatterns = [
  "delivery",
  "event",
  "banner",
  "logo",
  "icon",
  "button",
  "_intro",
  "_info",
];

async function scrapeProductDetail(page, productUrl, retries = 0) {
  try {
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);

    const allImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      return images.map((img) => img.src);
    });

    // gdcdn.enex.co.kr/UPLOAD 경로만 필터링
    const detailImages = allImages.filter((src) => {
      if (!src.includes("gdcdn.enex.co.kr/UPLOAD")) return false;
      return !excludePatterns.some((pattern) =>
        src.toLowerCase().includes(pattern)
      );
    });

    const uniqueImages = [...new Set(detailImages)];
    return uniqueImages;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`    ⚠️  Retry ${retries + 1}/${MAX_RETRIES}...`);
      await page.waitForTimeout(2000);
      return scrapeProductDetail(page, productUrl, retries + 1);
    }
    throw error;
  }
}

async function processCategoryFile(browser, categoryFile) {
  const dataDir = path.join(__dirname, "..", "data", "에넥스");
  const filePath = path.join(dataDir, categoryFile);

  console.log(`\n📦 Processing: ${categoryFile}`);

  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found: ${categoryFile}`);
    return { scraped: 0, errors: 0, total: 0 };
  }

  const products = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`   Total products: ${products.length}`);

  let alreadyScraped = products.filter(
    (p) => p.detailImages && p.detailImages.length > 0
  ).length;
  console.log(`   Already scraped: ${alreadyScraped}/${products.length}\n`);

  const page = await browser.newPage();
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    if (product.detailImages && product.detailImages.length > 0) {
      console.log(`  ⏭️  Skipping: ${product.title} (already scraped)`);
      continue;
    }

    console.log(`  → Scraping [${i + 1}/${products.length}]: ${product.title}`);

    try {
      const detailImages = await scrapeProductDetail(page, product.productUrl);

      product.detailImages = detailImages;
      product.scrapedDetailAt = new Date().toISOString();

      console.log(`    ✓ Images: ${detailImages.length}`);
      successCount++;
      console.log(`    ✓ Success (${successCount} total)\n`);

      if (successCount % SAVE_INTERVAL === 0) {
        fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
        console.log(
          `    💾 Saved progress: ${successCount + alreadyScraped}/${products.length}\n`
        );
      }

      await page.waitForTimeout(DELAY_BETWEEN_PRODUCTS);
    } catch (error) {
      console.error(`    ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
  console.log(
    `    💾 Saved progress: ${successCount + alreadyScraped}/${products.length}\n`
  );

  await page.close();

  console.log(`✅ ${categoryFile} complete:`);
  console.log(
    `   Scraped: ${successCount}, Errors: ${errorCount}, Total: ${products.length}\n`
  );

  return { scraped: successCount, errors: errorCount, total: products.length };
}

async function main() {
  console.log("🚀 Starting 에넥스 All Categories Batch Scraper...\n");
  console.log(`📊 Total: 8 categories, ~640 products\n`);

  const browser = await chromium.launch({ headless: true });

  let totalScraped = 0;
  let totalErrors = 0;
  let totalProducts = 0;

  for (const categoryFile of CATEGORIES) {
    const result = await processCategoryFile(browser, categoryFile);
    totalScraped += result.scraped;
    totalErrors += result.errors;
    totalProducts += result.total;

    await new Promise((resolve) =>
      setTimeout(resolve, DELAY_BETWEEN_CATEGORIES)
    );
  }

  await browser.close();

  console.log("🎉 All categories completed!");
  console.log(`   Total Scraped: ${totalScraped}`);
  console.log(`   Total Errors: ${totalErrors}`);
  console.log(`   Total Products: ${totalProducts}`);
  console.log(
    `   Success Rate: ${((totalScraped / totalProducts) * 100).toFixed(1)}%`
  );
}

main().catch(console.error);
