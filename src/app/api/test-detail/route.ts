import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the flatpoint JSON file with detail data
    const filePath = path.join(process.cwd(), 'data', '플랫포인트', 'flatpoint-패브릭소파.json');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const products = JSON.parse(fileContent);

    // Return the first product (which we just scraped)
    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found' },
        { status: 404 }
      );
    }

    const firstProduct = products[0];

    // Check if detail data exists
    if (!firstProduct.detailHTML) {
      return NextResponse.json(
        {
          error: 'Detail data not found. Please run the scraper first.',
          hint: 'Run: node scripts/flatpoint-detail-scraper.cjs'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(firstProduct);

  } catch (error) {
    console.error('Error reading product data:', error);
    return NextResponse.json(
      { error: 'Failed to load product data' },
      { status: 500 }
    );
  }
}
