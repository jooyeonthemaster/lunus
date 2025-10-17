import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const variant = searchParams.get('variant') || '1'; // 1, 2, or 3

    const filePath = path.join(process.cwd(), 'data', '플랫포인트', 'flatpoint-패브릭소파.json');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const products = JSON.parse(fileContent);

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found' },
        { status: 404 }
      );
    }

    const firstProduct = products[0];

    // Return product with variant info
    return NextResponse.json({
      ...firstProduct,
      variant: variant
    });

  } catch (error) {
    console.error('Error reading product data:', error);
    return NextResponse.json(
      { error: 'Failed to load product data' },
      { status: 500 }
    );
  }
}
