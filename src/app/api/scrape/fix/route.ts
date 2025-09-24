// app/api/scrape/fix/route.ts
// 수정된 버전 - 더 강력한 크롤링 로직

import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Product {
  name: string;
  imageUrl: string;
  price: number;
  priceText: string;
  category: string;
  brand: string;
  productUrl: string;
  productCode?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || '침실';
  
  const categoryMap: Record<string, string> = {
    '침실': '1',
    '거실': '2',
    '주방': '3',
    '서재': '4', 
    '아이방': '5'
  };  
  const categoryNo = categoryMap[category] || '1';
  const browser = await chromium.launch({
    headless: false,  // 디버깅용
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'ko-KR'
    });
    
    const page = await context.newPage();
    
    // Anti-bot detection
    await page.addInitScript(() => {
      // @ts-ignore
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    const url = `https://www.iloom.com/product/list.do?categoryNo=${categoryNo}`;
    console.log(`크롤링 시작: ${url}`);
    
    // 페이지 로드 - 여러 방법 시도
    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });    } catch (e) {
      console.log('networkidle 타임아웃, domcontentloaded로 재시도');
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    }
    
    // 페이지 로드 후 충분한 대기
    console.log('페이지 로드 완료, JavaScript 실행 대기 중...');
    await page.waitForTimeout(10000);
    
    // 스크롤로 lazy loading 트리거
    console.log('스크롤로 lazy loading 트리거...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 3 * (i + 1));
      });
      await page.waitForTimeout(2000);
    }
    
    // 맨 위로 다시 스크롤
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);
    
    // 제품 정보 추출 - 여러 방법 시도
    const products = await page.evaluate(() => {
      const productList: any[] = [];
      console.log('제품 추출 시작...');
      
      // 방법 1: proUl 시도
      const ulElements = document.querySelectorAll('ul.proUl, ul[class*="pro"], ul[class*="product"]');
      console.log(`ul elements found: ${ulElements.length}`);
      
      ulElements.forEach((ul) => {
        const items = ul.querySelectorAll('li');
        items.forEach((item) => {
          try {
            const productCode = item.getAttribute('data-product-cd') || '';
            const img = item.querySelector('img');
            const link = item.querySelector('a');
            const nameElem = item.querySelector('.product_name, [class*="name"], h3, h4');
            const priceElem = item.querySelector('.price, [class*="price"]');
            
            if (img) {
              const imageUrl = img.src || img.getAttribute('data-src') || '';
              const name = nameElem?.textContent?.trim() || img.alt || 'Unknown';
              const priceText = priceElem?.textContent?.trim() || '';
              const href = link?.href || '';
              
              productList.push({
                productCode,
                imageUrl,
                name,
                priceText,
                productUrl: href
              });
            }
          } catch (e) {
            console.error('Item parsing error:', e);
          }
        });
      });      
      // 방법 2: 이미지 기반 추출 (백업)
      if (productList.length === 0) {
        console.log('proUl을 찾지 못함, 이미지 기반 추출 시도');
        const allImages = document.querySelectorAll('img');
        console.log(`Total images found: ${allImages.length}`);
        
        allImages.forEach((img, index) => {
          const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
          
          // 제품 이미지 패턴 확인
          if (src && (src.includes('/upload/product/') || 
                     src.includes('/goods/') || 
                     src.includes('/item/') ||
                     src.includes('cdn') && src.includes('.jpg'))) {
            
            // 부모 요소에서 정보 추출
            let parent = img.parentElement;
            let depth = 0;
            let productInfo = {
              imageUrl: src,
              name: img.alt || `일룸 제품 ${index + 1}`,
              priceText: '',
              productUrl: ''
            };
            
            // 최대 10레벨까지 부모 탐색
            while (parent && depth < 10) {
              // 링크 찾기
              const link = parent.tagName === 'A' ? parent : parent.querySelector('a');              if (link && !productInfo.productUrl) {
                productInfo.productUrl = (link as HTMLAnchorElement).href;
              }
              
              // 가격 찾기
              const texts = parent.querySelectorAll('*');
              texts.forEach((elem) => {
                const text = elem.textContent?.trim() || '';
                if (text.includes('원') && /[\d,]+/.test(text) && !productInfo.priceText) {
                  productInfo.priceText = text;
                }
                // 제품명 개선
                if (text && text.length > 5 && text.length < 100 && !text.includes('원')) {
                  if (productInfo.name === img.alt || productInfo.name.startsWith('일룸 제품')) {
                    productInfo.name = text;
                  }
                }
              });
              
              parent = parent.parentElement;
              depth++;
            }
            
            if (productInfo.imageUrl) {
              productList.push(productInfo);
            }
          }
        });
      }
      
      console.log(`최종 수집된 제품: ${productList.length}개`);
      return productList;
    });    
    console.log(`${products.length}개 제품 발견`);
    
    // 데이터 정리
    const cleanedProducts: Product[] = products
      .filter((p, index, self) => 
        index === self.findIndex(t => t.imageUrl === p.imageUrl)
      )
      .map((product) => {
        const priceText = product.priceText || '가격 정보 없음';
        const priceNumber = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
        
        // URL 정리
        let productUrl = product.productUrl || '';
        if (productUrl && !productUrl.startsWith('http')) {
          productUrl = 'https://www.iloom.com' + (productUrl.startsWith('/') ? '' : '/') + productUrl;
        }
        if (!productUrl) {
          productUrl = url;
        }
        
        return {
          name: product.name || '일룸 제품',
          imageUrl: product.imageUrl,
          price: priceNumber,
          priceText: priceText,
          category: category,
          brand: '일룸',
          productUrl: productUrl,
          productCode: product.productCode
        };
      });
    
    // Supabase에 저장
    if (cleanedProducts.length > 0) {
      const { error } = await supabase
        .from('products')
        .upsert(cleanedProducts, {
          onConflict: 'imageUrl',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Supabase 저장 오류:', error);
      }
    }
    
    await browser.close();
    
    return NextResponse.json({
      success: true,
      message: `${cleanedProducts.length}개 제품 크롤링 완료`,
      products: cleanedProducts
    });
    
  } catch (error) {
    await browser.close();
    console.error('크롤링 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '크롤링 실패',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}