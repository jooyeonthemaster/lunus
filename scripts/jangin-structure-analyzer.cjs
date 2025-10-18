const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 테스트할 제품 URL (뉴휴스턴 소파)
const TEST_URL = 'https://www.jangin.com/view.php?cate=2&idx=385';

(async () => {
  console.log('🔍 장인가구 상세페이지 구조 분석 시작...\n');
  console.log(`📍 분석 대상: ${TEST_URL}\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  try {
    console.log('⏳ 페이지 로딩 중...');
    await page.goto(TEST_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // 페이지 스크롤하여 모든 이미지 로드
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
            window.scrollTo(0, 0);
            setTimeout(resolve, 1000);
          }
        }, 100);
      });
    });

    console.log('\n📊 페이지 구조 분석 중...\n');

    // HTML 구조 분석
    const analysis = await page.evaluate(() => {
      const result = {
        // 1. 메인 컨테이너
        containers: [],
        
        // 2. 이미지 영역
        imageAreas: [],
        
        // 3. 상세 설명 영역
        detailAreas: [],
        
        // 4. 모든 이미지 수집
        allImages: [],
        
        // 5. 스타일시트
        stylesheets: [],
        
        // 6. 인라인 스타일
        inlineStyles: []
      };

      // 메인 컨테이너 찾기
      const possibleContainers = [
        '#contents',
        '.contents',
        '.product-detail',
        '.goods_info',
        '.view_wrap',
        'main',
        '.main'
      ];

      possibleContainers.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
          result.containers.push({
            selector,
            className: el.className,
            id: el.id,
            innerHTML: el.innerHTML.substring(0, 500) + '...'
          });
        }
      });

      // 이미지 영역 찾기
      const imageContainers = [
        '.editor_content',
        '.goods_info_cont',
        '[id*="detail"]',
        '.detail',
        '.product_detail'
      ];

      imageContainers.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
          const imgs = el.querySelectorAll('img');
          result.imageAreas.push({
            selector,
            className: el.className,
            id: el.id,
            imageCount: imgs.length,
            images: Array.from(imgs).slice(0, 5).map(img => ({
              src: img.src,
              width: img.width,
              height: img.height,
              alt: img.alt
            }))
          });
        }
      });

      // 상세 설명 영역의 모든 이미지 수집
      const detailContent = document.querySelector('.editor_content') || 
                           document.querySelector('.goods_info_cont') ||
                           document.querySelector('[class*="detail"]');
      
      if (detailContent) {
        const imgs = detailContent.querySelectorAll('img');
        result.allImages = Array.from(imgs).map((img, idx) => ({
          index: idx + 1,
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height,
          isEditor: img.src.includes('/data/editor/')
        }));
      }

      // 스타일시트 수집
      const styleSheets = Array.from(document.styleSheets);
      result.stylesheets = styleSheets.map(sheet => {
        try {
          return {
            href: sheet.href,
            rulesCount: sheet.cssRules?.length || 0
          };
        } catch (e) {
          return { href: sheet.href, error: 'Cannot access' };
        }
      });

      // 외부 CSS 링크
      result.cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.href);

      // 인라인 스타일이 있는 요소
      if (detailContent) {
        const styledElements = detailContent.querySelectorAll('[style]');
        result.inlineStyles = Array.from(styledElements).slice(0, 10).map(el => ({
          tag: el.tagName,
          style: el.getAttribute('style')
        }));
      }

      return result;
    });

    // 제품 정보 추출
    const productInfo = await page.evaluate(() => {
      // 제품명
      const title = document.querySelector('h2')?.textContent?.trim() ||
                   document.querySelector('.goods_name')?.textContent?.trim() ||
                   document.title;

      // 가격
      const price = document.querySelector('.price')?.textContent?.trim() ||
                   document.querySelector('[class*="price"]')?.textContent?.trim() ||
                   '';

      // 메인 이미지
      const mainImage = document.querySelector('img.bigimg')?.src ||
                       document.querySelector('.product_img img')?.src ||
                       '';

      return { title, price, mainImage };
    });

    // 결과 출력
    console.log('═══════════════════════════════════════════════════════');
    console.log('📦 제품 정보');
    console.log('═══════════════════════════════════════════════════════');
    console.log('제품명:', productInfo.title);
    console.log('가격:', productInfo.price);
    console.log('메인 이미지:', productInfo.mainImage ? '✅' : '❌');
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('🗂️ 메인 컨테이너');
    console.log('═══════════════════════════════════════════════════════');
    analysis.containers.forEach((container, idx) => {
      console.log(`${idx + 1}. ${container.selector}`);
      console.log(`   Class: ${container.className || 'N/A'}`);
      console.log(`   ID: ${container.id || 'N/A'}`);
    });
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('🖼️ 이미지 영역');
    console.log('═══════════════════════════════════════════════════════');
    analysis.imageAreas.forEach((area, idx) => {
      console.log(`${idx + 1}. ${area.selector}`);
      console.log(`   이미지 개수: ${area.imageCount}개`);
      console.log(`   샘플 이미지:`);
      area.images.forEach((img, i) => {
        console.log(`     ${i + 1}. ${img.src}`);
        console.log(`        크기: ${img.width}x${img.height}`);
      });
    });
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('📸 전체 이미지 목록 (/data/editor/ 경로만)');
    console.log('═══════════════════════════════════════════════════════');
    const editorImages = analysis.allImages.filter(img => img.isEditor);
    console.log(`총 ${editorImages.length}개의 에디터 이미지 발견`);
    editorImages.forEach((img, idx) => {
      console.log(`${idx + 1}. ${img.src}`);
      console.log(`   크기: ${img.width}x${img.height}`);
    });
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎨 CSS 정보');
    console.log('═══════════════════════════════════════════════════════');
    console.log('외부 CSS 링크:', analysis.cssLinks.length, '개');
    analysis.cssLinks.slice(0, 5).forEach((link, idx) => {
      console.log(`  ${idx + 1}. ${link}`);
    });
    console.log('');
    console.log('인라인 스타일:', analysis.inlineStyles.length, '개');
    console.log('');

    // JSON 파일로 저장
    const outputData = {
      url: TEST_URL,
      productInfo,
      analysis,
      analyzedAt: new Date().toISOString()
    };

    const outputPath = path.join(__dirname, '..', 'jangin-structure-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`💾 분석 결과 저장: jangin-structure-analysis.json`);

    // 스크린샷 저장
    const screenshotDir = path.join(__dirname, '..', 'public', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, 'jangin-analysis.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`📸 스크린샷 저장: public/screenshots/jangin-analysis.png`);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ 분석 완료!');
  }
})();

