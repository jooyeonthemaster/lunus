// app/api/scrape/test-simple/route.ts
// 가장 단순한 테스트 - 일룸 사이트가 접속 가능한지 확인

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. 먼저 일반 fetch로 시도
    console.log('일반 fetch로 일룸 사이트 접속 시도...');
    const response = await fetch('https://www.iloom.com/product/list.do?categoryNo=1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      }
    });
    
    const html = await response.text();
    
    // HTML 분석
    const analysis = {
      statusCode: response.status,
      htmlLength: html.length,
      hasTitle: html.includes('<title>'),
      hasBody: html.includes('<body'),
      hasImages: (html.match(/<img/g) || []).length,
      hasProduct: html.includes('product'),
      hasProUl: html.includes('proUl'),
      hasDataProductCd: html.includes('data-product-cd'),
      first500Chars: html.substring(0, 500),
      imageUrls: [] as string[]
    };
    
    // 이미지 URL 추출 (정규식)
    const imgRegex = /src=["']([^"']*(?:product|upload)[^"']*\.(?:jpg|jpeg|png|gif))/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null && analysis.imageUrls.length < 10) {
      analysis.imageUrls.push(match[1]);
    }
    
    return NextResponse.json({
      success: true,
      message: `일룸 페이지 접속 성공! HTML 길이: ${html.length}자`,
      analysis
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: '일룸 사이트 접속 실패',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}