// app/api/scrape/debug-advanced/route.ts
import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function GET() {
  let browser = null;
  
  try {
    browser = await chromium.launch({
      headless: false,  // 브라우저 보이게
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ko-KR',
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
      }
    });
    
    const page = await context.newPage();
    
    // JavaScript 활성화 확인
    await page.addInitScript(() => {
      // @ts-ignore
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    console.log('일룸 페이지 접속 중...');
    
    // 네트워크 응답 모니터링
    const responses: any[] = [];
    page.on('response', (response) => {
      if (response.url().includes('product') || response.url().includes('api')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          type: response.request().resourceType()
        });
      }
    });
    
    // 페이지 이동 - networkidle로 변경
    try {
      await page.goto('https://www.iloom.com/product/list.do?categoryNo=1', {
        waitUntil: 'networkidle',  // 네트워크 안정화까지 대기
        timeout: 60000,
      });
    } catch (e) {
      console.log('타임아웃이지만 계속 진행');
    }
    
    // 페이지 완전 로드 대기
    await page.waitForTimeout(10000);
    
    // 스크롤하여 lazy loading 트리거
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(3000);
    
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(3000);
    
    // 전체 페이지 분석
    const fullAnalysis = await page.evaluate(() => {
      const result: any = {
        pageInfo: {
          url: window.location.href,
          title: document.title,
          bodyText: document.body?.innerText?.substring(0, 500) || 'No body text',
          hasContent: document.body?.innerHTML?.length || 0
        },
        images: {
          total: 0,
          srcs: [],
          lazyImages: 0,
          productImages: []
        },
        elements: {
          divs: document.querySelectorAll('div').length,
          links: document.querySelectorAll('a').length,
          lists: document.querySelectorAll('ul, ol').length,
          listItems: document.querySelectorAll('li').length
        },
        selectors: {},
        dataAttributes: []
      };
      
      // 모든 이미지 수집
      const allImages = document.querySelectorAll('img');
      result.images.total = allImages.length;
      
      allImages.forEach((img: HTMLImageElement, index) => {
        if (index < 5) {  // 처음 5개만 상세 정보
          result.images.srcs.push({
            src: img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src'),
            alt: img.alt,
            className: img.className,
            width: img.width,
            height: img.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            isVisible: img.offsetParent !== null
          });
        }
        
        // lazy loading 이미지 체크
        if (img.getAttribute('data-src') || img.getAttribute('data-lazy-src')) {
          result.images.lazyImages++;
        }
        
        // 제품 이미지 체크
        const imgSrc = img.src || img.getAttribute('data-src') || '';
        if (imgSrc.includes('product') || imgSrc.includes('upload') || imgSrc.includes('cdn')) {
          result.images.productImages.push(imgSrc.substring(0, 150));
        }
      });
      
      // 다양한 선택자 테스트
      const testSelectors = [
        '.proUl',
        'ul.proUl',
        '.proUl > li',
        '[data-product-cd]',
        '.product_name',
        '.series_name',
        '.price',
        'img[src*="upload"]',
        'img[src*="product"]',
        'a[href*="product"]',
        'div[class*="product"]',
        'div[class*="item"]',
        'div[class*="goods"]'
      ];
      
      testSelectors.forEach(selector => {
        const count = document.querySelectorAll(selector).length;
        if (count > 0) {
          result.selectors[selector] = count;
        }
      });
      
      // data 속성 수집
      const elemsWithData = document.querySelectorAll('[data-product-cd], [data-product-id], [data-item-id]');
      elemsWithData.forEach((elem, i) => {
        if (i < 3) {  // 처음 3개만
          result.dataAttributes.push({
            tag: elem.tagName,
            attributes: Array.from(elem.attributes).map(attr => ({
              name: attr.name,
              value: attr.value.substring(0, 50)
            }))
          });
        }
      });
      
      return result;
    });
    
    // 스크린샷 저장
    await page.screenshot({ 
      path: 'debug-screenshot.png',
      fullPage: false  // 보이는 영역만
    });
    
    await browser.close();
    
    return NextResponse.json({
      success: true,
      analysis: fullAnalysis,
      networkResponses: responses.slice(0, 20)  // 처음 20개 네트워크 응답만
    });
    
  } catch (error) {
    if (browser) await browser.close();
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}