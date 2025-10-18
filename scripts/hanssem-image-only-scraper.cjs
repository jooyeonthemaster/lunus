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

async function scrapeImagesOnly(page, failedItem, index, total) {
  const { url, title } = failedItem;

  console.log(`\n[${index}/${total}] 📍 ${title}`);
  console.log(`   URL: ${url}`);

  try {
    // 페이지 이동
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await page.waitForTimeout(5000);

    // 대표 이미지 크롤링
    const mainImageUrl = await page.evaluate(() => {
      const mainImageEl = document.querySelector('img.Box__StyledBox-ds-styled-components__sc-71ddd825-0');
      return mainImageEl ? mainImageEl.src : null;
    });

    if (!mainImageUrl) {
      console.log("   ❌ 대표 이미지 없음");
      return { success: false, error: "No main image found" };
    }

    console.log("   ✅ 대표 이미지 추출");

    // "상세정보 펼치기" 버튼 클릭
    let expandSuccess = false;

    // 시도 1: 기본 방식
    try {
      const expandButton = page.locator('button:has-text("상세정보 펼치기")').first();
      const isVisible = await expandButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        await expandButton.click();
        await page.waitForTimeout(2000);
        expandSuccess = true;
        console.log("   ✅ 상세정보 펼침");
      }
    } catch (e) {}

    // 시도 2: 텍스트로 찾기
    if (!expandSuccess) {
      try {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent.includes('상세정보') && b.textContent.includes('펼치기'));
          if (btn) btn.click();
        });
        await page.waitForTimeout(2000);
        expandSuccess = true;
        console.log("   ✅ 상세정보 펼침 (방법2)");
      } catch (e) {}
    }

    // 가격 크롤링
    const priceData = await page.evaluate(() => {
      // 가격 추출 (여러 방법 시도)
      let price = '가격 정보 없음';

      // 방법 1: 일반적인 가격 텍스트
      const priceSelectors = [
        '[class*="price"]',
        '[class*="Price"]',
        'strong:has-text("원")',
        'span:has-text("원")',
        'p:has-text("원")'
      ];

      for (const selector of priceSelectors) {
        try {
          const priceEl = document.querySelector(selector);
          if (priceEl && priceEl.textContent.includes('원')) {
            const match = priceEl.textContent.match(/[\d,]+원/);
            if (match) {
              price = match[0];
              break;
            }
          }
        } catch (e) {}
      }

      return price;
    });

    // 이미지 전용 추출 (상세정보 펼치기 ~ 접기 사이의 모든 이미지)
    const imageData = await page.evaluate(() => {
      // 1. 대표 이미지
      let mainImage = '';
      const mainImageEl = document.querySelector('img.Box__StyledBox-ds-styled-components__sc-71ddd825-0');
      if (mainImageEl) {
        mainImage = mainImageEl.src;
      }

      // 2. "상세정보 접기" 버튼 찾기
      const collapseBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('상세정보 접기') || btn.textContent.includes('접기')
      );

      if (!collapseBtn) {
        return { success: false, error: "No collapse button found" };
      }

      // 3. 상세정보 컨테이너 찾기
      const detailContainer = document.querySelector('[class*="Detail"]') ||
                              document.querySelector('[class*="detail"]') ||
                              document.querySelector('section');

      if (!detailContainer) {
        return { success: false, error: "No detail container found" };
      }

      // 4. 컨테이너 내의 모든 이미지 수집 (추적 픽셀 제외)
      const allImages = Array.from(detailContainer.querySelectorAll('img'));
      const detailImages = allImages
        .filter(img => {
          // 추적 픽셀, 아이콘 제외
          const src = img.src || '';
          return src.includes('image.hanssem.com') &&
                 !src.includes('superbadge') &&
                 !src.includes('icon') &&
                 img.alt !== '';
        })
        .map(img => ({
          src: img.src,
          alt: img.alt || '',
          width: img.naturalWidth || 0,
          height: img.naturalHeight || 0
        }));

      // 5. 이미지를 HTML로 변환 (870px 레이아웃)
      let htmlContent = '';
      detailImages.forEach(img => {
        htmlContent += `<div class="img-box" style="display: block; width: 870px; margin-bottom: 0px;">\n`;
        htmlContent += `  <img src="${img.src}" alt="${img.alt}" style="max-width: 100%; height: auto;" />\n`;
        htmlContent += `</div>\n`;
      });

      return {
        success: true,
        mainImage: mainImage,
        detailHTML: htmlContent,
        imageCount: detailImages.length,
        htmlLength: htmlContent.length
      };
    });

    if (!imageData || !imageData.success) {
      console.log(`   ❌ ${imageData?.error || '이미지 추출 실패'}`);
      return { success: false, error: imageData?.error || "Image extraction failed" };
    }

    console.log(`   ✅ 이미지 ${imageData.imageCount}개 추출 (${(imageData.htmlLength / 1024).toFixed(2)} KB)`);

    // productCode 추출
    const productCode = url.match(/goods\/(\d+)/)?.[1];
    if (!productCode) {
      console.log("   ❌ productCode 추출 실패");
      return { success: false, error: "No productCode" };
    }

    // 제품 데이터 구성 (.img-box 스타일 적용)
    const scrapedData = {
      productCode: productCode,
      productName: title,
      price: priceData || "가격 정보 없음",
      productUrl: url,
      mainImage: imageData.mainImage || mainImageUrl,
      category: "한샘",

      detailHTML: imageData.detailHTML,
      cssLinks: [],

      styles: {
        imgBox: {
          display: "block",
          width: "870px",
          marginBottom: "0px"
        },
        contTxt: {
          textAlign: "start",
          maxWidth: "none",
          margin: "0px",
          fontSize: "12px"
        }
      },

      viewport: "1920x1080 (Desktop)",
      scrapedAt: new Date().toISOString(),
      scrapeMethod: "image-only"
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
  console.log("🖼️  한샘 이미지 전용 스크래퍼 시작...\n");

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

    const result = await scrapeImagesOnly(page, failedItem, i + 1, failedItems.length);

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
  console.log("✅ 이미지 전용 스크래핑 완료!");
  console.log("=".repeat(60));
  console.log(`📊 최종 통계:`);
  console.log(`   ✅ 재시도 성공: ${successCount}개 (${((successCount / failedItems.length) * 100).toFixed(1)}%)`);
  console.log(`   ❌ 여전히 실패: ${stillFailedCount}개 (${((stillFailedCount / failedItems.length) * 100).toFixed(1)}%)`);
  console.log(`   📦 전체 성공: ${progress.completed.length}개`);
  console.log(`   ❌ 전체 실패: ${stillFailed.length}개`);
  console.log("=".repeat(60));
}

main();
