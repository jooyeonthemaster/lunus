// app/api/scrape/link-test/route.ts
import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function GET() {
  let browser = null;
  
  try {
    browser = await chromium.launch({
      headless: false,
    });
    
    const page = await browser.newPage();
    
    // 일룸 침실 페이지
    await page.goto('https://www.iloom.com/product/list.do?categoryNo=1', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    }).catch(() => console.log('타임아웃 무시'));
    
    await page.waitForTimeout(5000);
    
    // 링크 구조 분석
    const linkAnalysis = await page.evaluate(() => {
      const result: any = {
        totalLinks: 0,
        productLinks: [],
        linkPatterns: [],
        firstFiveLinks: []
      };
      
      // 모든 a 태그 찾기
      const allLinks = document.querySelectorAll('a');
      result.totalLinks = allLinks.length;
      
      // 처음 20개 링크 분석
      allLinks.forEach((link, index) => {
        if (index < 20) {
          const href = link.getAttribute('href') || '';
          const onclick = link.getAttribute('onclick') || '';
          const img = link.querySelector('img');
          
          const linkInfo = {
            index,
            href: href.substring(0, 100),
            onclick: onclick.substring(0, 100),
            hasImage: !!img,
            imageAlt: img ? (img as HTMLImageElement).alt : '',
            text: link.textContent?.trim().substring(0, 50)
          };
          
          result.firstFiveLinks.push(linkInfo);
          
          // 제품 링크 패턴 찾기
          if (href.includes('product') || onclick.includes('product') || onclick.includes('Detail')) {
            result.productLinks.push(linkInfo);
          }
        }
      });
      
      // 제품 영역 찾기
      const productContainers = [        document.querySelector('.goods-list'),
        document.querySelector('.product-list'),
        document.querySelector('ul'),
        document.querySelector('[class*="list"]')
      ];
      
      productContainers.forEach((container, idx) => {
        if (container) {
          const links = container.querySelectorAll('a');
          if (links.length > 0) {
            const firstLink = links[0];
            result.linkPatterns.push({
              containerIndex: idx,
              containerClass: container.className,
              linksCount: links.length,
              firstLinkHref: firstLink.getAttribute('href'),
              firstLinkOnclick: firstLink.getAttribute('onclick')
            });
          }
        }
      });
      
      return result;
    });
    
    await browser.close();
    
    return NextResponse.json({
      success: true,
      linkAnalysis    });
    
  } catch (error) {
    if (browser) await browser.close();
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}