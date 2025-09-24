// app/api/scrape/debug/route.ts
import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function GET() {
  let browser = null;
  
  try {
    browser = await chromium.launch({
      headless: false,  // 브라우저 보이게
    });
    
    const page = await browser.newPage();
    
    console.log('일룸 페이지 접속 중...');
    
    // 페이지 이동
    try {
      await page.goto('https://www.iloom.com/product/list.do?categoryNo=1', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    } catch (e) {
      console.log('타임아웃 무시하고 진행');
    }
    
    // 잠시 대기
    await page.waitForTimeout(5000);
    
    // 페이지 분석
    const analysis = await page.evaluate(() => {
      const result: any = {        totalImages: 0,
        productImages: [],
        imagePatterns: {}
      };
      
      // 모든 이미지 분석
      const allImages = document.querySelectorAll('img');
      result.totalImages = allImages.length;
      
      // 각 이미지 패턴 확인
      allImages.forEach((img: HTMLImageElement, index) => {
        if (!img.src) return;
        
        // src 분석
        if (img.src.includes('product')) {
          result.productImages.push({
            index,
            src: img.src,
            alt: img.alt,
            className: img.className,
            parentTag: img.parentElement?.tagName,
            parentClass: img.parentElement?.className
          });
        }
      });
      
      // 다양한 선택자 테스트
      const selectors = [
        '.goods-list img',
        '.product-list img',        '.prd-list img',
        'li img',
        'ul img',
        'div[class*="product"] img',
        'div[class*="goods"] img',
        'div[class*="prd"] img',
        'a img',
        'img[alt*="일룸"]'
      ];
      
      selectors.forEach(selector => {
        const found = document.querySelectorAll(selector).length;
        if (found > 0) {
          result.imagePatterns[selector] = found;
        }
      });
      
      // 첫 번째 찾은 제품 이미지 정보 자세히
      const firstProduct = document.querySelector('li img');
      if (firstProduct) {
        result.firstProductDetail = {
          src: (firstProduct as HTMLImageElement).src,
          alt: (firstProduct as HTMLImageElement).alt,
          outerHTML: firstProduct.outerHTML.substring(0, 200)
        };
      }
      
      return result;
    });
        
    await browser.close();
    
    return NextResponse.json({
      success: true,
      analysis
    });
    
  } catch (error) {
    if (browser) await browser.close();
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}