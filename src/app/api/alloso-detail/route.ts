import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const productId = searchParams.get('productId');

  if (!productId) {
    return NextResponse.json(
      { success: false, error: 'Product ID is required' },
      { status: 400 }
    );
  }

  try {
    const dataDir = path.join(process.cwd(), 'data', '알로소');
    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('alloso-') && f.endsWith('.json'));

    // Search through all category files
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const products = JSON.parse(fileContent);

      // Find product by productId
      const product = products.find((p: any) => {
        const match = p.productUrl?.match(/productCd=([^&]+)/);
        return match && match[1] === productId;
      });

      if (product) {
        console.log('✅ Found product:', product.title);
        console.log('📄 Has detailHTML:', !!product.detailHTML, 'length:', product.detailHTML?.length || 0);
        
        // 후처리: "OUR BELIEF." 이후 모든 내용 제거
        if (product.detailHTML) {
          const ourBeliefIndex = product.detailHTML.indexOf('OUR');
          const beliefIndex = product.detailHTML.indexOf('BELIEF');
          
          if (ourBeliefIndex !== -1 && beliefIndex !== -1 && beliefIndex > ourBeliefIndex) {
            // OUR BELIEF 섹션의 col_wrap 시작 지점 찾기
            const beforeBelief = product.detailHTML.substring(0, ourBeliefIndex);
            const lastColWrapStart = beforeBelief.lastIndexOf('<div class="col_wrap"');
            
            if (lastColWrapStart !== -1) {
              // 해당 col_wrap 이전까지만 자르기
              product.detailHTML = product.detailHTML.substring(0, lastColWrapStart);
              console.log('✂️ Cut after OUR BELIEF, new length:', product.detailHTML.length);
            }
          }
        }
        
        return NextResponse.json({
          success: true,
          product: product
        });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Product not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error reading alloso product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read product' },
      { status: 500 }
    );
  }
}

