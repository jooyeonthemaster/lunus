/*
  Wooami Detail Page Scraper
  - Reads existing products.json from data/우아미/
  - For each product, visits the detail page and extracts TWO detail images:
    1. Image from /web/upload/NNEditor/ path
    2. Image from //gi.esmplus.com/glory8804/ path
  - Outputs: Updates products.json with detail images
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(process.cwd(), 'data', '우아미');
const INPUT_FILE = 'products.json';
const DELAY_BETWEEN_PRODUCTS = 1500; // 1.5초
const MAX_RETRIES = 3;

async function scrapeProductDetail(page, productUrl, productTitle) {
  console.log(`  → Scraping: ${productTitle}`);

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000 + Math.random() * 1000);

    // 모든 이미지 가져오기
    const images = await page.$$eval(
      'img',
      (imgs) => {
        return imgs
          .map(img => {
            let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');

            // 상대 경로를 절대 경로로 변환
            if (src && src.startsWith('/web/upload/')) {
              src = 'https://wooamimall.com' + src;
            }
            // //로 시작하는 경우 https: 추가
            if (src && src.startsWith('//')) {
              src = 'https:' + src;
            }

            return src;
          })
          .filter(src => src);
      }
    ).catch(() => []);

    // 1. /web/upload/NNEditor/ 이미지 찾기
    const nnEditorImage = images.find(src =>
      src && src.includes('/web/upload/NNEditor/')
    ) || '';

    // 2. gi.esmplus.com/glory8804/ 이미지 찾기
    const esmplusImage = images.find(src =>
      src && src.includes('gi.esmplus.com/glory8804/')
    ) || '';

    console.log(`    ✓ NNEditor image: ${nnEditorImage ? 'Found' : 'Not found'}`);
    console.log(`    ✓ Esmplus image: ${esmplusImage ? 'Found' : 'Not found'}`);

    return {
      detailImage1: nnEditorImage,
      detailImage2: esmplusImage,
      scrapedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`    ✗ Failed to scrape: ${error.message}`);
    return null;
  }
}

async function processProducts(browser) {
  const filePath = path.join(DATA_DIR, INPUT_FILE);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠ File not found: ${INPUT_FILE}`);
    return { scrapedCount: 0, errorCount: 0 };
  }

  const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`\n📦 Processing: ${INPUT_FILE} (${products.length} products)`);

  // Check how many already have detail data
  const withDetails = products.filter(p => p.detailImage1 || p.detailImage2).length;
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
    if (product.detailImage1 || product.detailImage2) {
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

  console.log(`✅ ${INPUT_FILE} complete:`);
  console.log(`   Scraped: ${scrapedCount}, Errors: ${errorCount}, Total: ${products.length}`);

  return { scrapedCount, errorCount };
}

(async () => {
  console.log('🚀 Starting Wooami Detail Scraper...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const result = await processProducts(browser);

  await browser.close();

  console.log('\n🎉 Scraping complete!');
  console.log(`📊 Total scraped: ${result.scrapedCount}`);
  console.log(`❌ Total errors: ${result.errorCount}`);
  console.log(`💾 File updated: ${path.join(DATA_DIR, INPUT_FILE)}`);
})();
