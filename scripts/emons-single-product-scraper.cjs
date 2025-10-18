const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 에몬스 첫 번째 제품 (버블 소파)
const TEST_PRODUCT = {
  title: "버블 4인용 생활발수 이지클린 패브릭 모듈 소파",
  productUrl: "https://mall.emons.co.kr/product/_view.php?grp=PRI2&prodId=206"
};

async function scrapeEmonsProduct() {
  console.log('🚀 Starting 에몬스 Single Product Scraper...\n');
  console.log(`📍 Product: ${TEST_PRODUCT.title}`);
  console.log(`🔗 URL: ${TEST_PRODUCT.productUrl}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 페이지 이동
    await page.goto(TEST_PRODUCT.productUrl, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded\n');

    // 페이지 끝까지 스크롤 (lazy loading)
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
    console.log('✅ Scrolled to load lazy images\n');

    // 상세 HTML 및 이미지 추출
    const detailData = await page.evaluate(() => {
      // 상세 영역 찾기
      const detailSection = document.querySelector('div[class*="detail"]');

      if (!detailSection) {
        return { detailHTML: '', detailImages: [], rawText: '' };
      }

      // 상세 HTML
      const detailHTML = detailSection.innerHTML;

      // 상세 이미지 추출
      const images = Array.from(detailSection.querySelectorAll('img'));
      const detailImages = images
        .map(img => img.src)
        .filter(src => {
          // 에몬스 이미지만 (외부 이미지 제외)
          return src.includes('emons.co.kr');
        });

      // 텍스트 추출
      const rawText = detailSection.innerText || detailSection.textContent || '';

      return {
        detailHTML,
        detailImages,
        rawText: rawText.substring(0, 500) // 처음 500자만
      };
    });

    console.log('📊 Scraping Results:\n');
    console.log(`  ✓ Detail HTML: ${detailData.detailHTML.length.toLocaleString()} chars`);
    console.log(`  ✓ Detail Images: ${detailData.detailImages.length} images`);
    console.log(`  ✓ Text Preview: ${detailData.rawText.substring(0, 100)}...\n`);

    // 이미지 목록 출력
    if (detailData.detailImages.length > 0) {
      console.log('🖼️  Scraped Images:\n');
      detailData.detailImages.forEach((img, idx) => {
        console.log(`  ${idx + 1}. ${img}`);
      });
      console.log('');
    }

    // JSON 파일로 저장
    const result = {
      title: TEST_PRODUCT.title,
      productUrl: TEST_PRODUCT.productUrl,
      detailHTML: detailData.detailHTML,
      detailImages: detailData.detailImages,
      scrapedAt: new Date().toISOString()
    };

    const outputPath = path.join(process.cwd(), 'emons-single-product-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`💾 Saved to: ${outputPath}\n`);

    console.log('✅ Scraping completed successfully!');

  } catch (error) {
    console.error('❌ Error during scraping:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeEmonsProduct();
