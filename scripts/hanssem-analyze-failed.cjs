const { chromium } = require("playwright");
const fs = require("fs");

const PROGRESS_FILE = "hanssem-scraping-progress.json";

// 진행상황 로드
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
  }
  return { completed: [], failed: [] };
}

async function analyzeFailedProduct(page, url, title) {
  console.log(`\n📍 분석: ${title}`);
  console.log(`   URL: ${url}\n`);

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await page.waitForTimeout(5000);

    // 상세정보 펼치기 시도
    try {
      const expandButton = page.locator('button:has-text("상세정보 펼치기")').first();
      const isVisible = await expandButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        await expandButton.click();
        await page.waitForTimeout(2000);
        console.log("✅ 상세정보 펼침\n");
      }
    } catch (e) {}

    // 페이지 구조 분석
    const structure = await page.evaluate(() => {
      // 1. img-box 확인
      const imgBoxes = document.querySelectorAll('.img-box');

      // 2. 다른 이미지 컨테이너 찾기
      const possibleContainers = [
        '.detail-content',
        '.product-detail',
        '.goods-detail',
        '#detail',
        '[class*="detail"]',
        '[class*="Detail"]',
        'article',
        'section'
      ];

      let foundContainers = {};
      possibleContainers.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          foundContainers[selector] = {
            count: elements.length,
            firstElementHTML: elements[0].outerHTML.substring(0, 500)
          };
        }
      });

      // 3. 모든 이미지 태그 찾기
      const allImages = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt,
        className: img.className,
        parent: img.parentElement ? img.parentElement.tagName : null
      }));

      // 4. picture 태그 찾기
      const pictures = Array.from(document.querySelectorAll('picture')).map(pic => ({
        parent: pic.parentElement ? pic.parentElement.className : null,
        sources: Array.from(pic.querySelectorAll('source')).length
      }));

      // 5. 버튼들 확인
      const buttons = Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent.trim().substring(0, 50),
        className: btn.className
      }));

      return {
        imgBoxCount: imgBoxes.length,
        containers: foundContainers,
        imageCount: allImages.length,
        images: allImages.slice(0, 5), // 처음 5개만
        pictureCount: pictures.length,
        pictures: pictures.slice(0, 3),
        buttons: buttons.filter(b => b.text.includes('상세') || b.text.includes('정보'))
      };
    });

    console.log("📊 구조 분석 결과:");
    console.log(`   .img-box: ${structure.imgBoxCount}개`);
    console.log(`   전체 이미지: ${structure.imageCount}개`);
    console.log(`   picture 태그: ${structure.pictureCount}개`);

    console.log("\n📦 발견된 컨테이너:");
    Object.keys(structure.containers).forEach(selector => {
      console.log(`   ${selector}: ${structure.containers[selector].count}개`);
    });

    console.log("\n🖼️  샘플 이미지 (처음 5개):");
    structure.images.forEach((img, i) => {
      console.log(`   [${i+1}] ${img.src.substring(0, 80)}`);
      console.log(`       class: ${img.className}, parent: ${img.parent}`);
    });

    console.log("\n🔘 상세정보 관련 버튼:");
    structure.buttons.forEach(btn => {
      console.log(`   "${btn.text}" (${btn.className})`);
    });

    console.log("\n" + "=".repeat(80));

    return structure;

  } catch (error) {
    console.error(`❌ 에러: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("🔍 한샘 실패 제품 구조 분석 시작...\n");

  const progress = loadProgress();
  const failedItems = progress.failed || [];

  console.log(`❌ 실패한 제품: ${failedItems.length}개`);
  console.log(`🎯 분석할 제품: 처음 10개\n`);
  console.log("=".repeat(80));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });

  const page = await context.newPage();

  const results = [];

  // 처음 10개만 분석
  for (let i = 0; i < Math.min(10, failedItems.length); i++) {
    const item = failedItems[i];
    const result = await analyzeFailedProduct(page, item.url, item.title);
    if (result) {
      results.push({
        title: item.title,
        url: item.url,
        structure: result
      });
    }
    await page.waitForTimeout(2000);
  }

  await browser.close();

  // 결과 저장
  fs.writeFileSync(
    "hanssem-failed-structure-analysis.json",
    JSON.stringify(results, null, 2),
    "utf8"
  );

  console.log("\n✅ 분석 완료!");
  console.log(`💾 결과 저장: hanssem-failed-structure-analysis.json`);
}

main();
