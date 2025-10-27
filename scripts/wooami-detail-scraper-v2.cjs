/*
  우아미(Wooami) 상세페이지 크롤러 V2
  - 기존 products.json 파일에서 제품 URL 읽기
  - 각 상세페이지 방문하여 전체 상세 이미지 추출
  - detailImages 필드에 배열로 저장
  
  특징:
  - 첫 번째 이미지는 광고 이미지 → 제외
  - 두 번째 이미지부터 끝까지 수집
  - gi.esmplus.com/glory3646/wooami/... 패턴 (제품 상세)
  - gi.esmplus.com/glory8804/... 패턴 (공통 안내)
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(process.cwd(), 'data', '우아미');
const DELAY_BETWEEN_PRODUCTS = 1500; // 1.5초
const MAX_RETRIES = 3;

function absoluteUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://wooamimall.com' + url;
  return url;
}

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

    // Extract all images from the page
    const allImages = await page.evaluate(() => {
      const images = [];
      const imgElements = document.querySelectorAll('img');
      
      imgElements.forEach((img, index) => {
        let src = img.src || img.getAttribute('data-src') || img.getAttribute('ec-data-src') || '';
        
        // 상대 경로 처리
        if (src.startsWith('/')) {
          src = 'https://wooamimall.com' + src;
        }
        if (src.startsWith('//')) {
          src = 'https:' + src;
        }

        images.push({
          index: index,
          src: src,
          width: img.width || 0,
          height: img.height || 0,
          alt: img.alt || ''
        });
      });

      return images;
    });

    // Filter detail images (gi.esmplus.com 패턴만)
    const detailImages = allImages
      .filter(img => {
        if (!img.src) return false;
        
        // 상세 이미지 패턴만 포함
        if (img.src.includes('gi.esmplus.com/glory3646/wooami/') ||
            img.src.includes('gi.esmplus.com/glory8804/')) {
          
          // 작은 이미지 (아이콘) 제외
          if (img.width < 100 || img.height < 100) return false;
          
          // UI 요소 제외
          if (img.src.includes('icon') || 
              img.src.includes('badge') || 
              img.src.includes('logo') ||
              img.src.includes('btn_')) return false;
          
          return true;
        }
        
        return false;
      })
      .map(img => img.src);

    // 중복 제거
    const uniqueDetailImages = [...new Set(detailImages)];

    // 첫 번째 이미지 제외 (광고 이미지)
    const finalDetailImages = uniqueDetailImages.slice(1);

    console.log(`    ✓ Total images found: ${allImages.length}`);
    console.log(`    ✓ Filtered detail images: ${uniqueDetailImages.length}`);
    console.log(`    ✓ Final (excluding first): ${finalDetailImages.length}`);

    // 이미지 미리보기 (처음 3개)
    if (finalDetailImages.length > 0) {
      console.log(`    📸 Sample images:`);
      finalDetailImages.slice(0, 3).forEach((url, i) => {
        const filename = url.split('/').pop();
        console.log(`       ${i + 1}. ${filename}`);
      });
    }

    return {
      detailImages: finalDetailImages,
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
    if (product.detailImages && product.detailImages.length > 0) {
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
  await context.close();

  console.log(`✅ ${categoryFile} complete:`);
  console.log(`   Scraped: ${scrapedCount}, Errors: ${errorCount}, Total: ${products.length}`);

  return { scrapedCount, errorCount };
}

(async () => {
  console.log('🚀 Starting 우아미 Detail Scraper V2...\n');

  // Find all wooami JSON files
  const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('wooami-') && f.endsWith('.json'));

  if (files.length === 0) {
    console.log('❌ No wooami-*.json files found in data/우아미/');
    process.exit(1);
  }

  console.log(`📂 Found ${files.length} categories:`);
  files.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));

  const browser = await chromium.launch({
    headless: false, // 확인용으로 false, 실제 크롤링 시 true로 변경
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
      console.log(`\n⏳ Waiting 3s before next category...\n`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  await browser.close();

  console.log('\n🎉 All categories processed!');
  console.log(`📊 Total scraped: ${totalScraped}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log(`💾 Files updated in: ${DATA_DIR}`);

  console.log('\n💡 Next Steps:');
  console.log('  1. Check updated files in data/우아미/');
  console.log('  2. Verify detailImages arrays');
  console.log('  3. Create wooami-products and wooami-detail pages');
})();





