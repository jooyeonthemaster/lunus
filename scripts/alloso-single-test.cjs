/*
  Alloso Single Product HTML Test
  - 한 제품만 크롤링해서 HTML 확인
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(process.cwd(), 'data', '알로소');
const FILE = 'alloso-소파.json';

(async () => {
  console.log('🚀 Single Product HTML Test\n');

  const filePath = path.join(DATA_DIR, FILE);
  const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const testProduct = products[0]; // 첫 번째 제품
  console.log('📦 Testing:', testProduct.title);
  console.log('🔗 URL:', testProduct.productUrl);

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1366, height: 768 });

  try {
    await page.goto(testProduct.productUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Scroll
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });

    await page.waitForTimeout(3000);

    // Extract HTML
    const detailData = await page.evaluate(() => {
      const detailCont = document.querySelector('.detail_cont');
      if (!detailCont) return null;

      const clone = detailCont.cloneNode(true);
      
      // ❌ Remove unwanted sections
      const removeSelectors = [
        '.detail_specify',           // SPECIFICATION
        '.detail_same',              // SAME COLLECTION
        '.detail_notice',            // 상품 고시 정보
        '.detail_thumb_wrap',        // 상품 이미지 슬라이드
        '.detail_sns',               // SNS 공유
        '.delivery',                 // 배송안내
        '.pop_wrap',                 // 팝업
        'ul.detail_notice_list',     // 고시 정보 리스트
        '.slick-dots',               // Slick dots
        '.slick-arrow',              // Slick arrows
        '.btn_share',                // 공유 버튼
        '.btn_like',                 // 좋아요 버튼
        'button[type="button"]',     // 모든 버튼
        '.tab_prd_info',             // 탭 정보
        '.prd_info_wrap',            // 상품 정보 랩
        'strong.txt2_eng'            // 상단 breadcrumb
      ];

      removeSelectors.forEach(selector => {
        const elements = clone.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });

      // ❌ Remove slick-track wrapper, keep only content
      const slickTracks = clone.querySelectorAll('.slick-track');
      slickTracks.forEach(track => {
        const slides = Array.from(track.querySelectorAll('.slick-slide'));
        const parent = track.parentElement;
        if (parent) {
          slides.forEach(slide => {
            const content = slide.innerHTML;
            const div = document.createElement('div');
            div.innerHTML = content;
            parent.insertBefore(div, track);
          });
          track.remove();
        }
      });

      // ❌ Remove everything after "OUR BELIEF." section
      const allColWraps = Array.from(clone.querySelectorAll('.col_wrap'));
      let foundBelief = false;
      allColWraps.forEach(colWrap => {
        // Check if this section contains "OUR BELIEF"
        const text = colWrap.textContent || '';
        if (text.includes('OUR') && text.includes('BELIEF')) {
          foundBelief = true;
        }
        
        // Remove this and all subsequent sections
        if (foundBelief) {
          colWrap.remove();
        }
      });

      // Get all images
      const imgs = [];
      clone.querySelectorAll('img').forEach(img => {
        const src = img.src;
        if (src && src.includes('cdn.alloso.co.kr/AllosoUpload/contents/')) {
          imgs.push(src);
        }
      });

      return {
        html: clone.innerHTML,
        images: imgs
      };
    });

    if (detailData) {
      console.log('\n✅ HTML Length:', detailData.html.length);
      console.log('✅ Images:', detailData.images.length);
      
      // Update product
      products[0] = {
        ...testProduct,
        detailHTML: detailData.html,
        detailImages: detailData.images,
        scrapedDetailAt: new Date().toISOString()
      };

      // Save
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');
      console.log('💾 Saved to:', filePath);
      
      // Also save test result
      fs.writeFileSync(
        'alloso-html-test.json',
        JSON.stringify(products[0], null, 2),
        'utf8'
      );
      console.log('💾 Test result saved to: alloso-html-test.json');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await browser.close();
  console.log('\n✅ Done!');
})();

