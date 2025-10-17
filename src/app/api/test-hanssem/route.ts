import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'data', '한샘', 'hanssem-침실.json');
    const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    return NextResponse.json({
      success: true,
      total: products.length,
      products: products
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load Hanssem products' },
      { status: 500 }
    );
  }
}