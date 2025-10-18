import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category') || 'alloso-소파.json';

  try {
    console.log('📦 API: Loading', category);
    const filePath = path.join(process.cwd(), 'data', '알로소', category);
    
    console.log('📂 Full path:', filePath);
    console.log('📂 Path exists:', fs.existsSync(filePath));
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      return NextResponse.json(
        { success: false, error: 'File not found: ' + filePath },
        { status: 404 }
      );
    }

    console.log('📄 Reading file...');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    console.log('📏 File size:', fileContent.length, 'bytes');
    
    console.log('🔄 Parsing JSON...');
    let products;
    try {
      products = JSON.parse(fileContent);
    } catch (parseError: any) {
      console.error('❌ JSON Parse error:', parseError.message);
      return NextResponse.json(
        { success: false, error: 'JSON parse failed: ' + parseError.message },
        { status: 500 }
      );
    }
    
    console.log('✅ Parsed', products.length, 'products');

    // 메모리 효율을 위해 필요한 필드만 전송
    console.log('🔄 Optimizing products...');
    const optimizedProducts = products.map((p: any) => ({
      title: p.title || '',
      price: p.price || 0,
      productUrl: p.productUrl || '',
      imageUrl: p.imageUrl || '',
      detailImages: p.detailImages ? p.detailImages.slice(0, 3) : []
    }));

    console.log('✅ Returning', optimizedProducts.length, 'products');

    return NextResponse.json({
      success: true,
      products: optimizedProducts,
      count: optimizedProducts.length
    });
  } catch (error: any) {
    console.error('❌ Error reading alloso products:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { success: false, error: 'Failed to read products: ' + error.message },
      { status: 500 }
    );
  }
}

