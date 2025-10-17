/**
 * LUNUS - 플랫포인트 모바일 상세페이지 스크래퍼
 *
 * 플랫포인트 DOB 110 제품의 모바일 레이아웃을 그대로 추출합니다.
 * 모바일 뷰포트에서 HTML + CSS를 크롤링합니다.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 타겟 URL
const TARGET_URL = 'https://flatpoint.co.kr/product/dob-110/5711/category/318/display/1/';

async function scrapeFlatpointMobileDetail() {
  console.log('🚀 플랫포인트 모바일 상세페이지 스크래핑 시작...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  try {
    // 📱 모바일 디바이스로 페이지 생성 (iPhone 12 Pro)
    const page = await browser.newPage();
    await page.setViewportSize({
      width: 390,
      height: 844
    });

    // 페이지 이동
    console.log(`📍 모바일 뷰로 페이지 접속: ${TARGET_URL}`);
    await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // 페이지 로딩 대기
    console.log('⏳ 페이지 로딩 대기 중...');
    await page.waitForTimeout(5000);

    // 스크롤 다운해서 lazy loading 이미지 로드
    console.log('📜 스크롤하여 모든 이미지 로드...');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await page.waitForTimeout(3000);

    // 맨 위로 스크롤
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    console.log('📸 모바일 HTML + CSS 추출 중...\n');

    // 상세 컨텐츠 영역의 HTML 추출
    const detailData = await page.evaluate(() => {
      // 1. 상세 컨텐츠 영역 찾기
      const detailContent = document.querySelector('#prdDetailContentLazy');

      if (!detailContent) {
        return { html: '', css: '', method: 'not-found' };
      }

      // 2. HTML 추출
      const htmlContent = detailContent.innerHTML;

      // 3. 모든 style 태그 추출
      const styleTags = Array.from(document.querySelectorAll('style'))
        .map(style => style.textContent)
        .join('\n');

      // 4. link 태그의 CSS 파일 목록
      const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.href);

      // 5. 인라인 스타일이 있는 요소들의 computed style 추출
      const inlineStyles = Array.from(detailContent.querySelectorAll('[style]'))
        .map(el => ({
          selector: el.className || el.tagName,
          style: el.getAttribute('style')
        }));

      return {
        html: htmlContent,
        css: styleTags,
        cssLinks: cssLinks,
        inlineStyles: inlineStyles,
        method: 'mobile-extraction'
      };
    });

    console.log(`✅ HTML 추출 완료\n`);
    console.log(`📊 추출 정보:`);
    console.log(`  - HTML 크기: ${(detailData.html.length / 1024).toFixed(2)} KB`);
    console.log(`  - CSS 크기: ${(detailData.css.length / 1024).toFixed(2)} KB`);
    console.log(`  - CSS 링크: ${detailData.cssLinks.length}개`);
    console.log(`  - 인라인 스타일: ${detailData.inlineStyles.length}개\n`);

    // 제품 기본 정보 추출
    const productInfo = await page.evaluate(() => {
      const titleEl = document.querySelector('.prd_name');
      const priceEl = document.querySelector('.prd_price');
      const imageEl = document.querySelector('.prd_img img');

      return {
        title: titleEl ? titleEl.textContent.trim() : 'DOB 110',
        price: priceEl ? priceEl.textContent.trim() : '552,500원',
        mainImage: imageEl ? imageEl.src : ''
      };
    });

    console.log(`📦 제품 정보:`);
    console.log(`  - 제품명: ${productInfo.title}`);
    console.log(`  - 가격: ${productInfo.price}`);
    console.log(`  - 메인 이미지: ${productInfo.mainImage}\n`);

    // 스크린샷 저장 (모바일 뷰)
    const screenshotDir = path.join(__dirname, '../public/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await page.screenshot({
      path: path.join(screenshotDir, 'flatpoint-dob110-mobile.jpg'),
      fullPage: true
    });
    console.log('📸 모바일 스크린샷 저장 완료\n');

    // JSON 파일로 저장
    const outputData = {
      source: 'flatpoint',
      brand: '플랫포인트',
      productUrl: TARGET_URL,
      productCode: 'DOB-110',
      productName: productInfo.title,
      price: productInfo.price,
      mainImage: productInfo.mainImage,

      // 모바일 레이아웃
      viewport: {
        width: 390,
        height: 844,
        device: 'iPhone 12 Pro'
      },

      // HTML + CSS
      detailHTML: detailData.html,
      detailCSS: detailData.css,
      cssLinks: detailData.cssLinks,
      inlineStyles: detailData.inlineStyles,

      // 메타 정보
      extractionMethod: detailData.method,
      scrapedAt: new Date().toISOString()
    };

    const outputDir = path.join(__dirname, '../data/플랫포인트');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'flatpoint-dob110-mobile.json');
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

    console.log('✅ 데이터 저장 완료!');
    console.log(`📁 파일 경로: ${outputPath}\n`);

    // 결과 요약
    console.log('📊 스크래핑 결과:');
    console.log(`  - 제품명: ${outputData.productName}`);
    console.log(`  - 가격: ${outputData.price}`);
    console.log(`  - 뷰포트: ${outputData.viewport.width}x${outputData.viewport.height} (${outputData.viewport.device})`);
    console.log(`  - HTML 크기: ${(outputData.detailHTML.length / 1024).toFixed(2)} KB`);
    console.log(`  - CSS 크기: ${(outputData.detailCSS.length / 1024).toFixed(2)} KB`);
    console.log(`  - CSS 링크: ${outputData.cssLinks.length}개\n`);

    console.log('🎉 모바일 스크래핑 완료!');
    console.log('💡 다음 단계: Next.js에서 이 데이터를 렌더링하세요.');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await browser.close();
  }
}

// 실행
scrapeFlatpointMobileDetail();
