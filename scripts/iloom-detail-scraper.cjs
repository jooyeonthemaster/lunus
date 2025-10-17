/*
  Iloom Detail Page Scraper
  - Reads existing iloom-products-xhr.json from data/일룸/
  - For each product, visits the detail page and extracts:
    1. Gallery images from .bxslider .img_productGalery_S
    2. Detail text sections from .contents_title and .contents_100contents
  - Outputs: Updates iloom-products-xhr.json with detail data
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(process.cwd(), 'data', '일룸');
const CATEGORY_FILES = [
  'iloom-거실.json',
  'iloom-서재.json',
  'iloom-옷장.json',
  'iloom-조명.json',
  'iloom-주방.json',
  'iloom-키즈룸.json',
  'iloom-학생방.json'
];
const DELAY_BETWEEN_PRODUCTS = 1500; // 1.5초
const DELAY_BETWEEN_CATEGORIES = 3000; // 3초
const MAX_RETRIES = 3;

async function scrapeProductDetail(page, productUrl, productTitle) {
  console.log(`  → Scraping: ${productTitle}`);

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000 + Math.random() * 1000);

    // 1. Get gallery images from .bxslider
    const galleryImages = await page.$$eval(
      '.bxslider .img_productGalery_S, #detailImgList img',
      (imgs) => {
        return imgs
          .map(img => {
            let src = img.src || img.getAttribute('data-src');

            // Convert relative URLs to absolute
            if (src && src.startsWith('/')) {
              src = 'https://www.iloom.com' + src;
            }

            return src;
          })
          .filter(src => src && src.includes('iloom.com'));
      }
    ).catch(() => []);

    // Remove duplicates
    const uniqueGalleryImages = [...new Set(galleryImages)];

    // 2. Get detail text sections from .box
    const detailSections = await page.$$eval(
      '.box',
      (boxes) => {
        return boxes
          .map(box => {
            const titleEl = box.querySelector('.contents_title h3');
            const contentEl = box.querySelector('.contents_100contents');

            if (!titleEl && !contentEl) return null;

            const title = titleEl ? titleEl.textContent.trim() : '';
            const content = contentEl ? contentEl.textContent.trim() : '';

            // Skip if both are empty
            if (!title && !content) return null;

            // Clean up content
            const cleanContent = content
              .replace(/\s+/g, ' ')
              .replace(/\n+/g, '\n')
              .trim();

            return {
              title: title,
              description: cleanContent
            };
          })
          .filter(section => section !== null);
      }
    ).catch(() => []);

    console.log(`    ✓ Gallery images: ${uniqueGalleryImages.length}`);
    console.log(`    ✓ Detail sections: ${detailSections.length}`);

    return {
      galleryImages: uniqueGalleryImages,
      detailSections: detailSections,
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
  const withDetails = products.filter(p => p.galleryImages && p.galleryImages.length > 0).length;
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
    if (product.galleryImages && product.galleryImages.length > 0) {
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
  console.log('🚀 Starting Iloom Detail Scraper...\n');
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
