const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_PRODUCT_URL = 'https://mall.emons.co.kr/product/_view.php?grp=PRI2&prodId=206';

async function scrapeEmonsCorrect() {
  console.log('🚀 Starting 에몬스 CORRECT Detail Scraper...\n');
  console.log(`🔗 URL: ${TEST_PRODUCT_URL}\n`);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(TEST_PRODUCT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded\n');

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

    await page.waitForTimeout(3000);
    console.log('✅ Scrolled to load all content\n');

    // 모든 이미지 수집 (에몬스 도메인 모두 포함)
    const allData = await page.evaluate(() => {
      const allImages = Array.from(document.querySelectorAll('img'));

      // 에몬스 이미지 필터링 (두 도메인 모두 포함!)
      const emonsImages = allImages
        .map(img => img.src)
        .filter(src => {
          // emons.co.kr 도메인의 모든 이미지
          return src.includes('emons.co.kr');
        });

      // 중복 제거
      const uniqueImages = [...new Set(emonsImages)];

      // 상세 설명 이미지만 (assets/images/prod 경로)
      const detailImages = uniqueImages.filter(src =>
        src.includes('/mall/assets/images/prod/')
      );

      // 썸네일 이미지 (upload_files 경로)
      const thumbnailImages = uniqueImages.filter(src =>
        src.includes('/upload_files/goods/MALL_PRODUCT/')
      );

      return {
        allEmonsImages: uniqueImages.length,
        detailImages: detailImages,
        thumbnailImages: thumbnailImages
      };
    });

    console.log('📊 Correct Analysis:\n');
    console.log(`  📸 Total Emons images: ${allData.allEmonsImages}`);
    console.log(`  🖼️  Detail images (/mall/assets/images/prod/): ${allData.detailImages.length}`);
    console.log(`  🖼️  Thumbnail images (/upload_files/): ${allData.thumbnailImages.length}\n`);

    // 상세 이미지 목록 출력
    if (allData.detailImages.length > 0) {
      console.log('🖼️  Detail Images (assets/images/prod):\n');
      allData.detailImages.forEach((img, idx) => {
        console.log(`  ${idx + 1}. ${img}`);
      });
      console.log('');
    }

    // 썸네일 이미지 목록 출력
    if (allData.thumbnailImages.length > 0) {
      console.log('🖼️  Thumbnail Images (upload_files):\n');
      allData.thumbnailImages.forEach((img, idx) => {
        console.log(`  ${idx + 1}. ${img}`);
      });
      console.log('');
    }

    // 결과 저장
    const result = {
      title: "버블 4인용 생활발수 이지클린 패브릭 모듈 소파",
      productUrl: TEST_PRODUCT_URL,
      thumbnailImages: allData.thumbnailImages,
      detailImages: allData.detailImages,
      scrapedAt: new Date().toISOString()
    };

    const outputPath = path.join(process.cwd(), 'emons-correct-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`💾 Saved to: ${outputPath}\n`);

    console.log('✅ Correct scraping completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeEmonsCorrect();
