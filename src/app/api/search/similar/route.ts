// ============================================
// LUNUS 유사 이미지 검색 API
// ============================================
// POST /api/search/similar
//   - 이미지 업로드 → 유사 제품 검색
// 
// GET /api/search/similar?productId=123
//   - 제품 ID → 유사 제품 검색
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 최대 30초

// ============================================
// Supabase & Replicate 클라이언트 초기화
// ============================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

let replicate: Replicate | null = null;

// Replicate 클라이언트 초기화 (lazy loading)
function getReplicateClient() {
  if (!replicate) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error('REPLICATE_API_TOKEN not configured');
    }
    replicate = new Replicate({ auth: token });
  }
  return replicate;
}

// ============================================
// 이미지 벡터화 함수
// ============================================
async function vectorizeImage(imageInput: string | Buffer, isUrl: boolean = false): Promise<number[] | null> {
  try {
    const client = getReplicateClient();

    // URL이면 그대로 사용, 아니면 buffer를 data URL로 변환
    let finalInput: string;
    if (isUrl) {
      finalInput = imageInput as string;
    } else if (Buffer.isBuffer(imageInput)) {
      const base64 = imageInput.toString('base64');
      finalInput = `data:image/jpeg;base64,${base64}`;
    } else {
      finalInput = imageInput as string;
    }

    console.log('🔗 Input:', isUrl ? 'URL' : 'Data URL', finalInput.substring(0, 80) + '...');

    const output = await client.run(
      "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
      {
        input: {
          inputs: finalInput  // ⚠️ 문자열로 전달 (스크립트와 동일)
        }
      }
    ) as any;
    
    console.log('📦 Replicate 응답 타입:', typeof output);
    console.log('📦 배열 여부:', Array.isArray(output));
    
    // Replicate CLIP은 [{embedding: [...], input: "..."}] 형식으로 반환
    let embedding: number[] | null = null;
    
    if (Array.isArray(output) && output.length > 0) {
      const firstResult = output[0];
      if (firstResult && Array.isArray(firstResult.embedding)) {
        embedding = firstResult.embedding;
      }
    } else if (Array.isArray(output) && output.length === 768) {
      embedding = output;
    }
    
    // 벡터 검증 (768차원)
    if (!embedding || embedding.length !== 768) {
      console.error('Invalid embedding format. Expected 768 dimensions, got:', embedding?.length);
      return null;
    }
    
    console.log('✅ 벡터 추출 성공:', embedding.length, '차원');
    return embedding;
  } catch (error: any) {
    console.error('Vectorization error:', error);
    throw error;
  }
}

