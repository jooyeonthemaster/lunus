/*
  Flatpoint Screenshot Detail Scraper
  - Captures full detail page as a long screenshot (excluding reviews)
  - Also extracts key text and images for search/filter
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function absoluteUrl(u, base) {
  try { return new URL(u, base).toString(); }
  catch { return null; }
}

async function autoScroll(page) {
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
}

async function captureDetailPage(page, productUrl, productId) {
  console.log(`\n📸 Capturing screenshot: ${productUrl}`);

  try {
    // Navigate to detail page
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('  ⏳ Page loaded, waiting for content...');
    await page.waitForTimeout(3000);

    // Trigger lazy-loading
    console.log('  📜 Scrolling to load all images...');
    await page.evaluate(() => {
      const lazyImages = document.querySelectorAll('img[ec-data-src]');
      lazyImages.forEach(img => {
        const lazySrc = img.getAttribute('ec-data-src');
        if (lazySrc) {
          img.setAttribute('src', lazySrc);
        }
      });
    });

    await autoScroll(page);
    await page.waitForTimeout(2000);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Find review section to exclude
    console.log('  🔍 Looking for review section...');
    let clipHeight;

    // Try multiple selectors for review section
    const reviewSelectors = [
      '.font-1818.kr:has-text("실제 리뷰")',
      'text=플랫포인트 고객님들의 실제 리뷰',
      '.review',
      '.product-review',
      '.customer-review',
      '#review'
    ];

    let reviewElement = null;
    for (const selector of reviewSelectors) {
      try {
        reviewElement = await page.$(selector);
        if (reviewElement) {
          console.log(`  ✓ Found review section with: ${selector}`);
          break;
        }
      } catch {}
    }

    // Hide review section and everything after it
    if (reviewElement) {
      await page.evaluate(() => {
        // Find all review-related elements
        const reviewElements = document.querySelectorAll('.font-1818.kr, .review, .product-review, .customer-review, #review');

        reviewElements.forEach(el => {
          const text = (el.textContent || '').trim();
          if (text.includes('리뷰') || text.includes('REVIEW') || text.toLowerCase().includes('review')) {
            // Hide this element and all following siblings
            let current = el;
            while (current) {
              current.style.display = 'none';
              current = current.nextElementSibling;
            }

            // Also hide parent section if it contains review
            let parent = el.closest('.section, .pdp-section, .container');
            if (parent) {
              const parentText = parent.textContent || '';
              if (parentText.includes('리뷰')) {
                parent.style.display = 'none';
              }
            }
          }
        });
      });

      await page.waitForTimeout(1000);
      console.log('  ✂️  Hidden review sections');

      // Scroll again to ensure page recalculates height
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      // Get height after hiding
      clipHeight = await page.evaluate(() => document.body.scrollHeight);
      console.log(`  📏 Page height after hiding reviews: ${clipHeight}px`);
    } else {
      clipHeight = await page.evaluate(() => document.body.scrollHeight);
      console.log(`  📏 Full height: ${clipHeight}px (no review section found)`);
    }

    // Capture full page screenshot
    console.log('  📸 Taking full-page screenshot...');
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 85,
      fullPage: true,
      animations: 'disabled'
    });

    // Save screenshot
    const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filename = `flatpoint-${productId}.jpg`;
    const filepath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filepath, screenshot);

    const fileSize = (screenshot.length / 1024).toFixed(1);
    console.log(`  ✓ Saved: ${filename} (${fileSize} KB)`);

    // Extract key text and images for search
    const extractedData = await page.evaluate(() => {
      const result = {
        detailText: '',
        detailImages: [],
        specifications: {}
      };

      // Extract text from detail section (before reviews)
      const detailSection = document.querySelector('.pdp-detail, .detail, .product-detail');
      if (detailSection) {
        // Get all text excluding review section
        const texts = [];
        const walker = document.createTreeWalker(
          detailSection,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent.trim();
          if (text && text.length > 5 && !text.includes('리뷰')) {
            texts.push(text);
          }
        }

        result.detailText = texts.join(' ').replace(/\s+/g, ' ').slice(0, 1000);
      }

      // Extract main product images
      const imgs = document.querySelectorAll('.pdp-detail img, .detail img');
      imgs.forEach(img => {
        const src = img.getAttribute('src') ||
                    img.getAttribute('ec-data-src') ||
                    img.getAttribute('data-src') || '';
        if (src && !src.includes('data:image') && !src.includes('icon') && !src.includes('badge')) {
          result.detailImages.push(src);
        }
      });

      return result;
    });

    // Convert relative URLs to absolute
    extractedData.detailImages = [...new Set(extractedData.detailImages)].map(url => {
      const abs = absoluteUrl(url, productUrl);
      return abs || url;
    });

    console.log(`  ✓ Extracted:`);
    console.log(`    - Text: ${extractedData.detailText.length} chars`);
    console.log(`    - Images: ${extractedData.detailImages.length}`);

    return {
      screenshotPath: `/screenshots/${filename}`,
      screenshotSize: fileSize,
      screenshotHeight: Math.min(clipHeight, 30000),
      ...extractedData
    };

  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    return {
      screenshotPath: null,
      screenshotSize: 0,
      screenshotHeight: 0,
      detailText: '',
      detailImages: [],
      specifications: {},
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
    viewport: { width: 1200, height: 800 },
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
    if (product.screenshotPath) {
      console.log(`[${i+1}/${toProcess.length}] ⏭️  Skipping (already captured): ${product.title}`);
      continue;
    }

    console.log(`\n[${i+1}/${toProcess.length}] 🔄 ${product.title}`);

    // Extract product ID from URL
    const urlMatch = product.productUrl.match(/\/(\d+)\//);
    const productId = urlMatch ? urlMatch[1] : `product-${i}`;

    const screenshotData = await captureDetailPage(page, product.productUrl, productId);

    // Merge screenshot data into product
    Object.assign(product, screenshotData);

    // Save progress every 3 products
    if ((i + 1) % 3 === 0) {
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');
      console.log(`\n💾 Progress saved (${i + 1}/${toProcess.length})`);
    }

    // Rate limiting
    await page.waitForTimeout(2000 + Math.random() * 1000);
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
    headless: false, // Set to false to see the browser
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Process only the first product from the first category file for testing
    const testFile = 'flatpoint-패브릭소파.json';
    const testLimit = 1; // Only process first product

    await processCategory(browser, testFile, testLimit);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Screenshot capture completed!`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (err) {
    console.error('\n❌ Fatal error:', err);
  } finally {
    await browser.close();
  }
})();
