const { chromium } = require('playwright');
const path = require('path');

const TEST_URL = 'https://mall.emons.co.kr/product/_view.php?grp=PRI2&prodId=206';

async function takeScreenshot() {
  console.log('📸 Taking screenshot of Emons detail page...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded\n');

    // 천천히 스크롤하면서 대기
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
            setTimeout(resolve, 2000); // 추가 대기
          }
        }, 300);
      });
    });

    console.log('✅ Scrolled and waiting for all content...\n');

    await page.waitForTimeout(3000);

    // 전체 페이지 스크린샷
    const screenshotPath = path.join(process.cwd(), 'emons-detail-full-page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}\n`);

    // 페이지에서 모든 img 태그 분석
    const imageAnalysis = await page.evaluate(() => {
      const allImgs = Array.from(document.querySelectorAll('img'));

      return allImgs.map((img, idx) => ({
        index: idx + 1,
        src: img.src,
        width: img.width,
        height: img.height,
        parent: img.parentElement?.tagName || 'unknown',
        isVisible: img.offsetParent !== null
      }));
    });

    console.log(`📊 Found ${imageAnalysis.length} images on page\n`);
    console.log('Images analysis:');
    imageAnalysis.forEach(img => {
      if (img.src.includes('MALL_PRODUCT')) {
        console.log(`  ${img.index}. ${img.isVisible ? '👁️ ' : '🚫'} ${img.src} (${img.width}x${img.height})`);
      }
    });

    console.log('\n⏳ Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

takeScreenshot();
