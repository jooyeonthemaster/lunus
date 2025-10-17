/*
  Flatpoint Single Product Detail Scraper
  - Tests the enhanced scraper on a single product
  - URL: https://flatpoint.co.kr/product/bay-sofa-leather-2250/6995/category/351/display/1/
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
    await page.waitForTimeout(2000);

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

    await page.waitForTimeout(3000);

    // Trigger lazy-loading
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
        styles: [],
        series: [],
        reviews: []
      };

      // 1. Extract main detail content HTML
      const detailSection = document.querySelector('#prdDetail, #prdDetailContent, #prdDetailContentLazy, .pdp-detail, .detail, .prdDetail, .product-detail, .goods_detail');
      if (detailSection) {
        const clone = detailSection.cloneNode(true);
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

      // 3. Extract specifications
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

      // 4. Extract description
      const descSection = document.querySelector('.description, .product-description, .prd-desc');
      if (descSection) {
        result.description = descSection.textContent.trim().replace(/\s+/g, ' ').slice(0, 500);
      } else if (result.rawText) {
        result.description = result.rawText.slice(0, 500);
      }

      // 5. Extract COLOR/STYLE options
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

      // 6. Extract SERIES information
      const seriesCards = document.querySelectorAll('.title-sm + .row .card, [class*="series"] .card');
      seriesCards.forEach(card => {
        const img = card.querySelector('img');
        const textElem = card.querySelector('.font-1818, .font-2222');
        if (img && textElem) {
          const name = textElem.textContent.trim();
          const imgSrc = img.src || img.getAttribute('data-src') || '';
          if (imgSrc.includes('series_') || name.match(/\d{4}/)) {
            result.series.push({
              name: name,
              imageUrl: imgSrc
            });
          }
        }
      });

      // 7. Extract REVIEW images
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

    const baseUrl = new URL(productUrl).origin;
    detailData.detailHTML = detailData.detailHTML
      .replace(/ec-data-src="([^"]*)"/g, 'src="$1"')
      .replace(/<img([^>]*)\bdata-src="([^"]*)"/g, '<img$1src="$2"')
      .replace(/src="\/([^"]*)"/g, `src="${baseUrl}/$1"`)
      .replace(/src="data:image[^"]*"/g, '');

    console.log(`\n✅ Extraction Complete:`);
    console.log(`   - HTML: ${detailData.detailHTML.length} chars`);
    console.log(`   - Images: ${detailData.detailImages.length}`);
    console.log(`   - Specs: ${Object.keys(detailData.specifications).length} fields`);
    console.log(`   - Description: ${detailData.description.length} chars`);
    console.log(`   - 🎨 Styles/Colors: ${detailData.styles.length}`);
    console.log(`   - 📦 Series: ${detailData.series.length}`);
    console.log(`   - ⭐ Reviews: ${detailData.reviews.length}`);

    return detailData;

  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    return null;
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'ko-KR',
      viewport: { width: 1366, height: 768 },
      timezoneId: 'Asia/Seoul',
      extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
    });

    await context.addInitScript(() => {
      try {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
        window.chrome = { runtime: {} };
      } catch {}
    });

    const page = await context.newPage();

    console.log('\n' + '='.repeat(80));
    console.log('🎯 FLATPOINT Single Product Test Scraper');
    console.log('='.repeat(80));
    console.log('📦 Product: BAY SOFA (leather) 2250');
    console.log('🔗 URL: https://flatpoint.co.kr/product/bay-sofa-leather-2250/6995/category/351/display/1/');
    console.log('='.repeat(80) + '\n');

    const productUrl = 'https://flatpoint.co.kr/product/bay-sofa-leather-2250/6995/category/351/display/1/';
    const detailData = await scrapeDetailPage(page, productUrl);

    if (detailData) {
      // Create result object
      const result = {
        title: "BAY SOFA (leather) 2250",
        price: 4054500,
        productUrl: productUrl,
        imageUrl: "https://flatpoint.co.kr/web/product/medium/202504/f87787bafacad503b17990fe51875273.png",
        ...detailData
      };

      // Save to file
      const outputPath = path.join(process.cwd(), 'flatpoint-single-test-result.json');
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

      console.log(`\n💾 Saved to: ${outputPath}`);
      console.log('\n📊 Summary:');
      console.log(`   Total data size: ${JSON.stringify(result).length} bytes`);

      console.log('\n🎨 Styles/Colors:');
      result.styles.forEach((style, i) => {
        console.log(`   ${i+1}. ${style.nameEn} (${style.nameKr})`);
      });

      console.log('\n📦 Series:');
      result.series.forEach((s, i) => {
        console.log(`   ${i+1}. ${s.name}`);
      });

      console.log('\n⭐ Review Images:');
      console.log(`   Total: ${result.reviews.length} images`);
    }

    await page.close();
    await context.close();

  } catch (err) {
    console.error('\n❌ Fatal error:', err);
  } finally {
    await browser.close();
  }
})();
