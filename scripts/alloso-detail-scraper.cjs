/*
  Alloso Detail Page Scraper
  - Reads all alloso-*.json files from data/알로소/
  - For each product, visits the detail page and extracts:
    1. First detail image from cdn.alloso.co.kr/AllosoUpload/contents
    2. First text section (div with text-align: center and font-size: 16px)
    3. Second detail image
    4. Second text section (from div.col_item)
  - Outputs: Updates each category file with detail data
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(process.cwd(), 'data', '알로소');
const CATEGORY_FILES = [
  'alloso-소파.json',
  'alloso-스토리지.json',
  'alloso-의자.json',
  'alloso-테이블.json'
];
const DELAY_BETWEEN_PRODUCTS = 1500; // 1.5초
const DELAY_BETWEEN_CATEGORIES = 3000; // 3초
const MAX_RETRIES = 3;

async function scrapeProductDetail(page, productUrl, productTitle) {
  console.log(`  → Scraping: ${productTitle}`);

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000 + Math.random() * 1000);

    // 1. Get first detail image from cdn.alloso.co.kr/AllosoUpload/contents (excluding .detail_specify)
    const detailImage1 = await page.$$eval(
      'img',
      (imgs) => {
        for (let img of imgs) {
          // Skip if inside .detail_specify
          let parent = img.closest('.detail_specify');
          if (parent) continue;

          let src = img.src || img.getAttribute('data-src');
          if (src && src.includes('cdn.alloso.co.kr/AllosoUpload/contents')) {
            return src;
          }
        }
        return '';
      }
    ).catch(() => '');

    // 2. Get first text section (div with text-align: center and font-size: 16px, excluding .detail_specify)
    const detailText1 = await page.$$eval(
      'div[style*="text-align: center"] span[style*="font-size: 16px"]',
      (spans) => {
        for (let span of spans) {
          // Skip if inside .detail_specify
          let parent = span.closest('.detail_specify');
          if (parent) continue;

          let text = span.textContent.trim();
          if (text) {
            return text;
          }
        }
        return '';
      }
    ).catch(() => '');

    // 3. Get second detail image (excluding .detail_specify)
    const detailImage2 = await page.$$eval(
      'img',
      (imgs) => {
        let count = 0;
        for (let img of imgs) {
          // Skip if inside .detail_specify
          let parent = img.closest('.detail_specify');
          if (parent) continue;

          let src = img.src || img.getAttribute('data-src');
          if (src && src.includes('cdn.alloso.co.kr/AllosoUpload/contents')) {
            count++;
            if (count === 2) {
              return src;
            }
          }
        }
        return '';
      }
    ).catch(() => '');

    // 4. Get second text section (excluding .detail_specify)
    const detailText2 = await page.$$eval(
      'div[style*="text-align: center"] span[style*="font-size: 16px"]',
      (spans) => {
        let count = 0;
        for (let span of spans) {
          // Skip if inside .detail_specify
          let parent = span.closest('.detail_specify');
          if (parent) continue;

          let text = span.textContent.trim();
          if (text) {
            count++;
            if (count === 2) {
              return text;
            }
          }
        }
        return '';
      }
    ).catch(() => '');

    console.log(`    ✓ Detail Image 1: ${detailImage1 ? 'Found' : 'Not found'}`);
    console.log(`    ✓ Detail Text 1: ${detailText1 ? 'Found' : 'Not found'}`);
    console.log(`    ✓ Detail Image 2: ${detailImage2 ? 'Found' : 'Not found'}`);
    console.log(`    ✓ Detail Text 2: ${detailText2 ? 'Found' : 'Not found'}`);

    return {
      detailImage1,
      detailText1,
      detailImage2,
      detailText2,
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
  const withDetails = products.filter(p => p.detailImage1 || p.detailText1).length;
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
    if (product.detailImage1 || product.detailText1) {
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
  console.log('🚀 Starting Alloso Detail Scraper...\n');
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
