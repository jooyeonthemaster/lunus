import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // scraped-products 폴더 경로
    const scrapedDir = path.join(process.cwd(), 'data', 'hanssem', 'scraped-products');

    // 모든 JSON 파일 읽기
    const files = fs.readdirSync(scrapedDir).filter(file => file.endsWith('.json'));

    // 각 파일의 데이터 로드
    const products = files.map(file => {
      const filePath = path.join(scrapedDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent);
    });

    // 가격순 정렬 (가격이 없는 것은 맨 뒤로)
    products.sort((a, b) => {
      const priceA = typeof a.price === 'number' ? a.price : 0;
      const priceB = typeof b.price === 'number' ? b.price : 0;
      return priceA - priceB;
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('한샘 제품 로드 에러:', error);
    return NextResponse.json({ error: '제품을 불러올 수 없습니다' }, { status: 500 });
  }
}
