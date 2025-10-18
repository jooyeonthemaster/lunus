/*
  Alloso Detail Page Scraper - Test Version
  - 알로소 상세페이지 구조 파악 및 샘플 크롤링
  - 목표: 상세 이미지와 텍스트 섹션 추출
  - SPECIFICATION 섹션은 제외
  - SAME COLLECTION까지 크롤링
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(process.cwd(), 'data', '알로소');
const TEST_FILE = 'alloso-소파.json';

async function scrapeProductDetail(page, productUrl, productTitle) {
  console.log(`\n🔍 Scraping: ${productTitle}`);
  console.log(`   URL: ${productUrl}`);

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForTimeout(2000);

    // Scroll to load all content
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

    // Extract detail data
    const detailData = await page.evaluate(() => {
      const result = {
        detailSections: [],
        detailImages: [],
        allDetailImages: [],
        sameCollection: [],
        debug: {
          hasDetailDesc: false,
          hasDetailCont: false,
          colWrapCount: 0,
          allImagesCount: 0
        }
      };

      // 1. Debug: Check what elements exist
      const detailDesc = document.querySelector('.detail_desc');
      const detailCont = document.querySelector('.detail_cont');
      result.debug.hasDetailDesc = !!detailDesc;
      result.debug.hasDetailCont = !!detailCont;

      // 2. Find all images in detail area (broader search)
      const allDetailDivs = document.querySelectorAll('[class*="detail"]');
      allDetailDivs.forEach(div => {
        const imgs = div.querySelectorAll('img');
        imgs.forEach(img => {
          const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
          if (src && src.includes('cdn.alloso.co.kr/AllosoUpload/contents/')) {
            result.allDetailImages.push(src);
          }
        });
      });

      // 3. Try multiple selectors for content area
      const contentSelectors = [
        '.detail_cont',
        '.detail_desc',
        '.product_detail',
        '#detail'
      ];

      let contentArea = null;
      for (const selector of contentSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          contentArea = elem;
          break;
        }
      }

      if (contentArea) {
        // Find all col_wrap sections
        const allColWraps = Array.from(contentArea.querySelectorAll('.col_wrap'));
        result.debug.colWrapCount = allColWraps.length;
        
        // Get all images before SPECIFICATION section
        const specifySection = document.querySelector('.detail_specify');
        
        allColWraps.forEach(colWrap => {
          // Skip if colWrap is inside SPECIFICATION section
          if (specifySection && specifySection.contains(colWrap)) {
            return;
          }

          // Skip if colWrap is after SPECIFICATION section
          if (specifySection) {
            const position = colWrap.compareDocumentPosition(specifySection);
            // DOCUMENT_POSITION_PRECEDING = 2 means specifySection comes before colWrap
            if (position & Node.DOCUMENT_POSITION_PRECEDING) {
              return; // Skip this colWrap as it's after SPECIFICATION
            }
          }

          // Extract images from this section
          const images = Array.from(colWrap.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src && src.includes('cdn.alloso.co.kr/AllosoUpload/contents/'));
          
          // Extract text from this section
          const textElements = Array.from(colWrap.querySelectorAll('.col_item'));
          const texts = textElements.map(el => {
            // 텍스트만 추출 (이미지 제외)
            const clone = el.cloneNode(true);
            const imgs = clone.querySelectorAll('img');
            imgs.forEach(img => img.remove());
            const text = clone.textContent.trim().replace(/\s+/g, ' ');
            return text;
          }).filter(t => t && t.length > 10);

          if (images.length > 0 || texts.length > 0) {
            result.detailSections.push({
              images: images,
              texts: texts
            });
          }

          // Add all images to detailImages
          result.detailImages.push(...images);
        });
      }

      result.debug.allImagesCount = result.allDetailImages.length;

      // 2. Extract SAME COLLECTION items
      const sameCollectionItems = document.querySelectorAll('.detail_same_list .goods_item');
      sameCollectionItems.forEach(item => {
        const link = item.querySelector('.link_goods');
        const thumb = item.querySelector('.goods_thumb img');
        const titleEl = item.querySelector('.tit');
        const descEl = item.querySelector('.desc');
        const priceEl = item.querySelector('.selling_price em');

        if (link && titleEl) {
          result.sameCollection.push({
            title: titleEl.textContent.trim(),
            desc: descEl ? descEl.textContent.trim() : '',
            price: priceEl ? priceEl.textContent.trim() : '',
            image: thumb ? thumb.src : '',
            url: 'https://www.alloso.co.kr' + link.getAttribute('href')
          });
        }
      });

      // Remove duplicates from detailImages
      result.detailImages = [...new Set(result.detailImages)];

      return result;
    });

    console.log(`\n   🐛 Debug Info:`);
    console.log(`      Has .detail_desc: ${detailData.debug.hasDetailDesc}`);
    console.log(`      Has .detail_cont: ${detailData.debug.hasDetailCont}`);
    console.log(`      Col Wrap Count: ${detailData.debug.colWrapCount}`);
    console.log(`      All Detail Images Found: ${detailData.debug.allImagesCount}`);
    
    console.log(`\n   ✓ Detail Sections: ${detailData.detailSections.length}`);
    console.log(`   ✓ Detail Images: ${detailData.detailImages.length}`);
    console.log(`   ✓ All Detail Images: ${detailData.allDetailImages.length}`);
    console.log(`   ✓ Same Collection: ${detailData.sameCollection.length}`);

    // Debug: Print sections
    detailData.detailSections.forEach((section, i) => {
      console.log(`\n   📄 Section ${i + 1}:`);
      console.log(`      Images: ${section.images.length}`);
      console.log(`      Texts: ${section.texts.length}`);
      if (section.texts.length > 0) {
        console.log(`      First Text: ${section.texts[0].slice(0, 100)}...`);
      }
    });

    // Print first few all detail images
    if (detailData.allDetailImages.length > 0) {
      console.log(`\n   📸 First 3 Detail Images:`);
      detailData.allDetailImages.slice(0, 3).forEach((img, i) => {
        console.log(`      ${i + 1}. ${img.substring(0, 80)}...`);
      });
    }

    return {
      ...detailData,
      scrapedDetailAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`   ✗ Failed: ${error.message}`);
    return null;
  }
}

(async () => {
  console.log('🚀 Starting Alloso Detail Scraper Test...\n');

  const filePath = path.join(DATA_DIR, TEST_FILE);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${TEST_FILE}`);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`📦 Loaded: ${TEST_FILE} (${products.length} products)`);

  // Test with first product
  const testProduct = products[5]; // 보눔 3인 터미널
  console.log(`\n🎯 Testing with: ${testProduct.title}`);

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

  const detailData = await scrapeProductDetail(page, testProduct.productUrl, testProduct.title);

  if (detailData) {
    // Save result to JSON for inspection
    const testResult = {
      ...testProduct,
      ...detailData
    };

    const outputPath = path.join(process.cwd(), 'alloso-test-detail-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(testResult, null, 2), 'utf8');
    console.log(`\n💾 Test result saved: ${outputPath}`);
  }

  await browser.close();

  console.log('\n✅ Test complete!');
})();

