/*
  Iloom Detail Page HTML Scraper (v2)
  - 기존 iloom-detail-scraper.cjs 기반
  - .box 요소들의 HTML과 CSS를 그대로 가져옵니다
  - div.box의 outerHTML을 모두 추출
*/

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(process.cwd(), 'data', '일룸');
const CATEGORY_FILES = [
  'iloom-거실.json',
  'iloom-서재.json',
  'iloom-옷장.json',
  'iloom-조명.json',
  'iloom-주방.json',
  'iloom-키즈룸.json',
  'iloom-학생방.json'
];
const DELAY_BETWEEN_PRODUCTS = 1500; // 1.5초
const MAX_RETRIES = 3;

async function scrapeProductDetailHTML(page, productUrl, productTitle) {
  console.log(`  → Scraping HTML: ${productTitle}`);

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000 + Math.random() * 1000);

    // 1. Get gallery images (기존과 동일)
    const galleryImages = await page.$$eval(
      '.bxslider .img_productGalery_S, #detailImgList img',
      (imgs) => {
        return imgs
          .map(img => {
            let src = img.src || img.getAttribute('data-src');
            if (src && src.startsWith('/')) {
              src = 'https://www.iloom.com' + src;
            }
            return src;
          })
          .filter(src => src && src.includes('iloom.com'));
      }
    ).catch(() => []);

    const uniqueGalleryImages = [...new Set(galleryImages)];

    // 2. Get detail text sections (기존과 동일)
    const detailSections = await page.$$eval(
      '.box',
      (boxes) => {
        return boxes
          .map(box => {
            const titleEl = box.querySelector('.contents_title h3');
            const contentEl = box.querySelector('.contents_100contents');
            if (!titleEl && !contentEl) return null;
            const title = titleEl ? titleEl.textContent.trim() : '';
            const content = contentEl ? contentEl.textContent.trim() : '';
            if (!title && !content) return null;
            const cleanContent = content.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
            return { title: title, description: cleanContent };
          })
          .filter(section => section !== null);
      }
    ).catch(() => []);

    // 3. ⭐ NEW: Get raw HTML from .box elements
    const detailHTML = await page.evaluate(() => {
      // ⭐ 수정: .prd_cont가 없으니 #section_detailInfo 또는 #contents 내부의 .box만 선택
      let boxes = document.querySelectorAll('#section_detailInfo .box');
      
      if (boxes.length === 0) {
        // fallback: #contents 영역
        boxes = document.querySelectorAll('#contents .box');
      }
      
      if (boxes.length === 0) {
        // fallback: .detailContents 영역
        boxes = document.querySelectorAll('.detailContents .box');
      }
      
      if (boxes.length === 0) {
        // 최후: 전체 .box 선택 (다른 영역 제외)
        const allBoxes = document.querySelectorAll('.box');
        // 갤러리, 리뷰 영역 제외하고 실제 상세 내용만
        boxes = Array.from(allBoxes).filter(box => {
          const html = box.outerHTML;
          return html.includes('contents_100img') || 
                 html.includes('contents_title') || 
                 html.includes('contents_100contents') ||
                 html.includes('contents_50img');
        });
      }
      
      if (boxes.length === 0) {
        return { html: '', count: 0, method: 'none' };
      }
      
      let htmlContent = '';
      boxes.forEach((box) => {
        htmlContent += box.outerHTML + '\n';
      });
      
      return {
        html: htmlContent,
        count: boxes.length,
        method: boxes.length > 0 ? 'success' : 'none'
      };
    }).catch(() => ({ html: '', count: 0, method: 'error' }));

    console.log(`    ✓ Gallery images: ${uniqueGalleryImages.length}`);
    console.log(`    ✓ Detail sections: ${detailSections.length}`);
    console.log(`    ✓ HTML sections: ${detailHTML.count}`);

    // ⭐ 상대 경로를 절대 경로로 자동 변환 + jQuery 코드 제거
    let processedHTML = detailHTML.html;
    if (processedHTML) {
      processedHTML = processedHTML
        .replace(/src="\/upload\//g, 'src="https://www.iloom.com/upload/')
        .replace(/href="\/upload\//g, 'href="https://www.iloom.com/upload/')
        .replace(/src='\/upload\//g, "src='https://www.iloom.com/upload/")
        .replace(/href='\/upload\//g, "href='https://www.iloom.com/upload/")
        // jQuery 코드 제거 ($ is not defined 에러 방지)
        .replace(/onload="\$\(this\)\.css\('display',\s*'(block|inline)'\);"/g, 'style="display: $1;"')
        .replace(/onload='\$\(this\)\.css\("display",\s*"(block|inline)"\);'/g, "style='display: $1;'");
    }

    return {
      galleryImages: uniqueGalleryImages,
      detailSections: detailSections,
      detailHTML: processedHTML,  // ⭐ 절대 경로로 변환된 HTML
      detailHTMLCount: detailHTML.count,
      scrapedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`    ✗ Failed to scrape: ${error.message}`);
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

  // Check how many already have HTML data
  const withHTML = products.filter(p => p.detailHTML && p.detailHTML.length > 0).length;
  console.log(`   Already scraped (with HTML): ${withHTML}/${products.length}`);

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1366, height: 768 });

  // Anti-detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US'] });
  });

  let scrapedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // Skip if already has HTML data
    if (product.detailHTML && product.detailHTML.length > 100) {
      console.log(`  ⏭ Skipping (already has HTML): ${product.title}`);
      continue;
    }

    if (!product.productUrl) {
      console.log(`  ⚠ No URL for: ${product.title}`);
      continue;
    }

    let detailData = null;
    let retries = 0;

    while (!detailData && retries < MAX_RETRIES) {
      detailData = await scrapeProductDetailHTML(page, product.productUrl, product.title);
      if (!detailData) {
        retries++;
        if (retries < MAX_RETRIES) {
          console.log(`    ↻ Retry ${retries}/${MAX_RETRIES}...`);
          await page.waitForTimeout(2000 * retries);
        }
      }
    }

    if (detailData) {
      // Update product with detail data (including HTML)
      products[i] = { ...product, ...detailData };
      scrapedCount++;
      console.log(`    ✓ Success (${scrapedCount} total)`);
    } else {
      errorCount++;
      console.log(`    ✗ Failed after ${MAX_RETRIES} retries`);
    }

    // Auto-save every 5 products (더 자주 저장)
    if ((i + 1) % 5 === 0 || i === products.length - 1) {
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');
      console.log(`    💾 Saved progress: ${i + 1}/${products.length}`);
    }

    // Delay between products
    await page.waitForTimeout(DELAY_BETWEEN_PRODUCTS + Math.random() * 1000);
  }

  await page.close();

  console.log(`✅ ${categoryFile} complete:`);
  console.log(`   Scraped: ${scrapedCount}, Errors: ${errorCount}, Total: ${products.length}`);

  return { scrapedCount, errorCount };
}

(async () => {
  console.log('🚀 Starting Iloom Detail HTML Scraper (v2)...\n');
  console.log(`📂 Processing ${CATEGORY_FILES.length} categories\n`);
  console.log('⭐ This script will extract raw HTML from .box elements\n');

  const browser = await chromium.launch({
    headless: false,  // 디버깅용 브라우저 보기
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let totalScraped = 0;
  let totalErrors = 0;

  for (let i = 0; i < CATEGORY_FILES.length; i++) {
    const categoryFile = CATEGORY_FILES[i];
    console.log(`\n[${i + 1}/${CATEGORY_FILES.length}] 📁 ${categoryFile}`);

    const result = await processCategory(browser, categoryFile);
    totalScraped += result.scrapedCount;
    totalErrors += result.errorCount;

    // 카테고리별 3초 대기
    if (i < CATEGORY_FILES.length - 1) {
      console.log(`\n⏳ Waiting 3 seconds before next category...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  await browser.close();

  console.log('\n🎉 All categories complete!');
  console.log(`📊 Total scraped: ${totalScraped}`);
  console.log(`❌ Total errors: ${totalErrors}`);
})();


