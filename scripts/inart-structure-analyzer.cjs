const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function analyzeInartDetailPage() {
  console.log('🔍 인아트 상세페이지 구조 분석 시작...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // 샘플 제품 URL (소파 카테고리 첫 제품)
  const testUrl = 'https://www.inartshop.com/goods/view?no=6117';

  try {
    console.log(`📄 분석 URL: ${testUrl}`);
    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // 상세페이지 구조 분석
    const structure = await page.evaluate(() => {
      const analysis = {
        productTitle: '',
        productPrice: '',
        mainImageSelector: '',
        detailImagesSample: [],
        detailContainerInfo: {},
        allImageCount: 0,
        textContent: [],
        divStructure: []
      };

      // 1. 제품명
      const titleEl = document.querySelector('.goods_name');
      if (titleEl) {
        analysis.productTitle = titleEl.textContent.trim();
      }

      // 2. 가격
      const priceEl = document.querySelector('.price');
      if (priceEl) {
        analysis.productPrice = priceEl.textContent.trim();
      }

      // 3. 메인 이미지
      const mainImg = document.querySelector('.thumb img');
      if (mainImg) {
        analysis.mainImageSelector = '.thumb img';
      }

      // 4. 상세 이미지들 찾기 - 여러 셀렉터 시도
      const possibleSelectors = [
        '.goods_detail img',
        '.detail_cont img',
        '#detail img',
        '[class*="detail"] img',
        '[id*="detail"] img',
        '.txc-image'  // 사용자가 제공한 클래스
      ];

      for (const selector of possibleSelectors) {
        const images = Array.from(document.querySelectorAll(selector));
        if (images.length > 0) {
          analysis.detailContainerInfo[selector] = {
            count: images.length,
            sample: images.slice(0, 3).map(img => ({
              src: img.src,
              alt: img.alt || '',
              className: img.className,
              width: img.width,
              height: img.height
            }))
          };
        }
      }

      // 5. 모든 이미지 카운트
      analysis.allImageCount = document.querySelectorAll('img').length;

      // 6. 상세 컨테이너 구조
      const detailContainers = [
        '.goods_detail',
        '.detail_cont',
        '#detail',
        '[class*="detail"]'
      ];

      detailContainers.forEach(selector => {
        const container = document.querySelector(selector);
        if (container) {
          analysis.divStructure.push({
            selector: selector,
            className: container.className,
            id: container.id,
            childrenCount: container.children.length,
            innerHTML: container.innerHTML.substring(0, 500) // 처음 500자만
          });
        }
      });

      // 7. 텍스트 컨텐츠 샘플
      const textElements = document.querySelectorAll('.goods_detail p, .detail_cont p, #detail p');
      textElements.forEach((el, idx) => {
        if (idx < 5) {
          analysis.textContent.push(el.textContent.trim());
        }
      });

      return analysis;
    });

    // 결과 출력
    console.log('\n📊 === 분석 결과 ===\n');
    console.log('제품명:', structure.productTitle);
    console.log('가격:', structure.productPrice);
    console.log('메인 이미지 셀렉터:', structure.mainImageSelector);
    console.log('\n📸 상세 이미지 컨테이너 정보:');
    console.log(JSON.stringify(structure.detailContainerInfo, null, 2));
    console.log('\n📦 DIV 구조:');
    console.log(JSON.stringify(structure.divStructure, null, 2));
    console.log('\n📝 텍스트 컨텐츠 샘플:');
    console.log(structure.textContent);
    console.log('\n전체 이미지 개수:', structure.allImageCount);

    // 결과를 JSON 파일로 저장
    const resultPath = path.join(process.cwd(), 'inart-structure-analysis.json');
    fs.writeFileSync(resultPath, JSON.stringify(structure, null, 2), 'utf-8');
    console.log(`\n✅ 분석 결과 저장: ${resultPath}`);

    // 스크린샷 저장
    const screenshotPath = path.join(process.cwd(), 'inart-detail-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 스크린샷 저장: ${screenshotPath}`);

  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
  } finally {
    await browser.close();
  }
}

analyzeInartDetailPage();
