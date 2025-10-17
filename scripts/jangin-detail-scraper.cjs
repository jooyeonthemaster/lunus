/*
  Jangin Furniture Detail Page Scraper
  - Reads existing jangin-*.json files from data/장인가구/
  - For each product, visits the detail page and extracts ALL images
  - Jangin uses full-page images for product details
  - Outputs: Updates the same JSON files with detail images
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(process.cwd(), 'data', '장인가구');
const DELAY_BETWEEN_PRODUCTS = 1500; // 1.5초
const DELAY_BETWEEN_CATEGORIES = 3000; // 3초
const MAX_RETRIES = 3;

async function scrapeProductDetail(page, productUrl, productTitle) {
  console.log(`  → Scraping: ${productTitle}`);

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000 + Math.random() * 1000);

    // 1. Get the main product image (bigimg class)
    const mainImage = await page.$eval(
      'img.bigimg',
      (img) => {
        let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
        if (src && src.startsWith('/')) {
          src = 'https://www.jangin.com' + src;
        }
        return src;
      }
    ).catch(() => null);

    // 2. Get detail images from editor content area only (상세페이지 이미지만)
    const detailImages = await page.$$eval(
      '.editor_content img, .goods_info_cont img, [id*="detail"] img',
      (imgs) => {
        return imgs
          .map(img => {
            let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');

            // Convert relative URLs to absolute
            if (src && src.startsWith('/')) {
              src = 'https://www.jangin.com' + src;
            }

            return src;
          })
          .filter(src => {
            if (!src) return false;

            // Only keep images from /data/editor/ path (실제 상세 이미지)
            if (!src.includes('/data/editor/')) return false;

            // Filter out icons, logos, UI elements
            if (src.includes('icon') || src.includes('logo') || src.includes('btn_')) return false;
            if (src.includes('arrow') || src.includes('nav') || src.includes('menu')) return false;

            return true;
          });
      }
    ).catch(() => []);

    // Remove duplicates
    const uniqueDetailImages = [...new Set(detailImages)];

    console.log(`    ✓ Main image: ${mainImage ? 'Found' : 'Not found'}`);
    console.log(`    ✓ Found ${uniqueDetailImages.length} detail images`);

    return {
      imageUrl: mainImage || '',
      detailImages: uniqueDetailImages,
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
    return;
  }

  const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`\n📦 Processing: ${categoryFile} (${products.length} products)`);

  // Check how many already have detail data
  const withDetails = products.filter(p => p.detailImages && p.detailImages.length > 0).length;
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

    // Skip if already has CORRECT detail data (imageUrl from bigimg + editor images)
    if (product.imageUrl && product.imageUrl.includes('/data/product/') &&
        product.detailImages && product.detailImages.length > 0 &&
        product.detailImages[0].includes('/data/editor/')) {
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

    // Auto-save every 5 products
    if ((i + 1) % 5 === 0 || i === products.length - 1) {
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
  console.log('🚀 Starting Jangin Furniture Detail Scraper...\n');

  const categories = [
    'jangin-거실.json',
    'jangin-침실.json',
    'jangin-주방.json',
    'jangin-소가구클로이.json',
    'jangin-키즈오피스.json'
  ];

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let totalScraped = 0;
  let totalErrors = 0;

  for (let i = 0; i < categories.length; i++) {
    const result = await processCategory(browser, categories[i]);
    if (result) {
      totalScraped += result.scrapedCount;
      totalErrors += result.errorCount;
    }

    // Delay between categories (except last one)
    if (i < categories.length - 1) {
      console.log(`\n⏳ Waiting ${DELAY_BETWEEN_CATEGORIES}ms before next category...\n`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CATEGORIES));
    }
  }

  await browser.close();

  console.log('\n🎉 All categories processed!');
  console.log(`📊 Total scraped: ${totalScraped}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log(`💾 Files updated in: ${DATA_DIR}`);
})();
