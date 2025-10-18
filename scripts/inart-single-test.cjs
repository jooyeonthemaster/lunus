/*
  인아트 상세페이지 구조 테스트 스크립트
  - 샘플 제품 1개로 상세페이지 구조 분석
  - HTML 구조, 이미지 패턴, 데이터 추출 방법 검증
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const TEST_PRODUCT_URL = 'https://www.inartshop.com/goods/view?no=6117'; // 시에나 거실 세트
const OUTPUT_FILE = 'inart-single-test-result.json';

async function analyzeInartDetailPage(page, productUrl) {
  console.log(`\n🔍 Analyzing: ${productUrl}`);

  try {
    // Navigate to detail page
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Scroll to load lazy-loaded images
    console.log('📜 Scrolling to load all images...');
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

    await page.waitForTimeout(3000);

    // Take screenshot of full page
    console.log('📸 Taking screenshot...');
    await page.screenshot({
      path: 'inart-detail-screenshot.png',
      fullPage: true
    });

    // Analyze page structure
    const analysis = await page.evaluate(() => {
      const result = {
        pageTitle: document.title || '',
        productName: '',
        price: '',
        mainImage: '',
        detailImages: [],
        detailHTML: '',
        detailHTMLLength: 0,
        htmlStructure: {
          hasDetailSection: false,
          detailSelectors: [],
          imageContainers: [],
          textSections: []
        },
        allImageSources: [],
        suspectedDetailImages: []
      };

      // 1. Product basic info
      const nameElem = document.querySelector('.item_detail_tit h3, .goods_name, h1.name, .product-name');
      if (nameElem) result.productName = nameElem.textContent.trim();

      const priceElem = document.querySelector('.item_price strong, .price, .selling-price');
      if (priceElem) result.price = priceElem.textContent.trim();

      // 2. Main image
      const mainImg = document.querySelector('.item_photo_view img, .main-image img, .product-main-image img');
      if (mainImg) {
        result.mainImage = mainImg.src || mainImg.getAttribute('data-src') || mainImg.getAttribute('ec-data-src') || '';
      }

      // 3. Find detail section - multiple selectors
      const detailSelectors = [
        '#detail',
        '.detail',
        '.detail_cont',
        '.detail_info',
        '.detail_section',
        '.goods_detail',
        '.prdDetail',
        '#prdDetail',
        '.item_detail_contents',
        '.detail-content',
        '[class*="detail"]',
        '#goods_detail',
        '.editor_content'
      ];

      let detailSection = null;
      let foundSelector = '';

      for (const selector of detailSelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.innerHTML.length > 500) { // Must have substantial content
          detailSection = elem;
          foundSelector = selector;
          result.htmlStructure.hasDetailSection = true;
          result.htmlStructure.detailSelectors.push(foundSelector);
          break;
        }
      }

      // 4. Extract detail HTML if found
      if (detailSection) {
        result.detailHTML = detailSection.innerHTML;
        result.detailHTMLLength = result.detailHTML.length;

        // Find image containers
        const imgContainers = detailSection.querySelectorAll('div[class*="img"], div[class*="image"], p, .txc-textbox');
        result.htmlStructure.imageContainers = Array.from(imgContainers)
          .slice(0, 10)
          .map(el => ({
            tag: el.tagName,
            className: el.className,
            hasImages: el.querySelectorAll('img').length
          }));

        // Extract images from detail section
        const detailImgs = detailSection.querySelectorAll('img');
        detailImgs.forEach(img => {
          const src = img.src || img.getAttribute('data-src') || img.getAttribute('ec-data-src') || '';
          if (src) {
            result.detailImages.push({
              src: src,
              alt: img.alt || '',
              className: img.className || '',
              parent: img.parentElement?.tagName || ''
            });
          }
        });
      }

      // 5. Find ALL images on page (for comparison)
      const allImgs = document.querySelectorAll('img');
      allImgs.forEach(img => {
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('ec-data-src') || '';
        if (src) {
          result.allImageSources.push({
            src: src,
            location: img.closest('#detail, .detail, .goods_detail') ? 'DETAIL_SECTION' : 'OTHER',
            className: img.className || '',
            parent: img.parentElement?.tagName || ''
          });
        }
      });

      // 6. Identify suspected detail images (from inart.godohosting.com)
      result.suspectedDetailImages = result.allImageSources
        .filter(img => img.src.includes('inart.godohosting.com') || img.src.includes('/data/editor/'))
        .map(img => img.src);

      // 7. Analyze text sections
      if (detailSection) {
        const textElements = detailSection.querySelectorAll('p, div.text, span.text');
        result.htmlStructure.textSections = Array.from(textElements)
          .slice(0, 5)
          .map(el => ({
            tag: el.tagName,
            text: el.textContent.trim().slice(0, 100),
            hasImage: el.querySelector('img') !== null
          }));
      }

      return result;
    });

    // Log analysis results
    console.log('\n📊 Analysis Results:');
    console.log(`  Product Name: ${analysis.productName}`);
    console.log(`  Price: ${analysis.price}`);
    console.log(`  Main Image: ${analysis.mainImage ? '✓ Found' : '✗ Not found'}`);
    console.log(`  Detail Section: ${analysis.htmlStructure.hasDetailSection ? '✓ Found' : '✗ Not found'}`);
    console.log(`  Detail Selector: ${analysis.htmlStructure.detailSelectors[0] || 'N/A'}`);
    console.log(`  Detail HTML Length: ${analysis.detailHTMLLength} chars`);
    console.log(`  Detail Images: ${analysis.detailImages.length}`);
    console.log(`  Total Images on Page: ${analysis.allImageSources.length}`);
    console.log(`  Suspected Detail Images: ${analysis.suspectedDetailImages.length}`);

    // Save detailed analysis
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(analysis, null, 2),
      'utf8'
    );

    console.log(`\n✅ Analysis saved to: ${OUTPUT_FILE}`);
    console.log(`📸 Screenshot saved to: inart-detail-screenshot.png`);

    return analysis;

  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    return null;
  }
}

(async () => {
  console.log('🚀 Starting 인아트 Detail Page Structure Analysis...\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'ko-KR',
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();

  await analyzeInartDetailPage(page, TEST_PRODUCT_URL);

  console.log('\n🎯 Next Steps:');
  console.log('  1. Review inart-single-test-result.json for structure');
  console.log('  2. Check inart-detail-screenshot.png for visual layout');
  console.log('  3. Identify correct detail section selector');
  console.log('  4. Build inart-detail-scraper.cjs based on findings');

  await browser.close();
})();
