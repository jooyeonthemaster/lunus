const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 설정
const HEADLESS = true;
const DELAY_BETWEEN_PRODUCTS = 2000; // 제품 간 대기 시간 (ms)
const MAX_RETRIES = 2;

// 출력 디렉토리
const OUTPUT_DIR = path.join(__dirname, '..', 'data', '장인가구', 'scraped-products');
const PROGRESS_FILE = path.join(__dirname, '..', 'jangin-scraping-progress.json');

// 출력 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 진행상황 로드/저장
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return { completed: [], failed: [], currentIndex: 0 };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

// 단일 제품 스크래핑
async function scrapeProduct(page, product, index, total) {
  const startTime = Date.now();

  try {
    console.log(`\n[${index + 1}/${total}] 📍 ${product.title}`);
    console.log(`   URL: ${product.productUrl}`);

    await page.goto(product.productUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // 페이지 스크롤하여 모든 이미지 로드
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

    // 상세 데이터 추출
    const detailData = await page.evaluate(() => {
      const result = {
        // 제품 정보
        productName: '',
        price: '',
        mainImage: '',
        
        // 상세 HTML
        detailHTML: '',
        
        // 이미지 목록
        detailImages: [],
        
        // CSS
        cssLinks: [],
        inlineStyles: []
      };

      // 1. 제품 정보
      const titleEl = document.querySelector('h2') || 
                     document.querySelector('.goods_name') ||
                     document.querySelector('[class*="title"]');
      result.productName = titleEl?.textContent?.trim() || '';

      const priceEl = document.querySelector('.price') ||
                     document.querySelector('[class*="price"]');
      result.price = priceEl?.textContent?.trim().replace(/\s+/g, ' ') || '';

      const mainImg = document.querySelector('img.bigimg');
      result.mainImage = mainImg?.src || '';

      // 2. 상세 HTML 추출 (.detail 영역)
      const detailSection = document.querySelector('.detail') ||
                           document.querySelector('[id*="detail"]') ||
                           document.querySelector('.editor_content');
      
      if (detailSection) {
        result.detailHTML = detailSection.innerHTML;
      }

      // 3. 상세 이미지 수집 (/data/editor/ 경로만)
      if (detailSection) {
        const imgs = detailSection.querySelectorAll('img');
        result.detailImages = Array.from(imgs)
          .map(img => img.src)
          .filter(src => src && src.includes('/data/editor/'));
      }

      // 4. CSS 링크 수집
      result.cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.href);

      // 5. 인라인 스타일 수집
      if (detailSection) {
        const styledElements = detailSection.querySelectorAll('[style]');
        result.inlineStyles = Array.from(styledElements).map(el => ({
          tag: el.tagName,
          style: el.getAttribute('style')
        }));
      }

      return result;
    });

    // 리스트 데이터에서 정확한 정보 가져오기
    const listDataPath = path.join(__dirname, '..', 'data', '장인가구', 'products.json');
    let matchingProduct = null;
    
    if (fs.existsSync(listDataPath)) {
      const listProducts = JSON.parse(fs.readFileSync(listDataPath, 'utf8'));
      matchingProduct = listProducts.find(p => p.productUrl === product.productUrl);
    }

    // JSON 데이터 생성 (리스트 데이터 우선)
    const jsonData = {
      source: 'jangin',
      brand: '장인가구',
      category: product.category || '',
      productUrl: product.productUrl,
      productName: matchingProduct?.title || detailData.productName || product.title,
      price: matchingProduct?.price || detailData.price,
      mainImage: matchingProduct?.imageUrl || detailData.mainImage,
      viewport: {
        width: 1920,
        height: 1080,
        device: 'Desktop PC'
      },
      detailHTML: detailData.detailHTML,
      detailImages: detailData.detailImages,
      cssLinks: detailData.cssLinks,
      inlineStyles: detailData.inlineStyles,
      scrapedAt: new Date().toISOString()
    };

    // 파일명 생성
    const safeFilename = (matchingProduct?.title || product.title || `product-${index}`)
      .replace(/[^a-zA-Z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);

    const outputPath = path.join(OUTPUT_DIR, `${safeFilename}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf8');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ 완료 (${elapsed}초)`);
    console.log(`   📊 HTML: ${(detailData.detailHTML.length / 1024).toFixed(2)} KB`);
    console.log(`   🖼️  이미지: ${detailData.detailImages.length}개`);
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
  console.log('🚀 장인가구 배치 스크래핑 시작...\n');

  // products.json에서 제품 목록 로드
  const productsPath = path.join(__dirname, '..', 'data', '장인가구', 'products.json');
  if (!fs.existsSync(productsPath)) {
    console.error('❌ products.json 파일이 없습니다.');
    console.log('먼저 실행: npm run scrape:jangin && npm run organize:jangin');
    process.exit(1);
  }

  const allProducts = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  console.log(`📦 총 ${allProducts.length}개 제품 발견`);

  // 진행상황 로드
  const progress = loadProgress();
  console.log(`📊 진행상황: ${progress.completed.length}개 완료, ${progress.failed.length}개 실패\n`);

  // 아직 처리하지 않은 제품 필터링
  const pendingProducts = allProducts.filter(p => 
    !progress.completed.includes(p.productUrl) && 
    !progress.failed.includes(p.productUrl)
  );

  console.log(`⏳ 처리 대기 중: ${pendingProducts.length}개 제품\n`);

  if (pendingProducts.length === 0) {
    console.log('✅ 모든 제품이 이미 처리되었습니다!');
    await browser.close();
    return;
  }

  // 브라우저 시작
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul'
  });

  const page = await context.newPage();

  // 제품 처리
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pendingProducts.length; i++) {
    const product = pendingProducts[i];
    const result = await scrapeProduct(page, product, i, pendingProducts.length);

    if (result.success) {
      successCount++;
      progress.completed.push(product.productUrl);
    } else {
      failCount++;
      progress.failed.push(product.productUrl);
    }

    // 진행상황 저장 (매 5개마다)
    if ((i + 1) % 5 === 0 || i === pendingProducts.length - 1) {
      progress.currentIndex = i + 1;
      saveProgress(progress);
      console.log(`\n💾 진행상황 저장됨 (${i + 1}/${pendingProducts.length})\n`);
    }

    // 제품 간 딜레이
    if (i < pendingProducts.length - 1) {
      await page.waitForTimeout(DELAY_BETWEEN_PRODUCTS + Math.random() * 1000);
    }
  }

  await browser.close();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎉 배치 스크래핑 완료!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`📂 저장 위치: ${OUTPUT_DIR}`);
  console.log('═══════════════════════════════════════════════════════\n');
})();

