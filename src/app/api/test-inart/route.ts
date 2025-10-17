import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'data', '인아트', 'inart-소파.json');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const products = JSON.parse(fileContent);

    return NextResponse.json({
      success: true,
      total: products.length,
      products: products
    });
  } catch (error) {
    console.error('Error loading Inart products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load products' },
      { status: 500 }
    );
  }
}
