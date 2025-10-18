/*
  Alloso Detail Page Scraper - Final Version
  - 알로소 제품 상세페이지 크롤링
  - 기존에 있는 detailImage1, detailImage2, detailText1, detailText2 유지
  - 추가로 모든 상세 이미지 배열 수집 (detailImages)
  - SAME COLLECTION 수집 (sameCollection)
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
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForTimeout(1500);

    // Scroll to load all lazy-loaded images
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });

    await page.waitForTimeout(2000);

    // Extract detail data
    const detailData = await page.evaluate(() => {
      const result = {
        detailImages: [],
        sameCollection: []
      };

      // 1. Find all detail images (from cdn.alloso.co.kr/AllosoUpload/contents/)
      const allDetailDivs = document.querySelectorAll('[class*="detail"]');
      const detailImageSet = new Set();
      
      allDetailDivs.forEach(div => {
        // SPECIFICATION 섹션은 제외
        if (div.classList.contains('detail_specify')) {
          return;
        }

        const imgs = div.querySelectorAll('img');
        imgs.forEach(img => {
          const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
          if (src && src.includes('cdn.alloso.co.kr/AllosoUpload/contents/')) {
            detailImageSet.add(src);
          }
        });
      });

      result.detailImages = Array.from(detailImageSet);

      // 2. Extract SAME COLLECTION items
      const sameCollectionItems = document.querySelectorAll('.detail_same_list .goods_item');
      sameCollectionItems.forEach(item => {
        const link = item.querySelector('.link_goods');
        const thumb = item.querySelector('.goods_thumb img');
        const titleEl = item.querySelector('.tit');
        const descEl = item.querySelector('.desc');
        const priceEl = item.querySelector('.selling_price em');

        if (link && titleEl) {
          const href = link.getAttribute('href');
          result.sameCollection.push({
            title: titleEl.textContent.trim(),
            desc: descEl ? descEl.textContent.trim() : '',
            price: priceEl ? priceEl.textContent.trim() : '',
            image: thumb ? thumb.src : '',
            url: href ? 'https://www.alloso.co.kr' + href : ''
          });
        }
      });

      return result;
    });

    console.log(`    ✓ Detail Images: ${detailData.detailImages.length}`);
    console.log(`    ✓ Same Collection: ${detailData.sameCollection.length}`);

    return {
      ...detailData,
      scrapedDetailAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`    ✗ Failed: ${error.message}`);
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
  const withDetails = products.filter(p => p.detailImages && p.detailImages.length > 0).length;
  console.log(`   Already scraped: ${withDetails}/${products.length}`);

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'ko-KR',
    viewport: { width: 1366, height: 768 }
  });

  // Anti-detection
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US'] });
  });

  const page = await context.newPage();

  let scrapedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // Skip if already has detail data
    if (product.detailImages && product.detailImages.length > 10) {
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
      // Update product with detail data (기존 detailImage1, detailImage2, detailText1, detailText2 유지)
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
  await context.close();

  console.log(`✅ ${categoryFile} complete:`);
  console.log(`   Scraped: ${scrapedCount}, Errors: ${errorCount}, Total: ${products.length}`);

  return { scrapedCount, errorCount };
}

(async () => {
  console.log('🚀 Starting Alloso Detail Scraper...\n');

  // Find all alloso JSON files
  const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('alloso-') && f.endsWith('.json') && f !== 'alloso-소파-scraped.json');

  if (files.length === 0) {
    console.log('❌ No alloso-*.json files found in data/알로소/');
    process.exit(1);
  }

  console.log(`📂 Found ${files.length} categories:`);
  files.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let totalScraped = 0;
  let totalErrors = 0;

  for (let i = 0; i < files.length; i++) {
    const result = await processCategory(browser, files[i]);
    if (result) {
      totalScraped += result.scrapedCount;
      totalErrors += result.errorCount;
    }

    // Delay between categories (except last one)
    if (i < files.length - 1) {
      console.log(`\n⏳ Waiting ${DELAY_BETWEEN_CATEGORIES}ms before next category...\n`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CATEGORIES));
    }
  }

  await browser.close();

  console.log('\n🎉 All categories processed!');
  console.log(`📊 Total scraped: ${totalScraped}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log(`💾 Files updated in: ${DATA_DIR}`);

  console.log('\n💡 Next Steps:');
  console.log('  1. Run: node scripts/organize-alloso.cjs');
  console.log('  2. Check: data/알로소/ for updated files');
  console.log('  3. Create alloso-products page similar to other brands');
})();
