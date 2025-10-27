import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'data', '알로소', 'alloso-소파.json');
    
    // 1. Check file exists
    const exists = fs.existsSync(filePath);
    console.log('File exists:', exists);
    
    if (!exists) {
      return NextResponse.json({ 
        success: false, 
        error: 'File not found',
        path: filePath 
      });
    }

    // 2. Read file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    console.log('File size:', fileContent.length);

    // 3. Parse JSON
    const products = JSON.parse(fileContent);
    console.log('Products count:', products.length);

    // 4. Return ONLY first 5 products (test)
    const testProducts = products.slice(0, 5).map((p: any) => ({
      title: p.title,
      price: p.price,
      productUrl: p.productUrl,
      imageUrl: p.imageUrl
    }));

    return NextResponse.json({
      success: true,
      message: 'Test successful',
      totalProducts: products.length,
      returnedProducts: testProducts.length,
      products: testProducts
    });

  } catch (error: any) {
    console.error('Test API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}





