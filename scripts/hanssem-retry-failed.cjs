const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = "data/hanssem/scraped-products";
const PROGRESS_FILE = "hanssem-scraping-progress.json";

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

async function scrapeHanssemProduct(page, failedItem, index, total) {
  const { url, title } = failedItem;

  console.log(`\n[${index}/${total}] 📍 재시도: ${title}`);
  console.log(`   URL: ${url}`);

  try {
    // 페이지 이동
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await page.waitForTimeout(5000);

    // 대표 이미지 먼저 크롤링 시도
    const mainImageUrl = await page.evaluate(() => {
      const mainImageEl = document.querySelector('img.Box__StyledBox-ds-styled-components__sc-71ddd825-0');
      return mainImageEl ? mainImageEl.src : null;
    });

    if (!mainImageUrl) {
      console.log("   ❌ 대표 이미지 없음 - 스킵");
      return { success: false, error: "No main image found" };
    }

    // "상세정보 펼치기" 버튼 클릭 (여러 시도)
    let expandSuccess = false;

    // 시도 1: 기본 방식
    try {
      const expandButton = page.locator('button:has-text("상세정보 펼치기")').first();
      const isVisible = await expandButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        await expandButton.click();
        await page.waitForTimeout(2000);
        expandSuccess = true;
        console.log("   ✅ 상세정보 펼침 (방법1)");
      }
    } catch (e) {}

    // 시도 2: 텍스트로 찾기
    if (!expandSuccess) {
      try {
        const button = await page.locator('button').evaluateAll((buttons) => {
          return buttons.find(btn => btn.textContent.includes('상세정보') && btn.textContent.includes('펼치기'));
        });
        if (button) {
          await page.locator('button').evaluateAll((buttons) => {
            const btn = buttons.find(b => b.textContent.includes('상세정보') && b.textContent.includes('펼치기'));
            if (btn) btn.click();
          });
          await page.waitForTimeout(2000);
          expandSuccess = true;
          console.log("   ✅ 상세정보 펼침 (방법2)");
        }
      } catch (e) {}
    }

    // 시도 3: 모든 버튼 검색
    if (!expandSuccess) {
      try {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const btn of buttons) {
            if (btn.textContent.includes('상세정보') || btn.textContent.includes('펼치기')) {
              btn.click();
              break;
            }
          }
        });
        await page.waitForTimeout(2000);
        expandSuccess = true;
        console.log("   ✅ 상세정보 펼침 (방법3)");
      } catch (e) {}
    }

    // HTML 추출
    const detailData = await page.evaluate(() => {
      // 1. 대표 이미지 (이미 위에서 추출했지만 다시 시도)
      let mainImage = '';
      const mainImageEl = document.querySelector('img.Box__StyledBox-ds-styled-components__sc-71ddd825-0');
      if (mainImageEl) {
        mainImage = mainImageEl.src;
      }

      // 2. .img-box 찾기
      const firstImgBox = document.querySelector('.img-box');
      if (!firstImgBox) return { success: false, error: "No .img-box found" };

      // 3. 접기 버튼 찾기 (여러 방법)
      let collapseBtn = null;

      // 방법 1: 정확한 텍스트
      collapseBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('상세정보 접기')
      );

      // 방법 2: 접기만 포함
      if (!collapseBtn) {
        collapseBtn = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent.includes('접기')
        );
      }

      // 방법 3: 마지막 img-box 다음 요소
      if (!collapseBtn) {
        const allImgBoxes = document.querySelectorAll('.img-box');
        if (allImgBoxes.length > 0) {
          const lastImgBox = allImgBoxes[allImgBoxes.length - 1];
          collapseBtn = lastImgBox.nextElementSibling;
        }
      }

      if (!collapseBtn) return { success: false, error: "No collapse button found" };

      // 4. HTML 수집
      let currentElement = firstImgBox;
      let htmlContent = '';
      let elementCount = 0;

      while (currentElement && currentElement !== collapseBtn && elementCount < 100) {
        htmlContent += currentElement.outerHTML + '\n';
        currentElement = currentElement.nextElementSibling;
        elementCount++;
      }

      if (htmlContent.length < 100) {
        return { success: false, error: "HTML too short" };
      }

      // 5. CSS 추출
      const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.href);

      return {
        success: true,
        mainImage: mainImage,
        detailHTML: htmlContent,
        cssLinks: cssLinks,
        htmlLength: htmlContent.length
      };
    });

    if (!detailData || !detailData.success) {
      console.log(`   ❌ ${detailData?.error || 'HTML 추출 실패'}`);
      return { success: false, error: detailData?.error || "HTML extraction failed" };
    }

    console.log(`   ✅ HTML 추출 완료 (${(detailData.htmlLength / 1024).toFixed(2)} KB)`);
    console.log(`   ${detailData.mainImage ? '✅' : '❌'} 대표 이미지`);

    // productCode 추출
    const productCode = url.match(/goods\/(\d+)/)?.[1];
    if (!productCode) {
      console.log("   ❌ productCode 추출 실패");
      return { success: false, error: "No productCode" };
    }

    // 제품 데이터 구성
    const scrapedData = {
      productCode: productCode,
      productName: title,
      price: "가격 정보 없음",
      productUrl: url,
      mainImage: detailData.mainImage || mainImageUrl,
      category: "한샘",

      detailHTML: detailData.detailHTML,
      cssLinks: detailData.cssLinks,

      viewport: "1920x1080 (Desktop)",
      scrapedAt: new Date().toISOString(),
    };

    // 파일 저장
    const outputPath = path.join(OUTPUT_DIR, `${productCode}.json`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(scrapedData, null, 2), "utf8");

    console.log(`   💾 저장: ${productCode}.json`);

    return { success: true };

  } catch (error) {
    console.log(`   ❌ 에러: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("🔄 한샘 실패 제품 재시도 시작...\n");

  // 진행상황 로드
  const progress = loadProgress();
  const failedItems = progress.failed || [];

  console.log(`❌ 실패한 제품: ${failedItems.length}개`);
  console.log(`✅ 이미 성공: ${progress.completed.length}개\n`);

  if (failedItems.length === 0) {
    console.log("✅ 재시도할 실패 제품이 없습니다!");
    return;
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });

  const page = await context.newPage();

  let successCount = 0;
  let stillFailedCount = 0;
  const stillFailed = [];

  for (let i = 0; i < failedItems.length; i++) {
    const failedItem = failedItems[i];

    const result = await scrapeHanssemProduct(page, failedItem, i + 1, failedItems.length);

    if (result.success) {
      successCount++;
      progress.completed.push(failedItem.url);
    } else {
      stillFailedCount++;
      stillFailed.push({
        ...failedItem,
        retryError: result.error
      });
    }

    // 진행상황 업데이트
    progress.failed = stillFailed;
    saveProgress(progress);

    // 2초 대기
    await page.waitForTimeout(2000);

    // 중간 진행률 출력
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 중간 진행률: ${i + 1}/${failedItems.length}`);
      console.log(`   ✅ 성공: ${successCount}개`);
      console.log(`   ❌ 여전히 실패: ${stillFailedCount}개\n`);
    }
  }

  await browser.close();

  console.log("\n" + "=".repeat(60));
  console.log("✅ 재시도 완료!");
  console.log("=".repeat(60));
  console.log(`📊 최종 통계:`);
  console.log(`   ✅ 재시도 성공: ${successCount}개 (${((successCount / failedItems.length) * 100).toFixed(1)}%)`);
  console.log(`   ❌ 여전히 실패: ${stillFailedCount}개 (${((stillFailedCount / failedItems.length) * 100).toFixed(1)}%)`);
  console.log(`   📦 전체 성공: ${progress.completed.length}개`);
  console.log(`   ❌ 전체 실패: ${stillFailed.length}개`);
  console.log("=".repeat(60));
}

main();
