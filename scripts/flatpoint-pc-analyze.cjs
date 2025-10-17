const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://flatpoint.co.kr/product/dob-110/5711/category/318/display/1/';

(async () => {
  console.log('🔍 플랫포인트 PC 페이지 구조 분석 시작...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('📍 페이지 접속:', TARGET_URL);
    await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('⏳ 페이지 로딩 대기...');
    await page.waitForTimeout(3000);

    // 페이지 스크롤하여 lazy loading 이미지 로드
    console.log('📜 스크롤하여 이미지 로드...');
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
            resolve();
          }
        }, 100);
      });
    });

    await page.waitForTimeout(2000);

    // 상세 설명 영역 분석
    console.log('\n🔍 상세 설명 영역 구조 분석...\n');

    const analysis = await page.evaluate(() => {
      const results = {
        possibleContainers: [],
        allIds: [],
        allClasses: [],
        detailSections: []
      };

      // 1. 가능한 상세 설명 컨테이너 찾기
      const possibleSelectors = [
        '#prdDetail',
        '#prdDetailContentLazy',
        '.pdp-detail',
        '.product-detail',
        '.detail-content',
        '[id*="detail"]',
        '[class*="detail"]'
      ];

      possibleSelectors.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
          results.possibleContainers.push({
            selector: selector,
            exists: true,
            innerHTML_length: el.innerHTML.length,
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            childrenCount: el.children.length
          });
        }
      });

      // 2. 모든 ID 수집
      const elementsWithId = document.querySelectorAll('[id]');
      elementsWithId.forEach(el => {
        if (el.id.toLowerCase().includes('detail') ||
            el.id.toLowerCase().includes('prd') ||
            el.id.toLowerCase().includes('product') ||
            el.id.toLowerCase().includes('tab')) {
          results.allIds.push({
            id: el.id,
            tagName: el.tagName,
            innerHTML_length: el.innerHTML.length
          });
        }
      });

      // 3. detail 관련 클래스 수집
      const elementsWithClass = document.querySelectorAll('[class*="detail"], [class*="prd"], [class*="product"]');
      const classSet = new Set();
      elementsWithClass.forEach(el => {
        if (el.className) {
          classSet.add(el.className);
        }
      });
      results.allClasses = Array.from(classSet).slice(0, 20);

      // 4. 상세 이미지가 많은 섹션 찾기
      const sections = document.querySelectorAll('div[id], section[id]');
      sections.forEach(section => {
        const images = section.querySelectorAll('img');
        if (images.length > 3) {
          results.detailSections.push({
            id: section.id,
            className: section.className,
            imageCount: images.length,
            innerHTML_length: section.innerHTML.length,
            firstImageSrc: images[0]?.src || 'no src',
            hasLazyLoading: Array.from(images).some(img =>
              img.hasAttribute('data-src') ||
              img.hasAttribute('ec-data-src') ||
              img.loading === 'lazy'
            )
          });
        }
      });

      return results;
    });

    console.log('📊 분석 결과:\n');
    console.log('1️⃣ 발견된 상세 컨테이너:');
    analysis.possibleContainers.forEach(c => {
      console.log(`   - ${c.selector}`);
      console.log(`     태그: ${c.tagName}, ID: ${c.id || 'none'}`);
      console.log(`     클래스: ${c.className || 'none'}`);
      console.log(`     HTML 크기: ${(c.innerHTML_length / 1024).toFixed(2)} KB`);
      console.log(`     자식 요소: ${c.childrenCount}개\n`);
    });

    console.log('\n2️⃣ Detail 관련 ID들:');
    analysis.allIds.slice(0, 10).forEach(item => {
      console.log(`   - #${item.id} (${item.tagName}) - ${(item.innerHTML_length / 1024).toFixed(2)} KB`);
    });

    console.log('\n3️⃣ 이미지가 많은 섹션들:');
    analysis.detailSections.slice(0, 5).forEach(section => {
      console.log(`   - ID: ${section.id || 'no-id'}`);
      console.log(`     이미지: ${section.imageCount}개`);
      console.log(`     크기: ${(section.innerHTML_length / 1024).toFixed(2)} KB`);
      console.log(`     Lazy Loading: ${section.hasLazyLoading ? 'Yes' : 'No'}`);
      console.log(`     첫 이미지: ${section.firstImageSrc.substring(0, 60)}...\n`);
    });

    // 결과 저장
    const outputPath = path.join(__dirname, '..', 'flatpoint-structure-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf8');
    console.log(`\n✅ 분석 결과 저장: ${outputPath}`);

    console.log('\n💡 브라우저를 30초간 열어둡니다. 직접 확인해보세요...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ 분석 완료!');
  }
})();
