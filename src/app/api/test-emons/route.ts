import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data', '에몬스');

    // Read all emons category files
    const categoryFiles = [
      'emons-소파.json',
      'emons-수납가구.json',
      'emons-식탁.json',
      'emons-중문.json',
      'emons-침대,매트리스.json',
      'emons-학생,서재.json'
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
    console.error('Error reading Emons products:', error);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}
