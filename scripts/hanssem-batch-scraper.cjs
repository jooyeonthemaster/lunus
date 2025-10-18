const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// 한샘 제품 JSON 파일 목록
const HANSSEM_FILES = [
  "data/한샘/hanssem-거실.json",
  "data/한샘/hanssem-다이닝.json",
  "data/한샘/hanssem-옷장, 드레스룸.json",
  "data/한샘/hanssem-침실.json",
  "data/한샘/hanssem-키즈룸.json",
  "data/한샘/hanssem-홈오피스.json",
];

const OUTPUT_DIR = "data/hanssem/scraped-products";
const PROGRESS_FILE = "hanssem-scraping-progress.json";

// 안전한 파일명 생성
function makeSafeFilename(title) {
  return title
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "-")
    .substring(0, 100);
}

// 진행상황 로드
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
  }
  return { completed: [], failed: [] };
}

// 진행상황 저장
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function scrapeHanssemProduct(page, product, index, total) {
  const { title, productUrl } = product;

  console.log(`\n[${index}/${total}] 📍 ${title}`);
  console.log(`   URL: ${productUrl}`);

  try {
    // 페이지 이동
    await page.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await page.waitForTimeout(5000);

    // "상세정보 펼치기" 버튼 클릭
    try {
      const expandButton = page.locator('button:has-text("상세정보 펼치기")').first();
      const isVisible = await expandButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (isVisible) {
        await expandButton.click();
        await page.waitForTimeout(2000);
        console.log("   ✅ 상세정보 펼침");
      }
    } catch (e) {
      console.log("   ℹ️  상세정보 이미 펼쳐짐 또는 버튼 없음");
    }

    // HTML 추출: 첫 .img-box부터 "상세정보 접기" 버튼 직전까지
    const detailData = await page.evaluate(() => {
      // 1. 대표 이미지 추출 (페이지 상단의 제품 이미지)
      let mainImage = '';
      const mainImageEl = document.querySelector('img.Box__StyledBox-ds-styled-components__sc-71ddd825-0');
      if (mainImageEl) {
        mainImage = mainImageEl.src;
      }

      // 2. HTML 추출
      const firstImgBox = document.querySelector('.img-box');
      if (!firstImgBox) return null;

      const collapseBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('상세정보 접기')
      );

      if (!collapseBtn) return null;

      let currentElement = firstImgBox;
      let htmlContent = '';

      while (currentElement && currentElement !== collapseBtn) {
        htmlContent += currentElement.outerHTML + '\n';
        currentElement = currentElement.nextElementSibling;
      }

      // 3. CSS 링크 추출
      const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.href);

      return {
        detailHTML: htmlContent,
        cssLinks: cssLinks,
        mainImage: mainImage // 크롤링한 대표 이미지
      };
    });

    if (!detailData || !detailData.detailHTML) {
      console.log("   ❌ HTML 추출 실패");
      return { success: false, error: "HTML extraction failed" };
    }

    console.log(`   ✅ HTML 추출 완료 (${(detailData.detailHTML.length / 1024).toFixed(2)} KB)`);
    console.log(`   ${detailData.mainImage ? '✅' : '❌'} 대표 이미지 추출`);

    // productCode 추출 (URL에서)
    const productCode = productUrl.match(/goods\/(\d+)/)?.[1] || makeSafeFilename(title);

    // 제품 데이터 구성
    const scrapedData = {
      productCode: productCode,
      productName: title,
      price: product.price || "가격 정보 없음",
      productUrl: productUrl,
      mainImage: detailData.mainImage || product.imageUrl || "",
      category: product._category || "한샘",

      detailHTML: detailData.detailHTML,
      cssLinks: detailData.cssLinks,

      viewport: "1920x1080 (Desktop)",
      scrapedAt: new Date().toISOString(),
    };

    // 파일 저장 (productCode로)
    const outputPath = path.join(OUTPUT_DIR, `${productCode}.json`);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(scrapedData, null, 2), "utf8");

    console.log(`   💾 저장: ${productCode}.json`);

    return { success: true };

  } catch (error) {
    console.log(`   ❌ 스크래핑 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function getCategoryFromFile(url) {
  // URL이나 기타 정보로부터 카테고리 추출 (간단히 "한샘"으로 통일)
  return "한샘";
}

async function main() {
  console.log("🚀 한샘 배치 스크래핑 시작...\n");

  // 모든 제품 로드
  let allProducts = [];
  for (const file of HANSSEM_FILES) {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      const categoryName = path.basename(file, ".json").replace("hanssem-", "");

      data.forEach(product => {
        product._category = categoryName;
      });

      allProducts = allProducts.concat(data);
      console.log(`✅ ${file}: ${data.length}개 제품 로드`);
    } catch (e) {
      console.log(`⚠️  ${file} 로드 실패:`, e.message);
    }
  }

  console.log(`\n📦 총 ${allProducts.length}개 제품 스크래핑 예정`);
  console.log(`⏱️  예상 소요 시간: ${Math.ceil(allProducts.length * 12 / 60)}분\n`);

  // 진행상황 로드
  const progress = loadProgress();
  const completedUrls = new Set(progress.completed);

  // 아직 완료되지 않은 제품만 필터링
  const remainingProducts = allProducts.filter(
    p => !completedUrls.has(p.productUrl)
  );

  if (remainingProducts.length === 0) {
    console.log("✅ 모든 제품 스크래핑 완료!");
    return;
  }

  console.log(`📊 진행률: ${allProducts.length - remainingProducts.length}/${allProducts.length} 완료\n`);

  // 브라우저 시작
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });

  const page = await context.newPage();

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < remainingProducts.length; i++) {
    const product = remainingProducts[i];
    const globalIndex = allProducts.length - remainingProducts.length + i + 1;

    const result = await scrapeHanssemProduct(
      page,
      product,
      globalIndex,
      allProducts.length
    );

    if (result.success) {
      successCount++;
      progress.completed.push(product.productUrl);
    } else {
      failCount++;
      progress.failed.push({
        url: product.productUrl,
        title: product.title,
        error: result.error,
      });
    }

    // 진행상황 저장
    saveProgress(progress);

    // 진행률 출력
    console.log(`\n📊 진행률: ${globalIndex}/${allProducts.length} (${((globalIndex / allProducts.length) * 100).toFixed(1)}%)`);
    console.log(`   ✅ 성공: ${successCount}개 | ❌ 실패: ${failCount}개\n`);

    // 요청 간 딜레이
    await page.waitForTimeout(2000);
  }

  await browser.close();

  // 최종 결과
  console.log("\n" + "=".repeat(50));
  console.log("✅ 한샘 배치 스크래핑 완료!");
  console.log("=".repeat(50));
  console.log(`📊 총 제품: ${allProducts.length}개`);
  console.log(`✅ 성공: ${progress.completed.length}개`);
  console.log(`❌ 실패: ${progress.failed.length}개`);
  console.log(`💾 저장 위치: ${OUTPUT_DIR}/`);

  if (progress.failed.length > 0) {
    console.log(`\n⚠️  실패한 제품 목록은 ${PROGRESS_FILE} 참조`);
  }
}

main().catch(console.error);
