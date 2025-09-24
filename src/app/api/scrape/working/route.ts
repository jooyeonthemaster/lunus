// app/api/scrape/working/route.ts
// 실제 작동하는 크롤러 - 안정 로직 기반

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

  const categoryNo = categoryMap[category] || categoryMap['침실'];
  const url = `https://www.iloom.com/product/list.do?categoryNo=${categoryNo}`;

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'ko-KR',
      viewport: { width: 1366, height: 2200 },
      extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' }
    });

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(90000);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    } catch {
      // 초기 로드 타임아웃은 무시하고 진행
    }

    await page.waitForTimeout(3000);

    try {
      await page.waitForSelector('a[href*="product/detail.do"], a[href*="product/view.do"]', {
        timeout: 8000
      });
    } catch {
      // 선택자 미발견 시에도 계속 진행
    }

    const rawProducts = await page.$$eval('a', (links) => {
      const items: Array<{ href: string; imageUrl: string; name: string; priceText: string }> = [];
      const seen = new Set<string>();

      links.forEach((link) => {
        const href = link.getAttribute('href') || '';
        if (href.includes('product/detail.do') || href.includes('product/view.do')) {
          const img = link.querySelector('img') as HTMLImageElement | null;
          if (img && !seen.has(href)) {
            seen.add(href);

            const container = link.closest('li,div,article');
            const priceText = (container?.textContent || '').trim();
            const title =
              container?.querySelector('.product_name, h3, h4')?.textContent?.trim() || img.alt || 'Unknown Product';

            items.push({
              href,
              imageUrl: (img.src || img.getAttribute('data-src') || '').toString(),
              name: title,
              priceText
            });
          }
        }
      });

      return items;
    });

    const cleanedProducts: Product[] = rawProducts
      .map((p) => {
        const productUrl = p.href.startsWith('http')
          ? p.href
          : `https://www.iloom.com${p.href.startsWith('/') ? '' : '/'}${p.href}`;

        const priceMatch = p.priceText.match(/(\d{1,3}(?:[\.,]\d{3})+|\d+)\s*(원|KRW|₩)/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/[^0-9]/g, ''), 10) : 0;

        return {
          name: p.name,
          imageUrl: p.imageUrl,
          price,
          priceText: priceMatch ? priceMatch[0] : '가격 정보 없음',
          category,
          brand: '일룸',
          productUrl
        } as Product;
      })
      .filter((p) => p.imageUrl);

    if (cleanedProducts.length > 0) {
      const { error } = await supabase
        .from('products')
        .upsert(cleanedProducts as any, { onConflict: 'imageUrl', ignoreDuplicates: false });
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
    return NextResponse.json(
      {
        success: false,
        message: '크롤링 실패',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}