// app/api/scrape/stable/route.ts
// 안정적인 크롤러 - iloom-playwright.cjs의 검증된 로직 사용

import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || '침실';
  
  const categories: Record<string, string> = {
    '침실': 'https://www.iloom.com/product/list.do?categoryNo=1',
    '거실': 'https://www.iloom.com/product/list.do?categoryNo=3',
    '주방': 'https://www.iloom.com/product/list.do?categoryNo=4',
    '서재': 'https://www.iloom.com/product/list.do?categoryNo=7',
    '아이방': 'https://www.iloom.com/product/list.do?categoryNo=5',
  };
  
  const url = categories[category] || categories['침실'];
  
  const browser = await chromium.launch({
    headless: true,  // 프로덕션에서는 true 권장
  });  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'ko-KR',
      viewport: { width: 1366, height: 2200 },
      extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' }
    });
    
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(90000);
    
    console.log(`크롤링 시작: ${url}`);
    
    // 페이지 이동
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    } catch (e) {
      console.log('초기 로드 타임아웃, 계속 진행');
    }
    
    // 네트워크 안정화 대기
    await page.waitForTimeout(3000);
    
    // 제품 링크 대기
    try { 
      await page.waitForSelector('a[href*="product/detail.do"]', { timeout: 8000 }); 
    } catch {
      console.log('제품 상세 링크를 찾지 못함, 다른 선택자 시도');
    }    
    // 제품 정보 추출
    const products = await page.$$eval('a', (links) => {
      const items: any[] = [];
      const seen = new Set();
      
      links.forEach((link) => {
        // 제품 상세 페이지 링크 필터링
        const href = link.getAttribute('href') || '';
        if (href.includes('product/detail.do') || href.includes('product/view.do')) {
          const img = link.querySelector('img');
          if (img && !seen.has(href)) {
            seen.add(href);
            
            const container = link.closest('li,div,article');
            const priceText = container?.textContent || '';
            const title = container?.querySelector('.product_name, h3, h4')?.textContent?.trim() || 
                         img.alt || 
                         'Unknown Product';
            
            items.push({
              href: href,
              imageUrl: img.src || img.getAttribute('data-src') || '',
              name: title,
              priceText: priceText
            });
          }
        }
      });
      
      return items;
    });    
    console.log(`${products.length}개 제품 발견`);
    
    // 데이터 정제
    const cleanedProducts = products.map((product) => {
      // URL 절대경로 변환
      const productUrl = product.href.startsWith('http') 
        ? product.href 
        : `https://www.iloom.com${product.href.startsWith('/') ? '' : '/'}${product.href}`;
      
      // 가격 파싱
      const priceMatch = product.priceText.match(/(\d{1,3}(?:[\.,]\d{3})+|\d+)\s*(원|KRW|₩)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/[^0-9]/g, ''), 10) : 0;
      
      return {
        name: product.name,
        imageUrl: product.imageUrl,
        price: price,
        priceText: priceMatch ? priceMatch[0] : '가격 정보 없음',
        category: category,
        brand: '일룸',
        productUrl: productUrl
      };
    }).filter(p => p.imageUrl); // 이미지가 있는 제품만
    
    // Supabase 저장
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
    
    await context.close();
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