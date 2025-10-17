/*
  Hanssem Detail Page Scraper
  - Reads existing hanssem-*.json files from data/한샘/
  - For each product, visits the detail page and extracts:
    1. All product images (thumbnails A1, A2, B1, B2, etc.)
    2. Detail text sections (cont-txt divs with h2 and p tags)
    3. Additional images from detail content area
  - Outputs: Updates the same JSON files with detail data
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(process.cwd(), 'data', '한샘');
const DELAY_BETWEEN_PRODUCTS = 1500; // 1.5초
const DELAY_BETWEEN_CATEGORIES = 3000; // 3초
const MAX_RETRIES = 3;

async function scrapeProductDetail(page, productUrl, productTitle) {
  console.log(`  → Scraping: ${productTitle}`);

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000 + Math.random() * 1000);

    // 1. Extract thumbnail images (작은 이미지들)
    const thumbnailImages = await page.$$eval(
      'div[class*="ImageInfo"] img, div[class*="thumbnail"] img, div[width="52"][height="52"] img',
      (imgs) => imgs.map(img => img.src).filter(src => src && src.includes('hanssem.com'))
    ).catch(() => []);

    // 2. Try to click "상세정보 펼치기" button if it exists
    try {
      const expandButton = await page.$('button:has-text("상세정보 펼치기")');
      if (expandButton) {
        await expandButton.click();
        await page.waitForTimeout(800);
        console.log(`    ✓ Expanded detail section`);
      }
    } catch (e) {
      // Button might not exist or already expanded
    }

    // 3. Extract detail text sections (cont-txt divs)
    const detailSections = await page.$$eval(
      'div.cont-txt, div[class*="cont-txt"]',
      (divs) => {
        return divs.map(div => {
          const h2 = div.querySelector('h2');
          const title = h2 ? h2.textContent.trim() : '';
          const paragraphs = Array.from(div.querySelectorAll('p'))
            .map(p => p.textContent.trim())
            .filter(text => text && text !== '');
          return { title, description: paragraphs.join('\n') };
        }).filter(item => item.title || item.description);
      }
    ).catch(() => []);

    // 4. Extract all detail images (큰 이미지들)
    const detailImages = await page.$$eval(
      'img[src*="hanssem.com"]',
      (imgs) => {
        const seen = new Set();
        return imgs
          .map(img => img.src)
          .filter(src => {
            if (!src || seen.has(src)) return false;
            // Filter out icons, badges, and small UI images
            if (src.includes('icon') || src.includes('badge') || src.includes('logo')) return false;
            seen.add(src);
            return true;
          });
      }
    ).catch(() => []);

    return {
      thumbnailImages: [...new Set(thumbnailImages)],
      detailSections,
      detailImages: [...new Set(detailImages)],
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
  const withDetails = products.filter(p => p.detailSections || p.thumbnailImages).length;
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
    if (product.detailSections && product.detailSections.length > 0) {
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
  console.log('🚀 Starting Hanssem Detail Scraper...\n');

  const categories = [
    'hanssem-침실.json',
    'hanssem-거실.json',
    'hanssem-다이닝.json',
    'hanssem-옷장, 드레스룸.json',
    'hanssem-키즈룸.json',
    'hanssem-홈오피스.json'
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