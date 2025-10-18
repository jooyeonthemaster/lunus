const { chromium } = require("playwright");
const fs = require("fs");

async function testEnexScraping() {
  console.log("🧪 Testing Enex single product scraping...\n");

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // 테스트 제품
  const testProduct = {
    title: "제이모드 J형 무몰딩 붙박이장(실속형)-30cm",
    price: 98880,
    productUrl: "https://www.enex.co.kr/goods/goods_view.php?goodsNo=1000008985",
    imageUrl: "https://malltr0083.cdn-nhncommerce.com/data/goods/25/08/34/1000008985/1000008985_detail_039.jpg"
  };

  try {
    console.log(`📄 Loading: ${testProduct.title}`);
    console.log(`🔗 URL: ${testProduct.productUrl}\n`);

    await page.goto(testProduct.productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    console.log("🖼️  Collecting images...\n");

    // 모든 이미지 수집
    const allImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      return images.map(img => img.src);
    });

    console.log(`📊 Total images: ${allImages.length}`);

    // 상세 이미지 필터링 - gdcdn.enex.co.kr/UPLOAD/ 경로만
    const detailImages = allImages.filter(src => {
      // gdcdn.enex.co.kr/UPLOAD 경로만
      if (!src.includes("gdcdn.enex.co.kr/UPLOAD")) return false;

      // 배송/공통 이미지 제외
      const excludePatterns = [
        "delivery",
        "event",
        "banner",
        "logo",
        "icon",
        "button",
        "_intro",
        "_info"
      ];

      return !excludePatterns.some(pattern => src.toLowerCase().includes(pattern));
    });

    // 중복 제거
    const uniqueImages = [...new Set(detailImages)];

    console.log(`🎯 Detail images found: ${uniqueImages.length}\n`);

    if (uniqueImages.length > 0) {
      console.log("✅ Sample images:");
      uniqueImages.slice(0, 5).forEach((url, idx) => {
        console.log(`  ${idx + 1}. ${url}`);
      });
    }

    // 결과 저장
    const result = {
      ...testProduct,
      detailImages: uniqueImages,
      scrapedDetailAt: new Date().toISOString()
    };

    fs.writeFileSync(
      "enex-test-result.json",
      JSON.stringify(result, null, 2)
    );

    console.log("\n💾 Result saved to enex-test-result.json");
    console.log(`📊 Final count: ${uniqueImages.length} detail images`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await browser.close();
  }
}

testEnexScraping().catch(console.error);
