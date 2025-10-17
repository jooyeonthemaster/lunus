/*
  Inart Detail Page Scraper
  - Reads existing inart-소파.json from data/인아트/
  - For each product, visits the detail page and extracts ONE detail image
  - Outputs: Updates inart-소파.json with detail image
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(process.cwd(), 'data', '인아트');
const CATEGORY_FILES = [
  'inart-소파.json',
  'inart-옷장, 수납장.json',
  'inart-의자.json',
  'inart-침대.json',
  'inart-테이블.json'
];
const DELAY_BETWEEN_PRODUCTS = 1500; // 1.5초
const DELAY_BETWEEN_CATEGORIES = 3000; // 3초
const MAX_RETRIES = 3;

async function scrapeProductDetail(page, productUrl, productTitle) {
  console.log(`  → Scraping: ${productTitle}`);

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000 + Math.random() * 1000);

    // 상세 이미지 하나만 찾기 (godohosting.com 도메인의 이미지)
    const detailImage = await page.$$eval(
      'img',
      (imgs) => {
        for (let img of imgs) {
          let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');

          // godohosting.com 도메인 이미지만 찾기
          if (src && src.includes('godohosting.com')) {
            // icon, logo, btn 등은 제외
            if (src.includes('icon') || src.includes('logo') || src.includes('btn')) continue;
            if (src.includes('arrow') || src.includes('nav') || src.includes('menu')) continue;
            if (src.includes('list')) continue; // 리스트 이미지 제외

            return src;
          }
        }
        return null;
      }
    ).catch(() => null);

    console.log(`    ✓ Detail image: ${detailImage ? 'Found' : 'Not found'}`);

    return {
      detailImage: detailImage || '',
      scrapedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`    ✗ Failed to scrape: ${error.message}`);
    return null;
  }
}

async function processCategory(browser, categoryFile) {
  const filePath = path.join(DATA_DIR, categoryFile);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠ File not found: ${categoryFile}`);
    return { scrapedCount: 0, errorCount: 0 };
  }

  const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`\n📦 Processing: ${categoryFile} (${products.length} products)`);

  // Check how many already have detail data
  const withDetails = products.filter(p => p.detailImage).length;
  console.log(`   Already scraped: ${withDetails}/${products.length}`);

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1366, height: 768 });

  // Anti-detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US'] });
  });

  let scrapedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // Skip if already has detail data
    if (product.detailImage) {
      console.log(`  ⏭ Skipping (already scraped): ${product.title}`);
      continue;
    }

    if (!product.productUrl) {
      console.log(`  ⚠ No URL for: ${product.title}`);
      continue;
    }

    let detailData = null;
    let retries = 0;

    while (!detailData && retries < MAX_RETRIES) {
      detailData = await scrapeProductDetail(page, product.productUrl, product.title);
      if (!detailData) {
        retries++;
        if (retries < MAX_RETRIES) {
          console.log(`    ↻ Retry ${retries}/${MAX_RETRIES}...`);
          await page.waitForTimeout(2000 * retries);
        }
      }
    }

    if (detailData) {
      // Update product with detail data
      products[i] = { ...product, ...detailData };
      scrapedCount++;
      console.log(`    ✓ Success (${scrapedCount} total)`);
    } else {
      errorCount++;
      console.log(`    ✗ Failed after ${MAX_RETRIES} retries`);
    }

    // Auto-save every 10 products
    if ((i + 1) % 10 === 0 || i === products.length - 1) {
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');
      console.log(`    💾 Saved progress: ${i + 1}/${products.length}`);
    }

    // Delay between products
    await page.waitForTimeout(DELAY_BETWEEN_PRODUCTS + Math.random() * 1000);
  }

  await page.close();

  console.log(`✅ ${categoryFile} complete:`);
  console.log(`   Scraped: ${scrapedCount}, Errors: ${errorCount}, Total: ${products.length}`);

  return { scrapedCount, errorCount };
}

(async () => {
  console.log('🚀 Starting Inart Detail Scraper...\n');
  console.log(`📂 Processing ${CATEGORY_FILES.length} categories\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let totalScraped = 0;
  let totalErrors = 0;

  for (let i = 0; i < CATEGORY_FILES.length; i++) {
    const categoryFile = CATEGORY_FILES[i];
    console.log(`\n[${i + 1}/${CATEGORY_FILES.length}] 📁 ${categoryFile}`);

    const result = await processCategory(browser, categoryFile);
    totalScraped += result.scrapedCount;
    totalErrors += result.errorCount;

    // Delay between categories
    if (i < CATEGORY_FILES.length - 1) {
      console.log(`\n⏳ Waiting ${DELAY_BETWEEN_CATEGORIES}ms before next category...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CATEGORIES));
    }
  }

  await browser.close();

  console.log('\n🎉 All categories complete!');
  console.log(`📊 Total scraped: ${totalScraped}`);
  console.log(`❌ Total errors: ${totalErrors}`);
})();
