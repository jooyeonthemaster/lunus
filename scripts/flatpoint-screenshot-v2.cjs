/* Flatpoint Screenshot Scraper V2 - Using element positioning */

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function absoluteUrl(u, base) {
  try { return new URL(u, base).toString(); }
  catch { return null; }
}

async function captureDetailPage(page, productUrl, productId) {
  console.log(`\n📸 Capturing: ${productUrl}`);

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('  ⏳ Loaded');
    await page.waitForTimeout(3000);

    // Trigger lazy-loading
    await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[ec-data-src]');
      imgs.forEach(img => {
        const src = img.getAttribute('ec-data-src');
        if (src) img.setAttribute('src', src);
      });
    });

    // Scroll to load everything
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let scrollHeight = document.body.scrollHeight;
        let scrolled = 0;
        const interval = setInterval(() => {
          window.scrollBy(0, 500);
          scrolled += 500;
          if (scrolled >= scrollHeight) {
            clearInterval(interval);
            resolve();
          }
        }, 200);
      });
    });

    await page.waitForTimeout(2000);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Find review section Y position
    console.log('  🔍 Finding review section...');
    const reviewY = await page.evaluate(() => {
      const selectors = [
        '.font-1818.kr',
        'div:has-text("실제 리뷰")',
        'div:has-text("플랫포인트 고객님들의 실제 리뷰")',
      ];

      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent || '';
            if (text.includes('리뷰') || text.toLowerCase().includes('review')) {
              const rect = el.getBoundingClientRect();
              const scrollY = window.scrollY || window.pageYOffset;
              return rect.top + scrollY;
            }
          }
        } catch {}
      }

      return document.body.scrollHeight; // Return full height if not found
    });

    console.log(`  ✂️  Review section at: ${reviewY}px`);

    // Calculate capture height (review position - some padding)
    const captureHeight = Math.floor(reviewY) - 100;

    // Get viewport width
    const viewportWidth = 1200;

    // Take screenshot by stitching multiple viewport captures
    console.log(`  📸 Capturing ${captureHeight}px tall screenshot...`);

    const viewportHeight = 800;
    const screenshots = [];
    const numCaptures = Math.ceil(captureHeight / viewportHeight);

    for (let i = 0; i < numCaptures; i++) {
      const scrollTop = i * viewportHeight;
      await page.evaluate((y) => window.scrollTo(0, y), scrollTop);
      await page.waitForTimeout(200);

      const remainingHeight = Math.min(viewportHeight, captureHeight - scrollTop);

      const partialScreenshot = await page.screenshot({
        type: 'png',
        clip: {
          x: 0,
          y: 0,
          width: viewportWidth,
          height: remainingHeight
        }
      });

      screenshots.push(partialScreenshot);
      console.log(`  📸 Part ${i + 1}/${numCaptures} captured`);
    }

    // Combine screenshots using sharp
    console.log('  🔧 Combining screenshots...');
    const sharp = require('sharp');

    const combinedImage = sharp({
      create: {
        width: viewportWidth,
        height: captureHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    });

    const composites = screenshots.map((buffer, index) => ({
      input: buffer,
      top: index * viewportHeight,
      left: 0
    }));

    const finalImage = await combinedImage
      .composite(composites)
      .jpeg({ quality: 85 })
      .toBuffer();

    // Save screenshot
    const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filename = `flatpoint-${productId}.jpg`;
    const filepath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filepath, finalImage);

    const fileSize = (finalImage.length / 1024).toFixed(1);
    console.log(`  ✓ Saved: ${filename} (${fileSize} KB, ${captureHeight}px tall)`);

    return {
      screenshotPath: `/screenshots/${filename}`,
      screenshotSize: fileSize,
      screenshotHeight: captureHeight
    };

  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    return {
      screenshotPath: null,
      screenshotSize: 0,
      screenshotHeight: 0,
      error: err.message
    };
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1200, height: 800 },
    timezoneId: 'Asia/Seoul'
  });

  const page = await context.newPage();

  // Test on first product
  const productUrl = 'https://flatpoint.co.kr/product/marge-sofa-cushion/7095/category/134/display/1/';
  const productId = '7095';

  const result = await captureDetailPage(page, productUrl, productId);

  console.log('\n✅ Result:', result);

  await browser.close();
})().catch(console.error);
