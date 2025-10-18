const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 테스트할 제품 (뉴휴스턴 소파)
const TEST_PRODUCT = {
  title: "뉴휴스턴 소파",
  productUrl: "https://www.jangin.com/view.php?cate=2&idx=385",
  price: 1988000,
  imageUrl: "https://www.jangin.com/data/product/b_file_1756692454zrh85cywa6.png"
};

const OUTPUT_DIR = path.join(__dirname, '..', 'data', '장인가구', 'scraped-products');

// 출력 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

(async () => {
  console.log('🚀 장인가구 단일 제품 테스트 크롤링 시작...\n');
  console.log(`📍 제품: ${TEST_PRODUCT.title}`);
  console.log(`🔗 URL: ${TEST_PRODUCT.productUrl}\n`);

  const browser = await chromium.launch({
    headless: false,  // 크롤링 과정을 볼 수 있도록
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul'
  });

  const page = await context.newPage();

  try {
    console.log('⏳ 페이지 로딩 중...');
    await page.goto(TEST_PRODUCT.productUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // 페이지 스크롤
    console.log('📜 페이지 스크롤 중...');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            setTimeout(resolve, 1000);
          }
        }, 100);
      });
    });

    console.log('📊 데이터 추출 중...');

    // 상세 데이터 추출
    const detailData = await page.evaluate(() => {
      const result = {
        productName: '',
        price: '',
        mainImage: '',
        detailHTML: '',
        detailImages: [],
        cssLinks: [],
        inlineStyles: []
      };

      // 1. 제품 정보
      const titleEl = document.querySelector('h2') || 
                     document.querySelector('.goods_name');
      result.productName = titleEl?.textContent?.trim() || '';

      const priceEl = document.querySelector('.price');
      result.price = priceEl?.textContent?.trim().replace(/\s+/g, ' ') || '';

      const mainImg = document.querySelector('img.bigimg');
      result.mainImage = mainImg?.src || '';

      // 2. 상세 HTML 추출
      const detailSection = document.querySelector('.detail');
      if (detailSection) {
        result.detailHTML = detailSection.innerHTML;
      }

      // 3. 상세 이미지 수집
      if (detailSection) {
        const imgs = detailSection.querySelectorAll('img');
        result.detailImages = Array.from(imgs)
          .map(img => img.src)
          .filter(src => src && src.includes('/data/editor/'));
      }

      // 4. CSS 링크
      result.cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.href);

      // 5. 인라인 스타일
      if (detailSection) {
        const styledElements = detailSection.querySelectorAll('[style]');
        result.inlineStyles = Array.from(styledElements).map(el => ({
          tag: el.tagName,
          style: el.getAttribute('style')
        }));
      }

      return result;
    });

    // JSON 데이터 생성
    const jsonData = {
      source: 'jangin',
      brand: '장인가구',
      category: '거실',
      productUrl: TEST_PRODUCT.productUrl,
      productName: TEST_PRODUCT.title,
      price: TEST_PRODUCT.price,
      mainImage: TEST_PRODUCT.imageUrl,
      viewport: {
        width: 1920,
        height: 1080,
        device: 'Desktop PC'
      },
      detailHTML: detailData.detailHTML,
      detailImages: detailData.detailImages,
      cssLinks: detailData.cssLinks,
      inlineStyles: detailData.inlineStyles,
      scrapedAt: new Date().toISOString()
    };

    // 결과 출력
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📦 추출 결과');
    console.log('═══════════════════════════════════════════════════════');
    console.log('제품명:', jsonData.productName);
    console.log('가격:', typeof jsonData.price === 'number' ? `${jsonData.price.toLocaleString()}원` : jsonData.price);
    console.log('메인 이미지:', jsonData.mainImage ? '✅' : '❌');
    console.log('상세 HTML:', (jsonData.detailHTML.length / 1024).toFixed(2), 'KB');
    console.log('상세 이미지:', jsonData.detailImages.length, '개');
    console.log('CSS 링크:', jsonData.cssLinks.length, '개');
    console.log('인라인 스타일:', jsonData.inlineStyles.length, '개');

    // 상세 이미지 목록 출력
    if (jsonData.detailImages.length > 0) {
      console.log('\n📸 상세 이미지 목록:');
      jsonData.detailImages.forEach((url, idx) => {
        console.log(`  ${idx + 1}. ${url}`);
      });
    }

    // 파일 저장
    const outputPath = path.join(OUTPUT_DIR, `${TEST_PRODUCT.title}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');

    console.log('\n💾 저장 완료:', outputPath);
    console.log('═══════════════════════════════════════════════════════\n');

    // 스크린샷 저장
    const screenshotDir = path.join(__dirname, '..', 'public', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, 'jangin-test-detail.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log('📸 스크린샷 저장:', screenshotPath);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ 테스트 완료!');
  }
})();

