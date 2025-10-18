const { chromium } = require("playwright");
const fs = require("fs");

async function testImprovedScraper() {
  console.log("🧪 한샘 개선된 스크래퍼 테스트...\n");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });

  const page = await context.newPage();

  try {
    const testUrl = "https://store.hanssem.com/goods/1099086";
    const testProduct = {
      title: "모디프 패브릭 스윙소파 4인",
      price: 929000,
      imageUrl: "https://image.hanssem.com/hsimg/upload/display/superbadge/2025/09/08/180_1757294047153.png?v=20250925165324"
    };

    console.log(`📍 테스트: ${testProduct.title}`);
    console.log(`📍 URL: ${testUrl}\n`);

    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    // 상세정보 펼치기
    try {
      const expandButton = page.locator('button:has-text("상세정보 펼치기")').first();
      const isVisible = await expandButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        await expandButton.click();
        await page.waitForTimeout(2000);
        console.log("✅ 상세정보 펼침");
      }
    } catch (e) {}

    // 상세 데이터 추출
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

      // 3. CSS 추출 (모든 스타일시트)
      const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.href);

      // inline style 추출
      const allInlineStyles = Array.from(document.querySelectorAll('[style]'))
        .map(el => el.getAttribute('style'))
        .filter(Boolean);

      // computed style 샘플 추출 (img-box와 cont-txt)
      const imgBoxStyle = window.getComputedStyle(firstImgBox);
      const contTxt = document.querySelector('.cont-txt');
      const contTxtStyle = contTxt ? window.getComputedStyle(contTxt) : null;

      return {
        mainImage: mainImage, // 크롤링한 대표 이미지
        detailHTML: htmlContent,
        cssLinks: cssLinks,
        htmlLength: htmlContent.length,
        inlineStylesCount: allInlineStyles.length,
        sampleStyles: {
          imgBox: {
            display: imgBoxStyle.display,
            width: imgBoxStyle.width,
            marginBottom: imgBoxStyle.marginBottom,
          },
          contTxt: contTxtStyle ? {
            textAlign: contTxtStyle.textAlign,
            maxWidth: contTxtStyle.maxWidth,
            margin: contTxtStyle.margin,
            fontSize: contTxtStyle.fontSize,
          } : null
        }
      };
    });

    if (!detailData) {
      console.log("❌ 데이터 추출 실패");
      await browser.close();
      return;
    }

    console.log("✅ 데이터 추출 완료!");
    console.log(`   - 대표 이미지: ${detailData.mainImage ? '✅' : '❌'}`);
    console.log(`   - HTML: ${(detailData.htmlLength / 1024).toFixed(2)} KB`);
    console.log(`   - CSS 링크: ${detailData.cssLinks.length}개`);
    console.log(`   - Inline 스타일: ${detailData.inlineStylesCount}개`);
    console.log(`\n📊 스타일 샘플:`);
    console.log(JSON.stringify(detailData.sampleStyles, null, 2));

    // productCode 추출 (URL에서)
    const productCode = testUrl.match(/goods\/(\d+)/)?.[1] || "unknown";

    // 최종 데이터
    const scrapedData = {
      productCode: productCode,
      productName: testProduct.title,
      price: testProduct.price,
      productUrl: testUrl,
      mainImage: detailData.mainImage || testProduct.imageUrl, // 크롤링한 이미지 우선, 없으면 fallback
      category: "거실",

      detailHTML: detailData.detailHTML,
      cssLinks: detailData.cssLinks,

      viewport: "1920x1080 (Desktop)",
      scrapedAt: new Date().toISOString(),
    };

    // 저장 (productCode로)
    const outputFile = `hanssem-improved-${productCode}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(scrapedData, null, 2), "utf8");
    console.log(`\n💾 저장: ${outputFile}`);
    console.log(`✅ productCode: ${productCode}`);
    console.log(`✅ mainImage: ${scrapedData.mainImage.substring(0, 80)}...`);

    console.log("\n✅ 테스트 완료!");

  } catch (error) {
    console.error("❌ 에러:", error.message);
  } finally {
    await browser.close();
  }
}

testImprovedScraper();
