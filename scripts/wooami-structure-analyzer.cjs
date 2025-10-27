/*
  우아미(Wooami) 상세페이지 구조 분석기
  - 실제 상품 페이지를 방문하여 HTML 구조 파악
  - 상세 이미지가 어느 영역에 있는지 확인
  - 이미지 URL 패턴 파악
*/

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🔍 우아미 상세페이지 구조 분석 시작...\n');

  // 샘플 제품 URL (거실장 첫 번째 제품)
  const testUrl = 'https://wooamimall.com/product/detail.html?product_no=1756&cate_no=43&display_group=1';
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1366, height: 768 });

  console.log(`📄 테스트 URL: ${testUrl}\n`);
  
  try {
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForTimeout(3000);

    // 스크롤해서 lazy 이미지 로드
    console.log('📜 스크롤링 중...');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 300);
      });
    });
    await page.waitForTimeout(2000);

    // 페이지 구조 분석
    const analysis = await page.evaluate(() => {
      const result = {
        detailSectionSelectors: [],
        allImages: [],
        imagesBySection: {},
        htmlStructure: []
      };

      // 1. 상세 섹션 찾기 (여러 셀렉터 시도)
      const possibleSelectors = [
        '.detail',
        '#detail',
        '.prdDetail',
        '.goods_detail',
        '.product-detail',
        '.item_detail_contents',
        '#prdDetail',
        '.xans-product-detail',
        '.detailArea',
        '#contents'
      ];

      possibleSelectors.forEach(selector => {
        const elem = document.querySelector(selector);
        if (elem) {
          result.detailSectionSelectors.push({
            selector: selector,
            found: true,
            innerHTML: elem.innerHTML.substring(0, 500) + '...',
            imageCount: elem.querySelectorAll('img').length
          });
        }
      });

      // 2. 모든 이미지 URL 수집 (전체 페이지)
      const allImgs = document.querySelectorAll('img');
      allImgs.forEach((img, index) => {
        let src = img.src || img.getAttribute('data-src') || img.getAttribute('ec-data-src') || '';
        
        // 상대 경로 처리
        if (src.startsWith('/')) {
          src = 'https://wooamimall.com' + src;
        }
        if (src.startsWith('//')) {
          src = 'https:' + src;
        }

        result.allImages.push({
          index: index,
          src: src,
          alt: img.alt || '',
          className: img.className || '',
          parent: img.parentElement?.tagName || '',
          width: img.width || 0,
          height: img.height || 0
        });
      });

      // 3. 이미지를 섹션별로 분류
      const detailArea = document.querySelector('.prdDetail, #prdDetail, .detail, #detail');
      if (detailArea) {
        const detailImgs = detailArea.querySelectorAll('img');
        result.imagesBySection.detailArea = [];
        detailImgs.forEach(img => {
          let src = img.src || img.getAttribute('data-src') || '';
          if (src.startsWith('/')) src = 'https://wooamimall.com' + src;
          if (src.startsWith('//')) src = 'https:' + src;
          result.imagesBySection.detailArea.push(src);
        });
      }

      // 4. HTML 구조 (주요 태그만)
      const mainContent = document.querySelector('body');
      if (mainContent) {
        const walk = (node, depth = 0) => {
          if (depth > 5) return; // 깊이 제한
          if (node.nodeType !== 1) return; // 요소 노드만

          const tag = node.tagName.toLowerCase();
          const id = node.id ? `#${node.id}` : '';
          const classes = node.className ? `.${node.className.split(' ').join('.')}` : '';
          const selector = `${tag}${id}${classes}`;
          
          result.htmlStructure.push({
            depth: depth,
            selector: selector,
            hasImages: node.querySelectorAll('img').length > 0,
            imageCount: node.querySelectorAll('img').length
          });

          Array.from(node.children).slice(0, 5).forEach(child => walk(child, depth + 1));
        };
        walk(mainContent);
      }

      return result;
    });

    // 결과 출력
    console.log('\n' + '='.repeat(70));
    console.log('📊 분석 결과');
    console.log('='.repeat(70));

    console.log('\n1️⃣  발견된 상세 섹션:');
    if (analysis.detailSectionSelectors.length > 0) {
      analysis.detailSectionSelectors.forEach(s => {
        console.log(`   ✅ ${s.selector}: ${s.imageCount}개 이미지`);
      });
    } else {
      console.log('   ❌ 상세 섹션을 찾을 수 없습니다.');
    }

    console.log(`\n2️⃣  전체 이미지: ${analysis.allImages.length}개`);
    console.log('\n   이미지 URL 패턴 분석:');
    const urlPatterns = {};
    analysis.allImages.forEach(img => {
      if (!img.src) return;
      
      // URL 패턴 추출
      let pattern = 'unknown';
      if (img.src.includes('wooamimall.com/web/product/')) pattern = 'product_thumbnail';
      else if (img.src.includes('/web/upload/NNEditor/')) pattern = 'NNEditor';
      else if (img.src.includes('gi.esmplus.com')) {
        const match = img.src.match(/gi\.esmplus\.com\/([^\/]+)/);
        pattern = match ? `esmplus_${match[1]}` : 'esmplus_unknown';
      }
      else if (img.src.includes('wooamimall.com')) pattern = 'wooamimall_other';
      else pattern = 'external';

      urlPatterns[pattern] = (urlPatterns[pattern] || 0) + 1;
    });

    Object.entries(urlPatterns).forEach(([pattern, count]) => {
      console.log(`   • ${pattern}: ${count}개`);
    });

    console.log('\n3️⃣  상세 영역 이미지 샘플 (처음 5개):');
    if (analysis.imagesBySection.detailArea) {
      analysis.imagesBySection.detailArea.slice(0, 5).forEach((url, i) => {
        console.log(`   ${i + 1}. ${url}`);
      });
      console.log(`   ... 총 ${analysis.imagesBySection.detailArea.length}개`);
    }

    console.log('\n4️⃣  이미지 필터링 기준:');
    console.log('   ✅ 포함할 패턴:');
    console.log('      • gi.esmplus.com/glory3646/wooami/...');
    console.log('      • gi.esmplus.com/glory8804/...');
    console.log('      • /web/upload/NNEditor/...');
    console.log('   ❌ 제외할 패턴:');
    console.log('      • /web/product/... (썸네일)');
    console.log('      • icon, badge, logo 포함');
    console.log('      • 너비/높이 < 100px (아이콘)');

    // 실제 상세 이미지만 필터링
    const detailImages = analysis.allImages.filter(img => {
      if (!img.src) return false;
      
      // 상세 이미지 패턴
      if (img.src.includes('gi.esmplus.com/glory3646/wooami/') ||
          img.src.includes('gi.esmplus.com/glory8804/') ||
          img.src.includes('/web/upload/NNEditor/')) {
        // 아이콘/작은 이미지 제외
        if (img.width < 100 || img.height < 100) return false;
        // UI 요소 제외
        if (img.src.includes('icon') || img.src.includes('badge') || img.src.includes('logo')) return false;
        return true;
      }
      
      return false;
    });

    console.log('\n5️⃣  최종 필터링 결과:');
    console.log(`   총 ${detailImages.length}개 상세 이미지 발견`);
    console.log('\n   상세 이미지 목록:');
    detailImages.forEach((img, i) => {
      console.log(`   ${i + 1}. ${img.src}`);
      console.log(`      크기: ${img.width}x${img.height}, 부모: <${img.parent}>`);
    });

    // JSON 파일로 저장
    const outputPath = path.join(process.cwd(), 'wooami-structure-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      testUrl,
      analysis,
      detailImages,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log(`💾 분석 결과 저장: ${outputPath}`);
    console.log('='.repeat(70));

    console.log('\n✅ 구조 분석 완료!');
    console.log('\n💡 다음 단계:');
    console.log('   1. wooami-structure-analysis.json 확인');
    console.log('   2. 필터링 로직 검증');
    console.log('   3. wooami-detail-scraper-v2.cjs 작성');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }

  await page.waitForTimeout(5000); // 5초 대기 (확인용)
  await browser.close();
})();





