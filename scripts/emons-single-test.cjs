const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 에몬스 첫 번째 제품 (버블 소파)
const TEST_PRODUCT_URL = 'https://mall.emons.co.kr/product/_view.php?grp=PRI2&prodId=206';

async function testEmonsStructure() {
  console.log('🚀 Starting 에몬스 Structure Test...\n');
  console.log(`📍 Testing URL: ${TEST_PRODUCT_URL}\n`);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 페이지 이동
    await page.goto(TEST_PRODUCT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded successfully\n');

    // 페이지 끝까지 스크롤 (lazy loading 이미지 로드)
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
    console.log('✅ Scrolled to bottom for lazy-loaded images\n');

    // 전체 HTML 구조 분석
    const pageStructure = await page.evaluate(() => {
      // 상세 이미지 영역 찾기 (여러 선택자 시도)
      const selectors = [
        'div[class*="detail"]',
        'div[class*="content"]',
        'div[class*="description"]',
        '.prod-detail',
        '#prod-detail',
        '.product-detail',
        '#product-detail'
      ];

      let detailSection = null;
      let usedSelector = null;

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.innerHTML.length > 1000) {
          detailSection = element;
          usedSelector = selector;
          break;
        }
      }

      // 모든 이미지 찾기
      const allImages = Array.from(document.querySelectorAll('img')).map((img, index) => {
        return {
          index: index + 1,
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          className: img.className || '',
          parentClass: img.parentElement?.className || ''
        };
      });

      // 상세 영역의 이미지만 필터링
      let detailImages = [];
      if (detailSection) {
        detailImages = Array.from(detailSection.querySelectorAll('img')).map((img, index) => {
          return {
            index: index + 1,
            src: img.src,
            alt: img.alt || '',
            width: img.width,
            height: img.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            isFromGodohostingOrAssets: img.src.includes('emons.co.kr/mall/assets/images/prod') ||
                                        img.src.includes('emons.co.kr/upload_files'),
            isLikelyReviewBanner: img.src.includes('review') || img.alt.includes('리뷰') ||
                                  img.src.includes('event') || img.alt.includes('이벤트'),
            isGif: img.src.endsWith('.gif')
          };
        });
      }

      return {
        detailSelectorUsed: usedSelector,
        detailSectionFound: !!detailSection,
        detailHTMLLength: detailSection ? detailSection.innerHTML.length : 0,
        totalImages: allImages.length,
        detailImages: detailImages,
        allImages: allImages.slice(0, 20) // 처음 20개만
      };
    });

    // 결과 출력
    console.log('📊 Structure Analysis Results:\n');
    console.log(`🎯 Detail Section Selector: ${pageStructure.detailSelectorUsed || 'NOT FOUND'}`);
    console.log(`✅ Detail Section Found: ${pageStructure.detailSectionFound}`);
    console.log(`📝 Detail HTML Length: ${pageStructure.detailHTMLLength.toLocaleString()} chars`);
    console.log(`🖼️  Total Images on Page: ${pageStructure.totalImages}`);
    console.log(`🖼️  Images in Detail Section: ${pageStructure.detailImages.length}\n`);

    // 상세 이미지 분석
    if (pageStructure.detailImages.length > 0) {
      console.log('🖼️  Detail Images Analysis:\n');
      pageStructure.detailImages.forEach((img, idx) => {
        const flags = [];
        if (img.isLikelyReviewBanner) flags.push('⚠️ REVIEW/EVENT');
        if (img.isGif) flags.push('⚠️ GIF');
        if (!img.isFromGodohostingOrAssets) flags.push('⚠️ EXTERNAL');

        const flagStr = flags.length > 0 ? ` ${flags.join(' ')}` : '';

        console.log(`  ${idx + 1}. ${img.src.substring(0, 100)}...${flagStr}`);
        console.log(`     Size: ${img.naturalWidth}x${img.naturalHeight}px`);
      });
      console.log('');
    }

    // 필터링 추천
    console.log('💡 Filtering Recommendations:\n');
    const reviewImages = pageStructure.detailImages.filter(img => img.isLikelyReviewBanner);
    const gifImages = pageStructure.detailImages.filter(img => img.isGif);

    console.log(`   - Skip first ${reviewImages.length > 0 ? '1-2' : '0'} images (review banners)`);
    console.log(`   - Skip ${gifImages.length} GIF images`);
    console.log(`   - Focus on: /mall/assets/images/prod/ and /upload_files/ images`);
    console.log(`   - Expected valid images: ${pageStructure.detailImages.length - reviewImages.length - gifImages.length}\n`);

    // 스크린샷 저장
    const screenshotPath = path.join(process.cwd(), 'emons-test-detail.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}\n`);

    // 결과를 JSON으로 저장
    const resultPath = path.join(process.cwd(), 'emons-structure-analysis.json');
    fs.writeFileSync(resultPath, JSON.stringify(pageStructure, null, 2), 'utf-8');
    console.log(`💾 Analysis saved: ${resultPath}\n`);

    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await browser.close();
  }
}

testEmonsStructure();
