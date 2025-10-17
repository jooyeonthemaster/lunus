/*
  Iloom Detail HTML Scraper - Single Product Test
  - 밴쿠버 소파 1개만 테스트
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const TEST_URL = 'https://www.iloom.com/product/detail.do?productCd=HCS888';
const TEST_PRODUCT = '밴쿠버 3.5인 천연가죽 컴팩트 소파';

async function scrapeProductDetailHTML(page) {
  console.log(`\n📍 접속: ${TEST_URL}`);

  try {
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ 페이지 로딩 완료');
    
    await page.waitForTimeout(3000);
    console.log('⏳ 3초 대기 완료\n');

    // 1. Gallery images
    console.log('📸 갤러리 이미지 추출 중...');
    const galleryImages = await page.$$eval(
      '.bxslider .img_productGalery_S, #detailImgList img',
      (imgs) => {
        return imgs
          .map(img => {
            let src = img.src || img.getAttribute('data-src');
            if (src && src.startsWith('/')) {
              src = 'https://www.iloom.com' + src;
            }
            return src;
          })
          .filter(src => src && src.includes('iloom.com'));
      }
    ).catch(() => []);

    const uniqueGalleryImages = [...new Set(galleryImages)];
    console.log(`   ✓ 갤러리 이미지: ${uniqueGalleryImages.length}개\n`);

    // 2. Detail sections (text)
    console.log('📝 텍스트 섹션 추출 중...');
    const detailSections = await page.$$eval(
      '.box',
      (boxes) => {
        return boxes
          .map(box => {
            const titleEl = box.querySelector('.contents_title h3');
            const contentEl = box.querySelector('.contents_100contents');
            if (!titleEl && !contentEl) return null;
            const title = titleEl ? titleEl.textContent.trim() : '';
            const content = contentEl ? contentEl.textContent.trim() : '';
            if (!title && !content) return null;
            return { title, description: content.replace(/\s+/g, ' ').trim() };
          })
          .filter(section => section !== null);
      }
    ).catch(() => []);
    
    console.log(`   ✓ 텍스트 섹션: ${detailSections.length}개\n`);

    // 3. ⭐ HTML 추출
    console.log('🎨 HTML 추출 중...');
    const detailHTML = await page.evaluate(() => {
      // 여러 선택자 시도
      let boxes = document.querySelectorAll('.prd_cont .box');
      
      if (boxes.length === 0) {
        // 다른 선택자 시도
        boxes = document.querySelectorAll('.box');
      }
      
      if (boxes.length === 0) {
        // contents 영역 전체 가져오기
        const contentsArea = document.querySelector('.prd_cont');
        if (contentsArea) {
          return {
            html: contentsArea.innerHTML,
            count: 1,
            method: 'full-contents'
          };
        }
      }
      
      if (boxes.length === 0) {
        return { html: '', count: 0, method: 'none' };
      }
      
      let htmlContent = '';
      boxes.forEach((box, index) => {
        htmlContent += box.outerHTML + '\n\n';
      });
      
      return {
        html: htmlContent,
        count: boxes.length,
        method: 'boxes'
      };
    }).catch((err) => {
      console.log('❌ HTML 추출 실패:', err.message);
      return { html: '', count: 0, method: 'error' };
    });

    console.log(`   ✓ HTML 섹션: ${detailHTML.count}개 (추출 방법: ${detailHTML.method || 'unknown'})`);
    console.log(`   ✓ HTML 크기: ${(detailHTML.html.length / 1024).toFixed(2)} KB\n`);

    return {
      galleryImages: uniqueGalleryImages,
      detailSections: detailSections,
      detailHTML: detailHTML.html,
      detailHTMLCount: detailHTML.count,
      scrapedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ 스크래핑 실패: ${error.message}`);
    return null;
  }
}

(async () => {
  console.log('🚀 일룸 상세페이지 HTML 테스트 시작\n');
  console.log(`🎯 테스트 제품: ${TEST_PRODUCT}\n`);

  const browser = await chromium.launch({
    headless: false,  // 브라우저 보이기
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1366, height: 768 });

  // Anti-detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US'] });
  });

  const result = await scrapeProductDetailHTML(page);

  if (result) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 스크래핑 결과 요약');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ 갤러리 이미지: ${result.galleryImages.length}개`);
    console.log(`✓ 텍스트 섹션: ${result.detailSections.length}개`);
    console.log(`✓ HTML 섹션: ${result.detailHTMLCount}개`);
    console.log(`✓ HTML 크기: ${(result.detailHTML.length / 1024).toFixed(2)} KB`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 저장
    const outputData = {
      source: 'iloom',
      brand: '일룸',
      productUrl: TEST_URL,
      productCode: 'HCS888',
      productName: TEST_PRODUCT,
      ...result
    };

    const outputPath = path.join(__dirname, '../data/일룸/iloom-test-html.json');
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
    
    console.log(`💾 결과 저장 완료: ${outputPath}\n`);

    // HTML 미리보기 (첫 500자)
    console.log('📄 HTML 미리보기 (첫 500자):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(result.detailHTML.substring(0, 500) + '...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🎉 테스트 완료!');
  } else {
    console.log('❌ 스크래핑 실패');
  }

  await browser.close();
})();

