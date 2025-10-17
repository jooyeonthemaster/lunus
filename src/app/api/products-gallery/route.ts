import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const categories = [
      'flatpoint-패브릭소파.json',
      'flatpoint-가죽소파.json',
      'flatpoint-체어.json',
      'flatpoint-조명&홈데코.json',
      'flatpoint-테이블.json',
      'flatpoint-선반.json',
      'flatpoint-DOB.json',
      'flatpoint-사이드테이블.json',
      'flatpoint-키즈.json',
      'flatpoint-침대&매트리스.json'
    ];

    let allProducts: any[] = [];

    for (const category of categories) {
      try {
        const filePath = path.join(process.cwd(), 'data', '플랫포인트', category);
        if (fs.existsSync(filePath)) {
          const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          allProducts = allProducts.concat(products);
        }
      } catch (err) {
        console.error(`Failed to load ${category}:`, err);
        // Continue loading other categories
      }
    }

    return NextResponse.json({
      success: true,
      total: allProducts.length,
      products: allProducts
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load products' },
      { status: 500 }
    );
  }
}
