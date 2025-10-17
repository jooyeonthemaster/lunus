import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data', '알로소');

    // Read all alloso category files
    const categoryFiles = [
      'alloso-소파.json',
      'alloso-스토리지.json',
      'alloso-의자.json',
      'alloso-테이블.json'
    ];

    let allProducts: any[] = [];

    for (const file of categoryFiles) {
      const filePath = path.join(dataDir, file);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const products = JSON.parse(fileContent);
        allProducts = allProducts.concat(products);
      }
    }

    return NextResponse.json({ products: allProducts });
  } catch (error) {
    console.error('Error reading Alloso products:', error);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}