// ============================================
// POST: 이미지 업로드 → 유사 제품 검색
// ============================================
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('📸 Image upload received');
    
    // FormData에서 이미지 추출
    const formData = await request.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No image provided',
          message: '이미지 파일을 업로드해주세요.'
        },
        { status: 400 }
      );
    }
    
    console.log(`📝 Image info: ${image.name} (${image.type}, ${(image.size / 1024).toFixed(1)}KB)`);
    
    // 이미지 크기 제한 (10MB)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Image too large',
          message: '이미지 크기는 10MB 이하여야 합니다.'
        },
        { status: 400 }
      );
    }
    
    // 이미지를 Supabase Storage에 임시 업로드
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 임시 파일명 생성
    const tempFileName = `temp/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    console.log('📤 Uploading to Supabase Storage...');
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(tempFileName, buffer, {
        contentType: image.type,
        upsert: false
      });

    if (uploadError) {
      console.error('⚠️ Storage upload failed:', uploadError.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Upload failed',
          message: '이미지 업로드에 실패했습니다.'
        },
        { status: 500 }
      );
    }

    // Public URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(tempFileName);

    console.log('✅ Image uploaded:', publicUrl);
    console.log('🔄 Vectorizing image with URL...');
    const vectorizeStart = Date.now();

    // URL로 벡터화 (스크립트와 동일한 방식)
    const embedding = await vectorizeImage(publicUrl, true);

    // 벡터화 완료 후 임시 파일 삭제 (5초 후)
    setTimeout(async () => {
      try {
        await supabase.storage.from('product-images').remove([tempFileName]);
        console.log('🗑️ Temp file deleted:', tempFileName);
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
    }, 5000);
    
    if (!embedding) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Vectorization failed',
          message: '이미지 분석에 실패했습니다. 다시 시도해주세요.'
        },
        { status: 500 }
      );
    }
    
    const vectorizeTime = Date.now() - vectorizeStart;
    console.log(`✅ Vectorization complete (${vectorizeTime}ms)`);
    
    console.log('🔍 Searching similar products...');
    const searchStart = Date.now();
    
    // pgvector로 유사 제품 검색 (배열 그대로 전달)
    console.log('📦 검색 벡터 차원:', embedding.length);
    console.log('📦 벡터 첫 5개 값:', embedding.slice(0, 5));

    const { data: products, error } = await supabase.rpc('match_products_by_image', {
      query_embedding: embedding,  // 배열 그대로!
      match_threshold: 0.1,  // 10%로 낮춤 (테스트용)
      match_count: 30        // 상위 30개
    });

    console.log('🔍 Supabase 응답:', { hasError: !!error, productsType: typeof products, productsLength: products?.length });

    if (error) {
      console.error('Supabase RPC error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Search failed',
          message: '검색 중 오류가 발생했습니다.',
          details: error.message
        },
        { status: 500 }
      );
    }
    
    const searchTime = Date.now() - searchStart;
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Search complete (${searchTime}ms)`);
    console.log(`📊 Found ${products?.length || 0} similar products`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    
    // 디버깅: 상위 3개 결과 출력
    if (products && products.length > 0) {
      console.log('\n📋 상위 3개 결과:');
      products.slice(0, 3).forEach((p: any, i: number) => {
        console.log(`  ${i+1}. ${p.title} - ${p.category} (유사도: ${(p.similarity * 100).toFixed(1)}%)`);
      });
      console.log('');
    }
    
    return NextResponse.json({
      success: true,
      products: products || [],
      count: products?.length || 0,
      timing: {
        vectorize: vectorizeTime,
        search: searchTime,
        total: totalTime
      }
    });
    
  } catch (error: any) {
    console.error('❌ Search error:', error);
    
    // Rate limit 에러
    if (error.message && error.message.includes('rate limit')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Rate limit exceeded',
          message: '잠시 후 다시 시도해주세요. (API 호출 한도 초과)'
        },
        { status: 429 }
      );
    }
    
    // REPLICATE_API_TOKEN 미설정
    if (error.message && error.message.includes('REPLICATE_API_TOKEN')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Configuration error',
          message: 'Replicate API가 설정되지 않았습니다. 관리자에게 문의하세요.'
        },
        { status: 500 }
      );
    }
    
    // 기타 에러
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: '서버 오류가 발생했습니다.',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET: 제품 ID → 유사 제품 검색
// ============================================
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    
    if (!productId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No productId provided',
          message: '제품 ID가 필요합니다.'
        },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Finding similar products for ID: ${productId}`);
    
    // 해당 제품의 벡터 가져오기
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, brand, image_embedding')
      .eq('id', productId)
      .single();
    
    if (productError || !product) {
      console.error('Product not found:', productError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Product not found',
          message: '제품을 찾을 수 없습니다.'
        },
        { status: 404 }
      );
    }
    
    if (!product.image_embedding) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Product not vectorized',
          message: '이 제품은 아직 벡터화되지 않았습니다. 잠시 후 다시 시도해주세요.'
        },
        { status: 404 }
      );
    }
    
    console.log(`✅ Product found: ${product.name} (${product.brand})`);
    console.log('🔍 Searching similar products...');
    
    // 유사 제품 검색
    const { data: products, error } = await supabase.rpc('match_products_by_image', {
      query_embedding: product.image_embedding,  // 이미 벡터 형식으로 저장되어 있음
      match_threshold: 0.5,  // 50% 이상 유사도
      match_count: 21        // 원본 포함 21개
    });
    
    if (error) {
      console.error('Supabase RPC error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Search failed',
          message: '검색 중 오류가 발생했습니다.'
        },
        { status: 500 }
      );
    }
    
    // 원본 제품 제외
    const filtered = (products || []).filter(
      (p: any) => p.id !== parseInt(productId)
    );
    
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Found ${filtered.length} similar products`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    
    return NextResponse.json({
      success: true,
      products: filtered.slice(0, 20),
      count: filtered.length,
      timing: {
        total: totalTime
      }
    });
    
  } catch (error: any) {
    console.error('❌ Search error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: '서버 오류가 발생했습니다.',
        details: error.message
      },
      { status: 500 }
    );
  }
}

