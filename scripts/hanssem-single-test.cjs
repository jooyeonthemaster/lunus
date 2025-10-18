const { chromium } = require("playwright");
const fs = require("fs");

async function testSingleProduct() {
  console.log("🧪 한샘 단일 제품 테스트 시작...\n");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });

  const page = await context.newPage();

  try {
    const testUrl = "https://store.hanssem.com/goods/1099086";
    const testTitle = "모디프 패브릭 스윙소파 4인";

    console.log(`📍 테스트 제품: ${testTitle}`);
    console.log(`📍 URL: ${testUrl}\n`);

    // 페이지 이동
    console.log("🌐 페이지 로딩 중...");
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    // "상세정보 펼치기" 버튼 클릭
    console.log("🔍 '상세정보 펼치기' 버튼 찾는 중...");
    try {
      const expandButton = page.locator('button:has-text("상세정보 펼치기")').first();
      const isVisible = await expandButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (isVisible) {
        console.log("✅ 버튼 발견! 클릭 중...");
        await expandButton.click();
        await page.waitForTimeout(2000);
        console.log("✅ 상세정보 펼침 완료");
      } else {
        console.log("ℹ️  이미 펼쳐져 있거나 버튼 없음");
      }
    } catch (e) {
      console.log("⚠️  버튼 클릭 실패:", e.message);
    }

    // HTML 추출
    console.log("\n📦 HTML 추출 중...");
    const detailData = await page.evaluate(() => {
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

      // CSS 링크 추출
      const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.href);

      // 메인 이미지
      let mainImage = '';
      const firstImg = firstImgBox.querySelector('img');
      if (firstImg && firstImg.src) {
        mainImage = firstImg.src;
      }

      // 이미지 개수 카운트
      const imgCount = (htmlContent.match(/<img/g) || []).length;
      const pictureCount = (htmlContent.match(/<picture/g) || []).length;

      return {
        detailHTML: htmlContent,
        cssLinks: cssLinks,
        mainImage: mainImage,
        stats: {
          htmlLength: htmlContent.length,
          imageCount: imgCount,
          pictureCount: pictureCount
        }
      };
    });

    if (!detailData || !detailData.detailHTML) {
      console.log("❌ HTML 추출 실패");
      await browser.close();
      return;
    }

    console.log("✅ HTML 추출 완료!");
    console.log(`   - HTML 크기: ${(detailData.stats.htmlLength / 1024).toFixed(2)} KB`);
    console.log(`   - 이미지 태그: ${detailData.stats.imageCount}개`);
    console.log(`   - picture 태그: ${detailData.stats.pictureCount}개`);
    console.log(`   - CSS 링크: ${detailData.cssLinks.length}개`);
    console.log(`   - 메인 이미지: ${detailData.mainImage.substring(0, 60)}...`);

    // 제품 데이터 구성
    const scrapedData = {
      productName: testTitle,
      price: 929000,
      productUrl: testUrl,
      mainImage: detailData.mainImage,
      category: "거실",

      detailHTML: detailData.detailHTML,
      cssLinks: detailData.cssLinks,

      viewport: "1920x1080 (Desktop)",
      scrapedAt: new Date().toISOString(),
    };

    // 저장
    const outputFile = "hanssem-single-test-result.json";
    fs.writeFileSync(outputFile, JSON.stringify(scrapedData, null, 2), "utf8");
    console.log(`\n💾 저장 완료: ${outputFile}`);

    // HTML도 별도 저장
    fs.writeFileSync("hanssem-test-detail.html", detailData.detailHTML, "utf8");
    console.log("💾 HTML 저장: hanssem-test-detail.html");

    console.log("\n✅ 테스트 완료!");

  } catch (error) {
    console.error("❌ 에러 발생:", error.message);
  } finally {
    await browser.close();
  }
}

testSingleProduct();
