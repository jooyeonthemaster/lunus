/*
  Alloso HTML Detail Page Scraper
  - 플랫포인트처럼 HTML/CSS를 통째로 크롤링
  - detailHTML, detailImages, sameCollection 저장
  - 원본 사이트 레이아웃 그대로 재현
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(process.cwd(), 'data', '알로소');
const DELAY_BETWEEN_PRODUCTS = 2000;
const MAX_RETRIES = 3;

async function scrapeDetailHTML(page, productUrl, productTitle) {
  console.log(`\n📄 Scraping HTML: ${productTitle}`);
  console.log(`   URL: ${productUrl}`);

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Scroll to load all lazy-loaded images
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

    // Extract detail data including HTML
    const detailData = await page.evaluate(() => {
      const result = {
        detailHTML: '',
        detailImages: [],
        sameCollection: [],
        rawText: ''
      };

      // 1. Extract full detail HTML (깔끔하게 정리)
      const detailCont = document.querySelector('.detail_cont');
      if (detailCont) {
        // Clone to modify
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

        // Replace all lazy-load attributes
        const imgs = clone.querySelectorAll('img[data-src]');
        imgs.forEach(img => {
          const dataSrc = img.getAttribute('data-src');
          if (dataSrc) {
            img.setAttribute('src', dataSrc);
            img.removeAttribute('data-src');
          }
        });

        // Get innerHTML
        result.detailHTML = clone.innerHTML.trim();
        result.rawText = detailCont.textContent.trim().replace(/\s+/g, ' ').slice(0, 500);
      }

      // 2. Extract all detail images
      const allDetailDivs = document.querySelectorAll('.detail_cont, .detail_desc');
      const detailImageSet = new Set();
      
      allDetailDivs.forEach(div => {
        // Skip SPECIFICATION and SAME COLLECTION
        const specifySection = document.querySelector('.detail_specify');
        const sameSection = document.querySelector('.detail_same');
        
        if (specifySection && specifySection.contains(div)) return;
        if (sameSection && sameSection.contains(div)) return;

        const imgs = div.querySelectorAll('img');
        imgs.forEach(img => {
          const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
          if (src && src.includes('cdn.alloso.co.kr/AllosoUpload/contents/')) {
            detailImageSet.add(src);
          }
        });
      });

      result.detailImages = Array.from(detailImageSet);

      // 3. Extract SAME COLLECTION items
      const sameCollectionItems = document.querySelectorAll('.detail_same_list .goods_item');
      sameCollectionItems.forEach(item => {
        const link = item.querySelector('.link_goods');
        const thumb = item.querySelector('.goods_thumb img');
        const titleEl = item.querySelector('.tit');
        const descEl = item.querySelector('.desc');
        const priceEl = item.querySelector('.selling_price em');

        if (link && titleEl) {
          const href = link.getAttribute('href');
          result.sameCollection.push({
            title: titleEl.textContent.trim(),
            desc: descEl ? descEl.textContent.trim() : '',
            price: priceEl ? priceEl.textContent.trim() : '',
            image: thumb ? thumb.src : '',
            url: href ? 'https://www.alloso.co.kr' + href : ''
          });
        }
      });

      return result;
    });

    console.log(`   ✓ Detail HTML: ${detailData.detailHTML.length} chars`);
    console.log(`   ✓ Detail Images: ${detailData.detailImages.length}`);
    console.log(`   ✓ Same Collection: ${detailData.sameCollection.length}`);

    return {
      ...detailData,
      scrapedDetailAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`   ✗ Failed: ${error.message}`);
    return null;
  }
}

async function processCategory(browser, categoryFile) {
  const filePath = path.join(DATA_DIR, categoryFile);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠ File not found: ${categoryFile}`);
    return { scrapedCount: 0, errorCount: 0 };
  }

  const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`\n📦 Processing: ${categoryFile} (${products.length} products)`);

  // Check how many already have HTML
  const withHTML = products.filter(p => p.detailHTML && p.detailHTML.length > 1000).length;
  console.log(`   Already scraped: ${withHTML}/${products.length}`);

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'ko-KR',
    viewport: { width: 1366, height: 768 }
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US'] });
  });

  const page = await context.newPage();

  let scrapedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // Skip if already has HTML
    if (product.detailHTML && product.detailHTML.length > 1000) {
      console.log(`  ⏭ Skipping (already scraped): ${product.title}`);
      continue;
    }

    if (!product.productUrl) {
      console.log(`  ⚠ No URL for: ${product.title}`);
      continue;
    }

    let detailData = null;
    let retries = 0;

    while (!detailData && retries < MAX_RETRIES) {
      detailData = await scrapeDetailHTML(page, product.productUrl, product.title);
      if (!detailData) {
        retries++;
        if (retries < MAX_RETRIES) {
          console.log(`    ↻ Retry ${retries}/${MAX_RETRIES}...`);
          await page.waitForTimeout(2000 * retries);
        }
      }
    }

    if (detailData) {
      // Merge with existing data
      products[i] = { 
        ...product, 
        detailHTML: detailData.detailHTML,
        detailImages: detailData.detailImages,
        sameCollection: detailData.sameCollection,
        scrapedDetailAt: detailData.scrapedDetailAt
      };
      scrapedCount++;
      console.log(`    ✓ Success (${scrapedCount} total)`);
    } else {
      errorCount++;
      console.log(`    ✗ Failed after ${MAX_RETRIES} retries`);
    }

    // Auto-save every 3 products
    if ((i + 1) % 3 === 0 || i === products.length - 1) {
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');
      console.log(`    💾 Saved progress: ${i + 1}/${products.length}`);
    }

    // Delay between products
    await page.waitForTimeout(DELAY_BETWEEN_PRODUCTS + Math.random() * 1000);
  }

  await page.close();
  await context.close();

  console.log(`✅ ${categoryFile} complete:`);
  console.log(`   Scraped: ${scrapedCount}, Errors: ${errorCount}, Total: ${products.length}`);

  return { scrapedCount, errorCount };
}

(async () => {
  console.log('🚀 Starting Alloso HTML Scraper...\n');
  console.log('📌 Mode: Full HTML + CSS Scraping (like Flatpoint)\n');

  const files = fs.readdirSync(DATA_DIR).filter(f => 
    f.startsWith('alloso-') && 
    f.endsWith('.json') && 
    f !== 'alloso-소파-scraped.json'
  );

  if (files.length === 0) {
    console.log('❌ No alloso-*.json files found');
    process.exit(1);
  }

  console.log(`📂 Found ${files.length} categories:`);
  files.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let totalScraped = 0;
  let totalErrors = 0;

  for (let i = 0; i < files.length; i++) {
    const result = await processCategory(browser, files[i]);
    if (result) {
      totalScraped += result.scrapedCount;
      totalErrors += result.errorCount;
    }

    if (i < files.length - 1) {
      console.log(`\n⏳ Waiting 3s before next category...\n`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  await browser.close();

  console.log('\n🎉 All categories processed!');
  console.log(`📊 Total scraped: ${totalScraped}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log(`💾 Files updated in: ${DATA_DIR}`);

  console.log('\n💡 Next Steps:');
  console.log('  1. Check data/알로소/ for HTML content');
  console.log('  2. Test detail page with HTML rendering');
  console.log('  3. Add CSS styles if needed');
})();

