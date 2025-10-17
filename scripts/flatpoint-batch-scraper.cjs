const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 설정
const HEADLESS = true; // true로 설정하면 백그라운드에서 실행
const DELAY_BETWEEN_PRODUCTS = 2000; // 제품 간 대기 시간 (ms)
const MAX_RETRIES = 2; // 실패 시 재시도 횟수
const SCROLL_DELAY = 100; // 스크롤 딜레이 (ms)

// 진행상황 파일 경로
const PROGRESS_FILE = path.join(__dirname, '..', 'flatpoint-scraping-progress.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'flatpoint', 'scraped-products');

// 출력 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 진행상황 로드
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return { completed: [], failed: [], currentIndex: 0 };
}

// 진행상황 저장
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

// 단일 제품 스크래핑
async function scrapeProduct(page, product, index, total) {
  const startTime = Date.now();

  try {
    console.log(`\n[${ index + 1}/${total}] 📍 ${product.title}`);
    console.log(`   URL: ${product.url}`);

    await page.goto(product.url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // 페이지 스크롤하여 lazy loading 이미지 로드
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            setTimeout(resolve, 1000);
          }
        }, 100);
      });
    });

    // HTML + CSS 추출
    const detailData = await page.evaluate(() => {
      const detailContent = document.querySelector('#prdDetailContentLazy');
      if (!detailContent) {
        return { error: '#prdDetailContentLazy 요소를 찾을 수 없습니다' };
      }

      let htmlContent = detailContent.innerHTML;

      // REVIEW 섹션 이후 제거
      const reviewIndex = htmlContent.indexOf('REVIEW');
      if (reviewIndex !== -1) {
        const beforeReview = htmlContent.substring(0, reviewIndex);
        const lastDivIndex = beforeReview.lastIndexOf('<div class="row');
        if (lastDivIndex !== -1) {
          htmlContent = htmlContent.substring(0, lastDivIndex);
        }
      }

      // CSS 수집
      const styleTags = Array.from(document.querySelectorAll('style'))
        .map(style => style.textContent)
        .join('\n');

      const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.href);

      const elementsWithStyle = Array.from(detailContent.querySelectorAll('[style]'));
      const inlineStyles = elementsWithStyle.map(el => ({
        tag: el.tagName,
        style: el.getAttribute('style')
      }));

      return {
        html: htmlContent,
        css: styleTags,
        cssLinks: cssLinks,
        inlineStyles: inlineStyles
      };
    });

    if (detailData.error) {
      throw new Error(detailData.error);
    }

    // 제품 정보 추출
    const productInfo = await page.evaluate(() => {
      const productName = document.querySelector('.pdp-tit h2')?.textContent?.trim() ||
                         document.querySelector('h2.title')?.textContent?.trim() ||
                         '';

      const price = document.querySelector('.pdp-price strong')?.textContent?.trim() ||
                   document.querySelector('.price')?.textContent?.trim() ||
                   '';

      // 메인 이미지 추출 (다양한 셀렉터 시도)
      let mainImage = '';
      const imageSelectors = [
        '.pdp-gallery img',
        '.product-image img',
        '.pdp-img img',
        '.product-detail-image img',
        'img[alt*="제품"], img[alt*="product"]',
        '.swiper-slide img'
      ];

      for (const selector of imageSelectors) {
        const img = document.querySelector(selector);
        if (img && img.src && !img.src.includes('data:image')) {
          mainImage = img.src;
          break;
        }
      }

      return { productName, price, mainImage };
    });

    // JSON 데이터 생성
    const jsonData = {
      source: 'flatpoint',
      brand: '플랫포인트',
      category: product.category,
      productUrl: product.url,
      productCode: product.title,
      productName: productInfo.productName || product.title,
      price: productInfo.price,
      mainImage: productInfo.mainImage,
      viewport: {
        width: 1920,
        height: 1080,
        device: 'Desktop PC'
      },
      detailHTML: detailData.html,
      detailCSS: detailData.css,
      cssLinks: detailData.cssLinks,
      inlineStyles: detailData.inlineStyles,
      scrapedAt: new Date().toISOString()
    };

    // 파일명 생성 (안전한 파일명)
    const safeFilename = product.title
      .replace(/[^a-zA-Z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);

    const outputPath = path.join(OUTPUT_DIR, `${safeFilename}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ 완료 (${elapsed}초)`);
    console.log(`   📊 HTML: ${(detailData.html.length / 1024).toFixed(2)} KB`);
    console.log(`   💾 저장: ${safeFilename}.json`);

    return { success: true, product, outputPath };

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ❌ 실패 (${elapsed}초): ${error.message}`);
    return { success: false, product, error: error.message };
  }
}

// 메인 실행
(async () => {
  console.log('🚀 플랫포인트 배치 스크래핑 시작...\n');

  // URL 목록 로드
  const urlsPath = path.join(__dirname, '..', 'flatpoint-all-urls.json');
  if (!fs.existsSync(urlsPath)) {
    console.error('❌ flatpoint-all-urls.json 파일이 없습니다.');
    console.log('먼저 실행: node scripts/extract-flatpoint-urls.cjs');
    process.exit(1);
  }

  const allProducts = JSON.parse(fs.readFileSync(urlsPath, 'utf8'));

  // 이미 스크래핑된 제품 제외 (dob110-mobile, dob110-pc)
  const productsToScrape = allProducts.filter(p =>
    !p.source.includes('dob110-mobile') &&
    !p.source.includes('dob110-pc')
  );

  console.log(`📦 총 ${productsToScrape.length}개 제품 스크래핑 예정`);
  console.log(`⏱️  예상 소요 시간: ${(productsToScrape.length * 12 / 60).toFixed(0)}분\n`);

  // 진행상황 로드
  const progress = loadProgress();
  const startIndex = progress.currentIndex || 0;

  if (startIndex > 0) {
    console.log(`🔄 이전 진행상황에서 재개: ${startIndex}번째 제품부터\n`);
  }

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const results = {
    total: productsToScrape.length,
    completed: progress.completed || [],
    failed: progress.failed || [],
    startTime: new Date().toISOString()
  };

  // 스크래핑 실행
  for (let i = startIndex; i < productsToScrape.length; i++) {
    const product = productsToScrape[i];
    const result = await scrapeProduct(page, product, i, productsToScrape.length);

    if (result.success) {
      results.completed.push({
        product: product.title,
        url: product.url,
        file: result.outputPath
      });
    } else {
      results.failed.push({
        product: product.title,
        url: product.url,
        error: result.error
      });
    }

    // 진행상황 저장
    progress.currentIndex = i + 1;
    progress.completed = results.completed;
    progress.failed = results.failed;
    saveProgress(progress);

    // 다음 제품 전 대기
    if (i < productsToScrape.length - 1) {
      await page.waitForTimeout(DELAY_BETWEEN_PRODUCTS);
    }

    // 진행률 표시
    const progressPercent = ((i + 1) / productsToScrape.length * 100).toFixed(1);
    console.log(`\n📊 진행률: ${i + 1}/${productsToScrape.length} (${progressPercent}%)`);
  }

  await browser.close();

  // 최종 결과
  results.endTime = new Date().toISOString();

  const reportPath = path.join(__dirname, '..', 'flatpoint-scraping-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');

  console.log('\n\n' + '='.repeat(60));
  console.log('🎉 배치 스크래핑 완료!\n');
  console.log(`✅ 성공: ${results.completed.length}개`);
  console.log(`❌ 실패: ${results.failed.length}개`);
  console.log(`📁 저장 위치: ${OUTPUT_DIR}`);
  console.log(`📋 상세 보고서: ${reportPath}`);
  console.log('='.repeat(60));

  if (results.failed.length > 0) {
    console.log('\n⚠️ 실패한 제품:');
    results.failed.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.product} - ${f.error}`);
    });
  }

  // 진행상황 파일 삭제 (완료 후)
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  console.log('\n💡 다음 단계: 스크래핑된 데이터를 통합하여 사용하세요.');
})();
