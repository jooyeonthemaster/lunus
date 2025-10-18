/*
  인아트(inart) 상세페이지 크롤러
  - 기존 inart-*.json 파일에서 제품 URL 읽기
  - 각 상세페이지 방문하여 전체 HTML + 이미지 추출
  - detailHTML, detailImages 필드 추가하여 업데이트

  특징:
  - 인아트는 godohosting.com의 외부 이미지 사용
  - /data/editor/ 경로의 내부 이미지도 혼재
  - 상세 섹션: [class*="detail"] 선택자 사용
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(process.cwd(), 'data', '인아트');
const DELAY_BETWEEN_PRODUCTS = 1500; // 1.5초
const DELAY_BETWEEN_CATEGORIES = 3000; // 3초
const MAX_RETRIES = 3;

function absoluteUrl(u, base) {
  try {
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    return new URL(u, base).toString();
  } catch {
    return null;
  }
}

async function scrapeProductDetail(page, productUrl, productTitle) {
  console.log(`  → Scraping: ${productTitle}`);

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForTimeout(1500);

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

    await page.waitForTimeout(2000);

    // Extract detail data
    const detailData = await page.evaluate(() => {
      const result = {
        detailHTML: '',
        detailImages: [],
        rawText: ''
      };

      // 1. Find detail section - 인아트는 [class*="detail"] 패턴 사용
      const detailSelectors = [
        '[class*="detail"]',
        '.detail_cont',
        '#detail',
        '.goods_detail',
        '.item_detail_contents'
      ];

      let detailSection = null;
      for (const selector of detailSelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.innerHTML.length > 500) {
          detailSection = elem;
          break;
        }
      }

      if (detailSection) {
        // Clone section to modify
        const clone = detailSection.cloneNode(true);

        // Replace all ec-data-src with src
        const imgs = clone.querySelectorAll('img[ec-data-src]');
        imgs.forEach(img => {
          const lazySrc = img.getAttribute('ec-data-src');
          if (lazySrc) {
            img.setAttribute('src', lazySrc);
            img.removeAttribute('ec-data-src');
          }
        });

        // Replace data-src with src
        const dataImgs = clone.querySelectorAll('img[data-src]');
        dataImgs.forEach(img => {
          const dataSrc = img.getAttribute('data-src');
          if (dataSrc) {
            img.setAttribute('src', dataSrc);
            img.removeAttribute('data-src');
          }
        });

        result.detailHTML = clone.innerHTML.trim();
        result.rawText = detailSection.textContent.trim().replace(/\s+/g, ' ').slice(0, 500);

        // 2. Extract all detail images
        const detailImgs = detailSection.querySelectorAll('img');
        detailImgs.forEach(img => {
          const src = img.getAttribute('data-src') ||
                      img.getAttribute('ec-data-src') ||
                      img.getAttribute('src') || '';

          if (src) {
            // Filter out UI elements, icons, badges
            if (src.includes('icon') || src.includes('badge') || src.includes('sns_')) return;
            if (src.includes('Interest_img')) return;
            if (src.includes('noimage')) return;

            // Keep only actual detail images
            // 인아트는 inart.godohosting.com 또는 /data/editor/ 패턴 사용
            if (src.includes('inart.godohosting.com') ||
                src.includes('/data/editor/') ||
                src.includes('/data/goods/')) {
              result.detailImages.push(src);
            }
          }
        });
      }

      return result;
    });

    // Convert relative URLs to absolute
    const baseUrl = new URL(productUrl).origin;
    detailData.detailImages = [...new Set(detailData.detailImages)].map(url => {
      const abs = absoluteUrl(url, baseUrl);
      return abs || url;
    });

    // Post-process HTML: convert relative URLs
    if (detailData.detailHTML) {
      detailData.detailHTML = detailData.detailHTML
        // Replace ec-data-src with src
        .replace(/ec-data-src="([^"]*)"/g, 'src="$1"')
        // Replace data-src with src
        .replace(/<img([^>]*)\bdata-src="([^"]*)"/g, '<img$1src="$2"')
        // Convert relative image URLs to absolute
        .replace(/src="\/([^"]*)" /g, `src="${baseUrl}/$1"`)
        // Remove lazy-load placeholders
        .replace(/src="data:image[^"]*"/g, '');
    }

    console.log(`    ✓ HTML: ${detailData.detailHTML.length} chars`);
    console.log(`    ✓ Images: ${detailData.detailImages.length}`);

    return {
      detailHTML: detailData.detailHTML,
      detailImages: detailData.detailImages,
      rawText: detailData.rawText,
      scrapedDetailAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`    ✗ Failed: ${error.message}`);
    return null;
  }
}

async function processCategory(browser, categoryFile) {
  const filePath = path.join(DATA_DIR, categoryFile);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠ File not found: ${categoryFile}`);
    return;
  }

  const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`\n📦 Processing: ${categoryFile} (${products.length} products)`);

  // Check how many already have detail data
  const withDetails = products.filter(p => p.detailHTML && p.detailHTML.length > 0).length;
  console.log(`   Already scraped: ${withDetails}/${products.length}`);

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'ko-KR',
    viewport: { width: 1366, height: 768 }
  });

  // Anti-detection
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US'] });
  });

  const page = await context.newPage();

  let scrapedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // Skip if already has detail data
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
      detailData = await scrapeProductDetail(page, product.productUrl, product.title);
      if (!detailData) {
        retries++;
        if (retries < MAX_RETRIES) {
          console.log(`    ↻ Retry ${retries}/${MAX_RETRIES}...`);
          await page.waitForTimeout(2000 * retries);
        }
      }
    }

    if (detailData) {
      // Update product with detail data
      products[i] = { ...product, ...detailData };
      scrapedCount++;
      console.log(`    ✓ Success (${scrapedCount} total)`);
    } else {
      errorCount++;
      console.log(`    ✗ Failed after ${MAX_RETRIES} retries`);
    }

    // Auto-save every 5 products
    if ((i + 1) % 5 === 0 || i === products.length - 1) {
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
  console.log('🚀 Starting 인아트 Detail Scraper...\n');

  // Find all inart JSON files
  const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('inart-') && f.endsWith('.json'));

  if (files.length === 0) {
    console.log('❌ No inart-*.json files found in data/인아트/');
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

    // Delay between categories (except last one)
    if (i < files.length - 1) {
      console.log(`\n⏳ Waiting ${DELAY_BETWEEN_CATEGORIES}ms before next category...\n`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CATEGORIES));
    }
  }

  await browser.close();

  console.log('\n🎉 All categories processed!');
  console.log(`📊 Total scraped: ${totalScraped}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log(`💾 Files updated in: ${DATA_DIR}`);

  console.log('\n💡 Next Steps:');
  console.log('  1. Run: node scripts/organize-inart.cjs');
  console.log('  2. Check: data/인아트/ for updated files');
  console.log('  3. Integrate into service with UnifiedProductDetail component');
})();
