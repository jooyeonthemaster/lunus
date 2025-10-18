const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const DELAY_BETWEEN_PRODUCTS = 1500;
const DELAY_BETWEEN_CATEGORIES = 3000;
const MAX_RETRIES = 3;
const SAVE_INTERVAL = 5;

const CATEGORIES = [
  "emons-소파.json",
  "emons-수납가구.json",
  "emons-식탁.json",
  "emons-중문.json",
  "emons-침대,매트리스.json",
  "emons-학생,서재.json",
];

const excludePatterns = [
  "deliveryinfo",
  "emons_bn",
  "high-quality",
  "E0.jpg",
  "iso_com",
];

async function scrapeProductDetail(page, productUrl, retries = 0) {
  try {
    await page.goto(productUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const allImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      return images.map((img) => ({
        src: img.src,
        alt: img.alt || "",
      }));
    });

    const emonsImages = allImages
      .map((img) => img.src)
      .filter((src) => {
        return src.includes("emons.co.kr");
      });

    const uniqueImages = [...new Set(emonsImages)];

    const detailImages = uniqueImages.filter((src) => {
      if (!src.includes("/mall/assets/images/prod/")) return false;
      return !excludePatterns.some((pattern) => src.includes(pattern));
    });

    return detailImages;
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
  const dataDir = path.join(__dirname, "..", "data", "에몬스");
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

    console.log(`  → Scraping: ${product.title}`);

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
  console.log(`    💾 Saved progress: ${successCount + alreadyScraped}/${products.length}\n`);

  await page.close();

  console.log(`✅ ${categoryFile} complete:`);
  console.log(
    `   Scraped: ${successCount}, Errors: ${errorCount}, Total: ${products.length}\n`
  );

  return { scraped: successCount, errors: errorCount, total: products.length };
}

async function main() {
  console.log("🚀 Starting 에몬스 All Categories Batch Scraper...\n");

  const browser = await chromium.launch({ headless: true });

  let totalScraped = 0;
  let totalErrors = 0;
  let totalProducts = 0;

  for (const categoryFile of CATEGORIES) {
    const result = await processCategoryFile(browser, categoryFile);
    totalScraped += result.scraped;
    totalErrors += result.errors;
    totalProducts += result.total;

    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CATEGORIES));
  }

  await browser.close();

  console.log("🎉 All categories completed!");
  console.log(`   Total Scraped: ${totalScraped}`);
  console.log(`   Total Errors: ${totalErrors}`);
  console.log(`   Total Products: ${totalProducts}`);
  console.log(`   Success Rate: ${((totalScraped / totalProducts) * 100).toFixed(1)}%`);
}

main().catch(console.error);
