/**
 * LUNUS - 일룸 상세페이지 HTML 스크래퍼
 * 
 * 일룸 제품 상세페이지의 contents 섹션 HTML을 그대로 추출합니다.
 * div.box 요소들과 그 안의 모든 HTML/CSS를 가져옵니다.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 타겟 URL
const TARGET_URL = 'https://www.iloom.com/product/detail.do?productCd=HCS888';

async function scrapeIloomDetailHTML() {
  console.log('🚀 일룸 상세페이지 HTML 스크래핑 시작...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  try {
    const page = await browser.newPage();
    
    // 페이지 이동
    console.log(`📍 페이지 접속: ${TARGET_URL}`);
    await page.goto(TARGET_URL, { 
      waitUntil: 'domcontentloaded',
      timeout: 90000 
    });
    
    // 페이지 로딩 대기 (이미지 로딩 등)
    console.log('⏳ 페이지 로딩 대기 중...');
    await page.waitForTimeout(5000);
    
    // contents 섹션이 로딩될 때까지 대기
    await page.waitForSelector('.prd_cont', { timeout: 30000 }).catch(() => {
      console.log('⚠️ .prd_cont 요소를 찾을 수 없습니다. 계속 진행합니다...');
    });
    
    console.log('📸 HTML 추출 중...\n');
    
    // contents 영역의 모든 div.box 요소들을 추출
    const detailHTML = await page.evaluate(() => {
      // 모든 div.box 요소들 찾기
      const boxes = document.querySelectorAll('.prd_cont .box');
      
      if (boxes.length === 0) {
        return { html: '', css: '', count: 0 };
      }
      
      // HTML 추출
      let htmlContent = '';
      boxes.forEach((box, index) => {
        htmlContent += box.outerHTML + '\n';
      });
      
      // CSS 추출 (inline styles + style tags)
      const styleTags = Array.from(document.querySelectorAll('style'))
        .map(style => style.textContent)
        .join('\n');
      
      // link 태그의 CSS도 추출 시도
      const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.href);
      
      return {
        html: htmlContent,
        css: styleTags,
        cssLinks: linkTags,
        count: boxes.length
      };
    });
    
    console.log(`✅ HTML 추출 완료: ${detailHTML.count}개 섹션\n`);
    
    // 스크린샷 저장 (디버깅용)
    await page.screenshot({ 
      path: path.join(__dirname, '../public/screenshots/iloom-detail-v4.jpg'),
      fullPage: true 
    });
    console.log('📸 스크린샷 저장 완료\n');
    
    // JSON 파일로 저장
    const outputData = {
      source: 'iloom',
      brand: '일룸',
      productUrl: TARGET_URL,
      productCode: 'HCS888',
      productName: '밴쿠버 3.5인 천연가죽 컴팩트 소파',
      detailHTML: detailHTML.html,
      detailCSS: detailHTML.css,
      cssLinks: detailHTML.cssLinks,
      sectionCount: detailHTML.count,
      scrapedAt: new Date().toISOString()
    };
    
    const outputPath = path.join(__dirname, '../data/일룸/iloom-detail-html.json');
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
    
    console.log('✅ 데이터 저장 완료!');
    console.log(`📁 파일 경로: ${outputPath}\n`);
    
    // 결과 요약
    console.log('📊 스크래핑 결과:');
    console.log(`  - 제품명: ${outputData.productName}`);
    console.log(`  - 섹션 수: ${outputData.sectionCount}개`);
    console.log(`  - HTML 크기: ${(outputData.detailHTML.length / 1024).toFixed(2)} KB`);
    console.log(`  - CSS 크기: ${(outputData.detailCSS.length / 1024).toFixed(2)} KB\n`);
    
    console.log('🎉 스크래핑 완료!');
    
  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await browser.close();
  }
}

// 실행
scrapeIloomDetailHTML();

