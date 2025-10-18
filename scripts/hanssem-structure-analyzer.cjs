const { chromium } = require("playwright");
const fs = require("fs");

async function analyzeHanssemStructure() {
  console.log("🔍 한샘 페이지 구조 분석 시작...\n");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    const testUrl = "https://store.hanssem.com/goods/1099086";
    console.log(`📍 테스트 URL: ${testUrl}`);

    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000); // 추가 로딩 대기

    // 1. "상세정보 펼치기" 버튼 찾기
    console.log("\n🔍 '상세정보 펼치기' 버튼 찾는 중...");

    const expandButton = await page.locator('button:has-text("상세정보 펼치기")').first();
    const isVisible = await expandButton.isVisible().catch(() => false);

    if (isVisible) {
      console.log("✅ '상세정보 펼치기' 버튼 발견!");
      console.log("🖱️  버튼 클릭 중...");
      await expandButton.click();
      await page.waitForTimeout(2000);
      console.log("✅ 상세정보 펼침 완료");
    } else {
      console.log("⚠️  '상세정보 펼치기' 버튼이 보이지 않음 (이미 펼쳐져 있을 수 있음)");
    }

    // 2. img-box 시작점 찾기
    console.log("\n🔍 '.img-box' 시작점 찾는 중...");
    const imgBoxes = await page.locator('.img-box').count();
    console.log(`✅ .img-box 요소 개수: ${imgBoxes}개`);

    // 3. "상세정보 접기" 버튼 찾기
    console.log("\n🔍 '상세정보 접기' 버튼 찾는 중...");
    const collapseButton = await page.locator('button:has-text("상세정보 접기")').first();
    const collapseVisible = await collapseButton.isVisible().catch(() => false);

    if (collapseVisible) {
      console.log("✅ '상세정보 접기' 버튼 발견!");
    }

    // 4. 첫 번째 img-box부터 상세정보 접기 버튼까지의 HTML 추출
    console.log("\n📦 상세 HTML 추출 중...");

    const detailHTML = await page.evaluate(() => {
      // 첫 번째 .img-box 찾기
      const firstImgBox = document.querySelector('.img-box');
      if (!firstImgBox) return null;

      // "상세정보 접기" 버튼 찾기
      const collapseBtn = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('상세정보 접기')
      );
      if (!collapseBtn) return null;

      // firstImgBox부터 collapseBtn 직전까지의 모든 요소 수집
      let currentElement = firstImgBox;
      let htmlContent = '';

      while (currentElement && currentElement !== collapseBtn) {
        htmlContent += currentElement.outerHTML + '\n';
        currentElement = currentElement.nextElementSibling;
      }

      return htmlContent;
    });

    if (detailHTML) {
      console.log(`✅ 상세 HTML 추출 완료 (길이: ${detailHTML.length} bytes)`);

      // HTML 저장
      fs.writeFileSync('hanssem-detail-sample.html', detailHTML, 'utf8');
      console.log("💾 저장: hanssem-detail-sample.html");
    } else {
      console.log("❌ 상세 HTML 추출 실패");
    }

    // 5. CSS 추출
    console.log("\n🎨 CSS 스타일 추출 중...");
    const cssLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.map(link => link.href);
    });
    console.log(`✅ CSS 링크 개수: ${cssLinks.length}개`);

    // 6. 이미지 URL 분석
    console.log("\n🖼️  이미지 URL 패턴 분석 중...");
    const imagePatterns = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('.img-box img, .img-box picture source'));
      return images.slice(0, 5).map(img => ({
        tag: img.tagName,
        src: img.src || img.srcset || 'N/A',
        srcset: img.srcset || 'N/A'
      }));
    });

    console.log("📸 이미지 샘플:");
    imagePatterns.forEach((img, i) => {
      console.log(`  ${i + 1}. ${img.tag}: ${img.src.substring(0, 80)}...`);
    });

    // 7. 구조 정보 저장
    const structureInfo = {
      url: testUrl,
      analyzedAt: new Date().toISOString(),
      structure: {
        imgBoxCount: imgBoxes,
        hasExpandButton: isVisible,
        hasCollapseButton: collapseVisible,
        detailHTMLLength: detailHTML?.length || 0,
        cssLinksCount: cssLinks.length,
        imagePatterns: imagePatterns
      },
      cssLinks: cssLinks,
      notes: [
        "상세정보는 '상세정보 펼치기' 버튼 클릭 후 보임",
        "첫 번째 .img-box부터 '상세정보 접기' 버튼 직전까지가 상세 컨텐츠",
        "picture 태그 사용 (srcset으로 반응형 이미지)",
        "image.hanssem.com CDN 사용"
      ]
    };

    fs.writeFileSync(
      'hanssem-structure-analysis.json',
      JSON.stringify(structureInfo, null, 2),
      'utf8'
    );
    console.log("\n💾 구조 분석 결과 저장: hanssem-structure-analysis.json");

    console.log("\n✅ 한샘 페이지 구조 분석 완료!");

  } catch (error) {
    console.error("❌ 에러 발생:", error.message);
  } finally {
    await browser.close();
  }
}

analyzeHanssemStructure();
