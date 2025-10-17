/*
  Flatpoint Detail Page Scraper
  - Extracts full detail HTML, images, and specifications from product detail pages
  - Enhances existing JSON with rich detail data
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function absoluteUrl(u, base) {
  try { return new URL(u, base).toString(); }
  catch { return null; }
}

async function scrapeDetailPage(page, productUrl) {
  console.log(`\n📄 Scraping: ${productUrl}`);

  try {
    // Navigate to detail page
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000); // Wait for dynamic content

    // Scroll to load lazy-loaded images
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

    // Wait for images to load
    await page.waitForTimeout(3000);

    // Trigger lazy-loading by replacing ec-data-src with src
    await page.evaluate(() => {
      const lazyImages = document.querySelectorAll('img[ec-data-src]');
      lazyImages.forEach(img => {
        const lazySrc = img.getAttribute('ec-data-src');
        if (lazySrc) {
          img.setAttribute('src', lazySrc);
        }
      });
    });

    await page.waitForTimeout(1000);

    // Extract detail data
    const detailData = await page.evaluate(() => {
      const result = {
        detailHTML: '',
        detailImages: [],
        specifications: {},
        description: '',
        rawText: '',
        styles: [],           // 🆕 스타일/컬러 옵션
        series: [],           // 🆕 시리즈 정보
        reviews: []           // 🆕 리뷰 이미지
      };

      // 1. Extract main detail content HTML (with replaced image URLs)
      const detailSection = document.querySelector('#prdDetail, #prdDetailContent, #prdDetailContentLazy, .pdp-detail, .detail, .prdDetail, .product-detail, .goods_detail');
      if (detailSection) {
        // Clone to avoid modifying the page
        const clone = detailSection.cloneNode(true);

        // Replace all ec-data-src with actual URLs
        const imgs = clone.querySelectorAll('img[ec-data-src]');
        imgs.forEach(img => {
          const lazySrc = img.getAttribute('ec-data-src');
          if (lazySrc) {
            img.setAttribute('src', lazySrc);
            img.removeAttribute('ec-data-src');
          }
        });

        result.detailHTML = clone.innerHTML.trim();
        result.rawText = detailSection.textContent.trim().replace(/\s+/g, ' ');
      }

      // 2. Extract all detail images
      const imageSelectors = [
        '.detail img',
        '.prdDetail img',
        '.product-detail img',
        '#prdDetail img',
        '.goods_detail img',
        '.detailArea img'
      ];

      const imageElements = new Set();
      for (const selector of imageSelectors) {
        const imgs = document.querySelectorAll(selector);
        imgs.forEach(img => imageElements.add(img));
      }

      imageElements.forEach(img => {
        const src = img.getAttribute('data-src') ||
                    img.getAttribute('data-original') ||
                    img.getAttribute('ec-data-src') ||
                    img.getAttribute('src') || '';
        if (src && !src.includes('icon') && !src.includes('badge')) {
          result.detailImages.push(src);
        }
      });

      // 3. Extract specifications (if structured)
      const specSection = document.querySelector('.spec, .specification, .product-spec, table.spec');
      if (specSection) {
        const rows = specSection.querySelectorAll('tr, .spec-row, .info-row');
        rows.forEach(row => {
          const label = row.querySelector('th, .label, .spec-label')?.textContent.trim();
          const value = row.querySelector('td, .value, .spec-value')?.textContent.trim();
          if (label && value) {
            result.specifications[label] = value;
          }
        });
      }

      // 4. Extract description text (clean)
      const descSection = document.querySelector('.description, .product-description, .prd-desc');
      if (descSection) {
        result.description = descSection.textContent.trim().replace(/\s+/g, ' ').slice(0, 500);
      } else if (result.rawText) {
        result.description = result.rawText.slice(0, 500);
      }

      // 🆕 5. Extract COLOR/STYLE options
      const colorCards = document.querySelectorAll('.color-card, .color-card-wrap .card, .plr-120 .card');
      colorCards.forEach(card => {
        const img = card.querySelector('img');
        const textElem = card.querySelector('.font-2222, .font-1818');
        if (img && textElem) {
          const text = textElem.textContent.trim();
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

          result.styles.push({
            type: 'color',
            nameEn: lines[0] || '',
            nameKr: lines[1] || '',
            imageUrl: img.src || img.getAttribute('data-src') || ''
          });
        }
      });

      // 🆕 6. Extract SERIES information
      const seriesCards = document.querySelectorAll('.title-sm + .row .card, [class*="series"] .card');
      seriesCards.forEach(card => {
        const img = card.querySelector('img');
        const textElem = card.querySelector('.font-1818, .font-2222');
        if (img && textElem) {
          const name = textElem.textContent.trim();
          const imgSrc = img.src || img.getAttribute('data-src') || '';

          // 시리즈 이미지 URL 패턴 체크
          if (imgSrc.includes('series_') || name.match(/\d{4}/)) {
            result.series.push({
              name: name,
              imageUrl: imgSrc
            });
          }
        }
      });

      // 🆕 7. Extract REVIEW images
      const reviewSlides = document.querySelectorAll('.custom-review .swiper-slide img, .review-area img');
      reviewSlides.forEach(img => {
        const src = img.src || img.getAttribute('data-src') || '';
        if (src && src.includes('review_')) {
          result.reviews.push(src);
        }
      });

      return result;
    });

    // Convert relative URLs to absolute
    detailData.detailImages = [...new Set(detailData.detailImages)].map(url => {
      const abs = absoluteUrl(url, productUrl);
      return abs || url;
    });

    // Post-process HTML: replace all remaining ec-data-src and convert relative URLs
    const baseUrl = new URL(productUrl).origin;
    detailData.detailHTML = detailData.detailHTML
      // Replace ec-data-src with src
      .replace(/ec-data-src="([^"]*)"/g, 'src="$1"')
      // Replace data-src with src
      .replace(/<img([^>]*)\bdata-src="([^"]*)"/g, '<img$1src="$2"')
      // Convert relative image URLs to absolute
      .replace(/src="\/([^"]*)"/g, `src="${baseUrl}/$1"`)
      // Remove lazy-load placeholders (base64 images)
      .replace(/src="data:image[^"]*"/g, '');

    console.log(`  ✓ Extracted:`);
    console.log(`    - HTML length: ${detailData.detailHTML.length} chars`);
    console.log(`    - Images: ${detailData.detailImages.length}`);
    console.log(`    - Specs: ${Object.keys(detailData.specifications).length} fields`);
    console.log(`    - Description: ${detailData.description.length} chars`);
    console.log(`    - 🎨 Styles/Colors: ${detailData.styles.length}`);
    console.log(`    - 📦 Series: ${detailData.series.length}`);
    console.log(`    - ⭐ Reviews: ${detailData.reviews.length}`);

    return detailData;

  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    return {
      detailHTML: '',
      detailImages: [],
      specifications: {},
      description: '',
      rawText: '',
      error: err.message
    };
  }
}

async function processCategory(browser, categoryFile, limit = null) {
  const filePath = path.join(process.cwd(), 'data', '플랫포인트', categoryFile);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📂 Processing: ${categoryFile}`);
  console.log(`${'='.repeat(60)}`);

  const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const toProcess = limit ? products.slice(0, limit) : products;

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1366, height: 768 },
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
  });

  // Stealth mode
  await context.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
      window.chrome = { runtime: {} };
    } catch {}
  });

  const page = await context.newPage();

  for (let i = 0; i < toProcess.length; i++) {
    const product = toProcess[i];

    if (!product.productUrl) {
      console.log(`[${i+1}/${toProcess.length}] ⏭️  Skipping (no URL): ${product.title}`);
      continue;
    }

    // Skip if already processed
    if (product.detailHTML && product.detailHTML.length > 0) {
      console.log(`[${i+1}/${toProcess.length}] ⏭️  Skipping (already processed): ${product.title}`);
      continue;
    }

    console.log(`\n[${i+1}/${toProcess.length}] 🔄 ${product.title}`);

    const detailData = await scrapeDetailPage(page, product.productUrl);

    // Merge detail data into product
    Object.assign(product, detailData);

    // Save progress every 5 products
    if ((i + 1) % 5 === 0) {
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');
      console.log(`\n💾 Progress saved (${i + 1}/${toProcess.length})`);
    }

    // Rate limiting
    await page.waitForTimeout(1500 + Math.random() * 1000);
  }

  // Final save
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');
  console.log(`\n✅ Completed: ${categoryFile}`);
  console.log(`   Processed: ${toProcess.length} products`);

  await page.close();
  await context.close();
}

(async () => {
  const browser = await chromium.launch({
    headless: false, // Set to false to see the browser (true로 변경하면 백그라운드 실행)
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // 🚀 모든 플랫포인트 카테고리 처리
    const categories = [
      'flatpoint-패브릭소파.json',     // ✅ 이미 완료 (78개)
      'flatpoint-가죽소파.json',       // 21개
      'flatpoint-체어.json',           // 43개
      'flatpoint-조명&홈데코.json',    // 38개
      'flatpoint-테이블.json',         // 30개
      'flatpoint-선반.json',           // 19개
      'flatpoint-DOB.json',            // 15개
      'flatpoint-사이드테이블.json',   // 15개
      'flatpoint-키즈.json',           // 7개
      'flatpoint-침대&매트리스.json'   // 4개
    ];

    console.log('\n' + '='.repeat(70));
    console.log('🎯 LUNUS - 플랫포인트 전체 카테고리 상세 데이터 수집');
    console.log('='.repeat(70));
    console.log(`📂 총 카테고리: ${categories.length}개`);
    console.log(`⏱️  예상 소요 시간: 약 4-5시간`);
    console.log(`💾 자동 저장: 5개마다`);
    console.log(`🔄 재시도: 이미 처리된 제품은 자동 스킵`);
    console.log('='.repeat(70) + '\n');

    const startTime = Date.now();
    let totalProcessed = 0;
    let totalSkipped = 0;

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];

      console.log(`\n\n${'🔹'.repeat(35)}`);
      console.log(`📦 카테고리 [${i + 1}/${categories.length}]: ${category}`);
      console.log(`${'🔹'.repeat(35)}`);

      try {
        await processCategory(browser, category, null);
        totalProcessed++;
      } catch (err) {
        console.error(`\n❌ 카테고리 처리 실패: ${category}`);
        console.error(`   에러: ${err.message}`);
        console.log(`   ⏩ 다음 카테고리로 계속 진행...\n`);
        totalSkipped++;
      }

      // 카테고리 간 쉬는 시간 (서버 부하 방지)
      if (i < categories.length - 1) {
        console.log(`\n⏸️  다음 카테고리 전 3초 대기...\n`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // 최종 결과
    const endTime = Date.now();
    const totalMinutes = Math.round((endTime - startTime) / 1000 / 60);

    console.log('\n\n' + '='.repeat(70));
    console.log('🎉 전체 크롤링 완료!');
    console.log('='.repeat(70));
    console.log(`✅ 처리 완료: ${totalProcessed}/${categories.length} 카테고리`);
    console.log(`⏭️  스킵: ${totalSkipped} 카테고리`);
    console.log(`⏱️  총 소요 시간: ${totalMinutes}분`);
    console.log('='.repeat(70));
    console.log('\n💡 다음 단계:');
    console.log('   1. http://localhost:3000/test-screenshot 에서 결과 확인');
    console.log('   2. http://localhost:3000/products-gallery 에서 갤러리 확인');
    console.log('   3. 모든 제품이 루너스 스타일로 표시됩니다!\n');

  } catch (err) {
    console.error('\n❌ Fatal error:', err);
  } finally {
    await browser.close();
  }
})();
