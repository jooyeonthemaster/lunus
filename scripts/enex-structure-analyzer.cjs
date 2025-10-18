const { chromium } = require("playwright");
const fs = require("fs");

async function analyzeEnexStructure() {
  console.log("🔍 Starting Enex structure analysis...\n");

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // 테스트 URL - 에넥스 제품 상세 페이지
  const testUrl = "https://www.enex.co.kr/goods/goods_view.php?goodsNo=1000008985";

  try {
    console.log(`📄 Loading page: ${testUrl}`);
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    console.log("\n🖼️  Analyzing image structure...\n");

    // 모든 이미지 수집
    const allImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      return images.map((img, index) => ({
        index,
        src: img.src,
        alt: img.alt || "",
        className: img.className || "",
        parent: img.parentElement?.tagName || "",
        parentClass: img.parentElement?.className || "",
        width: img.width,
        height: img.height,
      }));
    });

    console.log(`📊 Total images found: ${allImages.length}\n`);

    // 도메인별 이미지 분류
    const imageDomains = {};
    allImages.forEach((img) => {
      try {
        const url = new URL(img.src);
        const domain = url.hostname;
        if (!imageDomains[domain]) {
          imageDomains[domain] = [];
        }
        imageDomains[domain].push(img.src);
      } catch (e) {
        // Invalid URL
      }
    });

    console.log("🌐 Images by domain:\n");
    Object.entries(imageDomains).forEach(([domain, images]) => {
      console.log(`  ${domain}: ${images.length} images`);
    });
    console.log("");

    // 에넥스 관련 도메인 이미지 필터링
    const enexImages = allImages.filter((img) =>
      img.src.includes("gdcdn.enex.co.kr") || img.src.includes("enex.co.kr")
    );

    console.log(`🎯 Enex-related images: ${enexImages.length}\n`);

    // 이미지 패턴 분석
    const imagePatterns = {};
    enexImages.forEach((img) => {
      const url = new URL(img.src);
      const path = url.pathname;
      const dir = path.substring(0, path.lastIndexOf("/"));

      if (!imagePatterns[dir]) {
        imagePatterns[dir] = [];
      }
      imagePatterns[dir].push({
        filename: path.substring(path.lastIndexOf("/") + 1),
        fullUrl: img.src,
      });
    });

    console.log("📁 Image directory patterns:\n");
    Object.entries(imagePatterns).forEach(([dir, images]) => {
      console.log(`  ${dir}`);
      console.log(`    → ${images.length} images`);
      console.log(`    → Examples: ${images.slice(0, 3).map((i) => i.filename).join(", ")}\n`);
    });

    // HTML 구조 분석
    const detailSections = await page.evaluate(() => {
      const sections = [];

      // 상세 이미지가 들어있는 영역 찾기
      const possibleContainers = [
        document.querySelector("#contents"),
        document.querySelector(".goods-detail"),
        document.querySelector(".detail-info"),
        document.querySelector('[id*="detail"]'),
        document.querySelector('[class*="detail"]'),
      ];

      possibleContainers.forEach((container, idx) => {
        if (container) {
          const images = container.querySelectorAll("img");
          sections.push({
            selector: `Container ${idx + 1}`,
            tagName: container.tagName,
            id: container.id || "",
            className: container.className || "",
            imageCount: images.length,
          });
        }
      });

      return sections;
    });

    console.log("🏗️  HTML structure analysis:\n");
    detailSections.forEach((section) => {
      console.log(`  ${section.selector}:`);
      console.log(`    Tag: <${section.tagName}>`);
      console.log(`    ID: ${section.id || "N/A"}`);
      console.log(`    Class: ${section.className || "N/A"}`);
      console.log(`    Images: ${section.imageCount}\n`);
    });

    // 결과 저장
    const result = {
      testUrl,
      timestamp: new Date().toISOString(),
      totalImages: allImages.length,
      enexImages: enexImages.length,
      imageDomains,
      imagePatterns,
      detailSections,
      sampleImages: enexImages.slice(0, 10).map((img) => img.src),
      allSampleImages: Object.keys(imageDomains).map(domain => ({
        domain,
        sample: imageDomains[domain].slice(0, 3)
      }))
    };

    fs.writeFileSync(
      "enex-structure-analysis.json",
      JSON.stringify(result, null, 2)
    );

    console.log("✅ Analysis complete! Results saved to enex-structure-analysis.json");
    console.log("\n📸 Sample images:");
    result.sampleImages.forEach((url, idx) => {
      console.log(`  ${idx + 1}. ${url}`);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await browser.close();
  }
}

analyzeEnexStructure().catch(console.error);
