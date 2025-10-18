const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 데이터 디렉토리
const DATA_DIR = path.join(process.cwd(), 'data', '에몬스');
const CATEGORY_FILE = path.join(DATA_DIR, 'emons-소파.json');

// 설정
const DELAY_BETWEEN_PRODUCTS = 1500; // 제품 간 딜레이
const MAX_RETRIES = 3; // 최대 재시도 횟수
const SAVE_INTERVAL = 5; // 5개마다 저장

async function scrapeProductDetail(page, productUrl, productTitle) {
  console.log(`  → Scraping: ${productTitle}`);

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // 페이지 끝까지 스크롤
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

      // 상세 이미지 추출
      const detailData = await page.evaluate(() => {
        const allImages = Array.from(document.querySelectorAll('img'));

        // 에몬스 이미지 필터링
        const emonsImages = allImages
          .map(img => img.src)
          .filter(src => src.includes('emons.co.kr'));

        // 중복 제거
        const uniqueImages = [...new Set(emonsImages)];

        // 상세 설명 이미지만 (/mall/assets/images/prod/ 경로)
        const detailImages = uniqueImages.filter(src => {
          // /mall/assets/images/prod/ 포함
          if (!src.includes('/mall/assets/images/prod/')) return false;

          // 제외할 이미지들
          const excludePatterns = [
            'deliveryinfo',    // 배송 정보
            'emons_bn',        // 에몬스 배너
            'high-quality',    // 공통 배너
            'E0.jpg',          // 공통 인증
            'iso_com'          // 공통 인증
          ];

          return !excludePatterns.some(pattern => src.includes(pattern));
        });

        return {
          detailImages
        };
      });

      return {
        detailImages: detailData.detailImages,
        scrapedDetailAt: new Date().toISOString()
      };

    } catch (error) {
      retries++;
      console.log(`    ⚠️  Retry ${retries}/${MAX_RETRIES}: ${error.message}`);
      if (retries >= MAX_RETRIES) {
        console.log(`    ❌ Failed after ${MAX_RETRIES} retries`);
        return {
          detailImages: [],
          scrapedDetailAt: new Date().toISOString(),
          error: error.message
        };
      }
      await page.waitForTimeout(2000);
    }
  }
}

async function main() {
  console.log('🚀 Starting 에몬스 Batch Detail Scraper...\n');

  // 카테고리 파일 읽기
  if (!fs.existsSync(CATEGORY_FILE)) {
    console.error(`❌ Category file not found: ${CATEGORY_FILE}`);
    return;
  }

  const products = JSON.parse(fs.readFileSync(CATEGORY_FILE, 'utf-8'));
  console.log(`📦 Processing: emons-소파.json (${products.length} products)\n`);

  // 이미 스크랩된 제품 확인
  const alreadyScraped = products.filter(p => p.detailImages && p.detailImages.length > 0).length;
  console.log(`   Already scraped: ${alreadyScraped}/${products.length}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // 이미 스크랩된 제품은 건너뛰기
    if (product.detailImages && product.detailImages.length > 0) {
      console.log(`  ⏭️  Skip: ${product.title} (already scraped)`);
      successCount++;
      continue;
    }

    try {
      const detailData = await scrapeProductDetail(page, product.productUrl, product.title);

      // 제품 데이터 업데이트
      products[i] = {
        ...product,
        ...detailData
      };

      if (detailData.detailImages && detailData.detailImages.length > 0) {
        console.log(`    ✓ Images: ${detailData.detailImages.length}`);
        successCount++;
      } else {
        console.log(`    ⚠️  No detail images found`);
        errorCount++;
      }

      console.log(`    ✓ Success (${successCount} total)\n`);

      // N개마다 저장
      if ((i + 1) % SAVE_INTERVAL === 0) {
        fs.writeFileSync(CATEGORY_FILE, JSON.stringify(products, null, 2), 'utf-8');
        console.log(`    💾 Saved progress: ${i + 1}/${products.length}\n`);
      }

      // 딜레이
      await page.waitForTimeout(DELAY_BETWEEN_PRODUCTS);

    } catch (error) {
      console.error(`    ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }

  // 최종 저장
  fs.writeFileSync(CATEGORY_FILE, JSON.stringify(products, null, 2), 'utf-8');
  console.log(`    💾 Saved progress: ${products.length}/${products.length}\n`);

  await browser.close();

  console.log('✅ emons-소파.json complete:');
  console.log(`   Scraped: ${successCount}, Errors: ${errorCount}, Total: ${products.length}\n`);

  console.log('🎉 All categories completed!');
}

main();
