const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', '리바트');

const CATEGORY_FILES = [
  'livart-거실장, 거실 테이블.json',
  'livart-소파.json',
  'livart-수납장, 서랍.json',
  'livart-식탁.json',
  'livart-옷장, 드레스룸.json',
  'livart-의자.json',
  'livart-조명.json',
  'livart-책상, 책장.json',
  'livart-침대, 메트리스.json',
  'livart-키즈, 주니어.json',
  'livart-화장대, 거울, 스툴.json'
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeProductDetails(page, product, retryCount = 0) {
  const MAX_RETRIES = 3;

  try {
    console.log(`  → Scraping: ${product.title}`);

    await page.goto(product.productUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await delay(1000);

    // 모든 이미지 가져오기
    const allImages = await page.$$eval('img', imgs =>
      imgs.map(img => {
        const src = img.src || img.getAttribute('data-src') || '';
        if (src && src.includes('static.hyundailivart.co.kr/upload_mall/spec/') &&
            src.includes('_ImgPath.jpg')) {
          return src;
        }
        return null;
      }).filter(src => src !== null)
    );

    // 4, 5, 6번째 이미지 가져오기 (인덱스 3, 4, 5)
    const detailImage1 = allImages[3] || '';
    const detailImage2 = allImages[4] || '';
    const detailImage3 = allImages[5] || '';

    console.log(`    ✓ Detail Image 1: ${detailImage1 ? 'Found' : 'Not found'}`);
    console.log(`    ✓ Detail Image 2: ${detailImage2 ? 'Found' : 'Not found'}`);
    console.log(`    ✓ Detail Image 3: ${detailImage3 ? 'Found' : 'Not found'}`);

    // 텍스트 섹션 가져오기
    const textSections = await page.$$eval('.txtarea', areas => {
      return areas.map(area => {
        const title = area.querySelector('.pitem-info__title--sub');
        const text = area.querySelector('.pitem-info__text');

        return {
          title: title ? title.textContent.trim() : '',
          text: text ? text.textContent.trim() : ''
        };
      }).filter(section => section.title || section.text);
    });

    // 텍스트 섹션 1, 2, 3
    const detailTextTitle1 = textSections[0]?.title || '';
    const detailText1 = textSections[0]?.text || '';
    const detailTextTitle2 = textSections[1]?.title || '';
    const detailText2 = textSections[1]?.text || '';
    const detailTextTitle3 = textSections[2]?.title || '';
    const detailText3 = textSections[2]?.text || '';

    console.log(`    ✓ Detail Text 1: ${detailTextTitle1 || detailText1 ? 'Found' : 'Not found'}`);
    console.log(`    ✓ Detail Text 2: ${detailTextTitle2 || detailText2 ? 'Found' : 'Not found'}`);
    console.log(`    ✓ Detail Text 3: ${detailTextTitle3 || detailText3 ? 'Found' : 'Not found'}`);

    return {
      ...product,
      detailImage1,
      detailImage2,
      detailImage3,
      detailTextTitle1,
      detailText1,
      detailTextTitle2,
      detailText2,
      detailTextTitle3,
      detailText3,
      scrapedAt: new Date().toISOString()
    };

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`    ⚠ Error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      await delay(2000);
      return scrapeProductDetails(page, product, retryCount + 1);
    }

    console.log(`    ✗ Failed after ${MAX_RETRIES} retries: ${error.message}`);
    return {
      ...product,
      detailImage1: '',
      detailImage2: '',
      detailImage3: '',
      detailTextTitle1: '',
      detailText1: '',
      detailTextTitle2: '',
      detailText2: '',
      detailTextTitle3: '',
      detailText3: '',
      error: error.message,
      scrapedAt: new Date().toISOString()
    };
  }
}

async function processCategory(browser, categoryFile) {
  const filePath = path.join(DATA_DIR, categoryFile);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${categoryFile}`);
    return { scraped: 0, errors: 0, total: 0 };
  }

  const products = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`\n📦 Processing: ${categoryFile} (${products.length} products)`);

  const alreadyScraped = products.filter(p => p.detailImage1 || p.detailImage2 || p.detailImage3).length;
  console.log(`   Already scraped: ${alreadyScraped}/${products.length}`);

  const page = await browser.newPage();

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  });

  let scrapedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    if (product.detailImage1 || product.detailImage2 || product.detailImage3) {
      continue;
    }

    const updatedProduct = await scrapeProductDetails(page, product);
    products[i] = updatedProduct;

    if (updatedProduct.error) {
      errorCount++;
    } else {
      scrapedCount++;
      console.log(`    ✓ Success (${scrapedCount} total)`);
    }

    if ((scrapedCount + errorCount) % 10 === 0) {
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf-8');
      console.log(`    💾 Saved progress: ${scrapedCount + errorCount}/${products.length - alreadyScraped}`);
    }

    await delay(1500);
  }

  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf-8');
  await page.close();

  console.log(`✅ ${categoryFile} complete:`);
  console.log(`   Scraped: ${scrapedCount}, Errors: ${errorCount}, Total: ${products.length}`);

  return { scraped: scrapedCount, errors: errorCount, total: products.length };
}

async function main() {
  console.log('🚀 Starting Livart Detail Scraper...\n');
  console.log(`📂 Processing ${CATEGORY_FILES.length} categories\n`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const results = [];

  for (let i = 0; i < CATEGORY_FILES.length; i++) {
    const categoryFile = CATEGORY_FILES[i];
    console.log(`\n[${i + 1}/${CATEGORY_FILES.length}] 📁 ${categoryFile}`);

    const result = await processCategory(browser, categoryFile);
    results.push({ category: categoryFile, ...result });

    if (i < CATEGORY_FILES.length - 1) {
      console.log('\n⏳ Waiting 3000ms before next category...');
      await delay(3000);
    }
  }

  await browser.close();

  console.log('\n\n🎉 All categories completed!\n');
  console.log('📊 Summary:');
  results.forEach(r => {
    console.log(`   ${r.category}: ${r.scraped} scraped, ${r.errors} errors, ${r.total} total`);
  });

  const totalScraped = results.reduce((sum, r) => sum + r.scraped, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const totalProducts = results.reduce((sum, r) => sum + r.total, 0);

  console.log(`\n   TOTAL: ${totalScraped} scraped, ${totalErrors} errors, ${totalProducts} products`);
}

main().catch(console.error);
