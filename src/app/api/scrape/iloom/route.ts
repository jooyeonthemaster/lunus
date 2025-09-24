// app/api/scrape/iloom/route.ts - 완벽 수정 버전
import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_SERVICE_KEY 
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
  seriesName?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || '침실';
  
  let categoryNo = '1';
  
  const categoryMap: Record<string, string> = {
    '침실': '1',
    '거실': '2',
    '주방': '3',
    '서재': '4',
    '아이방': '5'
  };
  
  if (category in categoryMap) {
    categoryNo = categoryMap[category];
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'ko-KR',
      viewport: { width: 1366, height: 2200 },
      extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
    });
    const page = await context.newPage();
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'image' || type === 'font' || type === 'media') {
        return route.abort();
      }
      return route.continue();
    });
    const url = `https://www.iloom.com/product/list.do?categoryNo=${categoryNo}`;
    
    console.log(`크롤링 시작: ${url}`);
    
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 90000,
      });
    } catch (e) {
      console.log('페이지 로딩 타임아웃 - 계속 진행');
    }

    // 제품이 로드될 때까지 명확한 선택자 기반 대기
    try {
      await page.waitForSelector('a[href*="product/detail.do"], ul.proUl > li', { timeout: 60000 });
    } catch {}
    // 추가 지터 대기
    await page.waitForTimeout(1200 + Math.floor(Math.random() * 600));

    // 제품 정보 추출 - 일룸 사이트 구조에 맞춤
    const products = await page.evaluate(() => {
      const productList: any[] = [];
      
      // ul.proUl > li 선택자로 제품 찾기
      const productItems = document.querySelectorAll('ul.proUl > li');
      
      console.log(`제품 li 태그 ${productItems.length}개 발견`);
      
      productItems.forEach((item, index) => {
        try {
          // 제품 코드 (data-product-cd)
          const productCode = item.getAttribute('data-product-cd') || '';
          
          // 이미지
          const img = item.querySelector('img');
          const imageUrl = img ? (img as HTMLImageElement).src : '';
          const altText = img ? (img as HTMLImageElement).alt : '';
          
          // 시리즈명
          const seriesElem = item.querySelector('.series_name');
          const seriesName = seriesElem ? seriesElem.textContent?.trim() : '';
          
          // 제품명
          const nameElem = item.querySelector('.product_name');
          const productName = nameElem ? nameElem.textContent?.trim() : '';
          
          // 가격
          const priceElem = item.querySelector('.price');
          const priceText = priceElem ? priceElem.textContent?.trim() : '';
          
          // 제품 상세 URL 생성 (제품 코드 사용)
          const productUrl = productCode 
            ? `https://www.iloom.com/product/view.do?productCd=${productCode}`
            : '';
          
          // 전체 제품명 조합
          const fullName = seriesName && productName 
            ? `일룸 ${seriesName} ${productName}`
            : altText || `일룸 제품 ${index + 1}`;
          
          if (imageUrl) {
            productList.push({
              productCode,
              imageUrl,
              name: fullName,
              seriesName,
              productName,
              price: priceText,
              productUrl
            });
          }
        } catch (error) {
          console.error(`제품 ${index} 파싱 오류:`, error);
        }
      });
      
      // 백업: proUl이 없을 경우 다른 방법 시도
      if (productList.length === 0) {
        console.log('proUl을 찾지 못함, 대체 방법 시도');
        
        // data-product-cd 속성이 있는 모든 요소 찾기
        const elementsWithProductCode = document.querySelectorAll('[data-product-cd]');
        
        elementsWithProductCode.forEach((elem) => {
          const productCode = elem.getAttribute('data-product-cd');
          const img = elem.querySelector('img');
          
          if (productCode && img) {
            productList.push({
              productCode,
              imageUrl: (img as HTMLImageElement).src,
              name: (img as HTMLImageElement).alt || `일룸 제품`,
              price: '가격 정보 없음',
              productUrl: `https://www.iloom.com/product/view.do?productCd=${productCode}`
            });
          }
        });
      }
      
      console.log(`최종 수집된 제품: ${productList.length}개`);
      return productList;
    });

    console.log(`${products.length}개 제품 발견`);

    // 데이터 정리
    const cleanedProducts: Product[] = products.map((product) => {
      const priceText = product.price || '가격 정보 없음';
      const priceNumber = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
      
      return {
        name: product.name,
        imageUrl: product.imageUrl,
        price: priceNumber,
        priceText: priceText,
        category: category,
        brand: '일룸',
        productUrl: product.productUrl,
        productCode: product.productCode,
        seriesName: product.seriesName
      };
    });

    // Supabase에 저장
    if (cleanedProducts.length > 0) {
      const { data, error } = await supabase
        .from('products')
        .upsert(cleanedProducts, {
          onConflict: 'imageUrl',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Supabase 저장 오류:', error);
        return NextResponse.json({
          success: false,
          message: 'Supabase 저장 실패',
          error: error.message,
          products: cleanedProducts
        }, { status: 500 });
      }
    }

    await context.close();
    await browser.close();

    return NextResponse.json({
      success: true,
      message: `${cleanedProducts.length}개 제품 크롤링 및 저장 완료`,
      products: cleanedProducts
    });

  } catch (error) {
    try { await browser.close(); } catch {}
    console.error('크롤링 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '크롤링 실패',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

// POST 요청으로 모든 카테고리 크롤링
export async function POST(request: Request) {
  const categories = ['침실', '거실', '주방', '서재', '아이방'];
  const results = [];
  
  for (const category of categories) {
    const response = await GET(new Request(`${request.url}?category=${category}`));
    const data = await response.json();
    results.push({
      category,
      ...data
    });
  }
  
  return NextResponse.json({
    success: true,
    message: '모든 카테고리 크롤링 완료',
    results
  });
}