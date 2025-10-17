const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://flatpoint.co.kr/product/dob-110/5711/category/318/display/1/';

(async () => {
  console.log('🚀 플랫포인트 PC 상세페이지 스크래핑 시작...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('📍 PC 뷰로 페이지 접속:', TARGET_URL);
    await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('⏳ 페이지 로딩 대기 중...');
    await page.waitForTimeout(3000);

    // 페이지 스크롤하여 모든 lazy loading 이미지 로드
    console.log('📜 스크롤하여 모든 이미지 로드...');
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
            window.scrollTo(0, 0); // 스크롤 맨 위로
            setTimeout(resolve, 1000);
          }
        }, 100);
      });
    });

    console.log('📸 PC HTML + CSS 추출 중...');

    // 상세 설명 HTML 및 CSS 추출
    const detailData = await page.evaluate(() => {
      // #prdDetailContentLazy 영역의 HTML 추출
      const detailContent = document.querySelector('#prdDetailContentLazy');
      if (!detailContent) {
        return { error: '#prdDetailContentLazy 요소를 찾을 수 없습니다' };
      }

      let htmlContent = detailContent.innerHTML;

      // REVIEW 섹션 이후 제거
      const reviewIndex = htmlContent.indexOf('REVIEW');
      if (reviewIndex !== -1) {
        // REVIEW를 포함한 상위 div 찾기 (보통 <div class="row pa-50">)
        const beforeReview = htmlContent.substring(0, reviewIndex);
        const lastDivIndex = beforeReview.lastIndexOf('<div class="row');
        if (lastDivIndex !== -1) {
          htmlContent = htmlContent.substring(0, lastDivIndex);
          console.log('✂️ REVIEW 섹션 제거됨');
        }
      }

      // 모든 style 태그 수집
      const styleTags = Array.from(document.querySelectorAll('style'))
        .map(style => style.textContent)
        .join('\n');

      // 외부 CSS 링크 수집
      const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.href);

      // 인라인 스타일 수집
      const elementsWithStyle = Array.from(detailContent.querySelectorAll('[style]'));
      const inlineStyles = elementsWithStyle.map(el => ({
        tag: el.tagName,
        style: el.getAttribute('style')
      }));

      return {
        html: htmlContent,
        css: styleTags,
        cssLinks: cssLinks,
        inlineStyles: inlineStyles
      };
    });

    if (detailData.error) {
      console.error('❌', detailData.error);
      await browser.close();
      return;
    }

    console.log('\n✅ HTML 추출 완료');

    // 제품 정보 추출
    const productInfo = await page.evaluate(() => {
      const productName = document.querySelector('.pdp-tit h2')?.textContent?.trim() ||
                         document.querySelector('h2.title')?.textContent?.trim() ||
                         'DOB 110';

      const price = document.querySelector('.pdp-price strong')?.textContent?.trim() ||
                   document.querySelector('.price')?.textContent?.trim() ||
                   '552,500원';

      const mainImage = document.querySelector('.pdp-gallery img')?.src ||
                       document.querySelector('.product-image img')?.src ||
                       '';

      return { productName, price, mainImage };
    });

    console.log('\n📊 추출 정보:');
    console.log('  - HTML 크기:', (detailData.html.length / 1024).toFixed(2), 'KB');
    console.log('  - CSS 크기:', (detailData.css.length / 1024).toFixed(2), 'KB');
    console.log('  - CSS 링크:', detailData.cssLinks.length, '개');
    console.log('  - 인라인 스타일:', detailData.inlineStyles.length, '개');

    console.log('\n📦 제품 정보:');
    console.log('  - 제품명:', productInfo.productName);
    console.log('  - 가격:', productInfo.price);
    console.log('  - 메인 이미지:', productInfo.mainImage.substring(0, 50) + '...');

    // 스크린샷 저장
    const screenshotPath = path.join(__dirname, '..', 'public', 'screenshots', 'flatpoint-dob110-pc.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log('\n📸 PC 스크린샷 저장 완료');

    // JSON 데이터 생성
    const jsonData = {
      source: 'flatpoint',
      brand: '플랫포인트',
      productUrl: TARGET_URL,
      productCode: 'DOB-110',
      productName: productInfo.productName,
      price: productInfo.price,
      mainImage: productInfo.mainImage,
      viewport: {
        width: 1920,
        height: 1080,
        device: 'Desktop PC'
      },
      detailHTML: detailData.html,
      detailCSS: detailData.css,
      cssLinks: detailData.cssLinks,
      inlineStyles: detailData.inlineStyles,
      scrapedAt: new Date().toISOString()
    };

    // JSON 파일 저장
    const outputPath = path.join(__dirname, '..', 'data', '플랫포인트', 'flatpoint-dob110-pc.json');
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');

    console.log('\n✅ 데이터 저장 완료!');
    console.log('📁 파일 경로:', outputPath);

    console.log('\n📊 스크래핑 결과:');
    console.log('  - 제품명:', productInfo.productName);
    console.log('  - 가격:', productInfo.price);
    console.log('  - 뷰포트: 1920x1080 (Desktop PC)');
    console.log('  - HTML 크기:', (detailData.html.length / 1024).toFixed(2), 'KB');
    console.log('  - CSS 크기:', (detailData.css.length / 1024).toFixed(2), 'KB');
    console.log('  - CSS 링크:', detailData.cssLinks.length, '개');

    console.log('\n💡 브라우저를 10초간 열어둡니다. 확인해보세요...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('\n🎉 PC 스크래핑 완료!');
    console.log('💡 다음 단계: Next.js에서 이 데이터를 렌더링하세요.');
  }
})();
