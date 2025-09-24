// app/api/scrape/test/route.ts
import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function GET() {
  let browser = null;
  
  try {
    // 브라우저 실행 (창이 보이게)
    browser = await chromium.launch({
      headless: false,
      slowMo: 100,  // 동작을 느리게 해서 안정성 증가
    });
    
    const page = await browser.newPage();
    
    // 유저 에이전트 설정 (봇 감지 우회)
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    console.log('일룸 사이트 접속 시도...');
    
    // 일룸 침실 페이지로 이동
    await page.goto('https://www.iloom.com/product/list.do?categoryNo=1', {
      waitUntil: 'networkidle',
      timeout: 90000,  // 90초
    });
    
    console.log('페이지 로드 완료!');
    
    // 스크린샷 찍기 (디버깅용)
    await page.screenshot({ path: 'iloom-test.png' });
    
    // 간단한 제품 수 확인
    const productCount = await page.evaluate(() => {
      const images = document.querySelectorAll('img[src*="/upload/product/"]');
      return images.length;
    });
    
    await browser.close();
    
    return NextResponse.json({
      success: true,
      message: `테스트 성공! ${productCount}개의 제품 이미지 발견`,
      productCount
    });
    
  } catch (error) {
    if (browser) await browser.close();
    
    return NextResponse.json({
      success: false,
      message: '테스트 실패',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
}