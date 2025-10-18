const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 에몬스 첫 번째 제품 (버블 소파)
const TEST_PRODUCT_URL = 'https://mall.emons.co.kr/product/_view.php?grp=PRI2&prodId=206';

async function scrapeEmonsFullDetail() {
  console.log('🚀 Starting 에몬스 FULL Detail Scraper...\n');
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

    // 전체 페이지에서 모든 이미지 찾기
    const allData = await page.evaluate(() => {
      // 모든 이미지 수집
      const allImages = Array.from(document.querySelectorAll('img'));

      // 에몬스 이미지만 필터링
      const emonsImages = allImages
        .map(img => img.src)
        .filter(src => src.includes('emons.co.kr') && src.includes('MALL_PRODUCT'));

      // 중복 제거
      const uniqueImages = [...new Set(emonsImages)];

      // 페이지 전체 HTML (나중에 분석용)
      const fullHTML = document.body.innerHTML;

      return {
        totalImagesOnPage: allImages.length,
        emonsProductImages: uniqueImages,
        fullHTMLLength: fullHTML.length
      };
    });

    console.log('📊 Full Page Analysis:\n');
    console.log(`  📸 Total images on page: ${allData.totalImagesOnPage}`);
    console.log(`  🖼️  Emons product images: ${allData.emonsProductImages.length}`);
    console.log(`  📝 Full HTML length: ${allData.fullHTMLLength.toLocaleString()} chars\n`);

    // 이미지 목록 출력
    console.log('🖼️  All Product Images:\n');
    allData.emonsProductImages.forEach((img, idx) => {
      console.log(`  ${idx + 1}. ${img}`);
    });
    console.log('');

    // 결과 저장
    const outputPath = path.join(process.cwd(), 'emons-full-detail-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2), 'utf-8');
    console.log(`💾 Saved to: ${outputPath}\n`);

    console.log('✅ Full scraping completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeEmonsFullDetail();
