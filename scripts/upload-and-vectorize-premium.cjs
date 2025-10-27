#!/usr/bin/env node

/**
 * 프리미엄 브랜드 제품을 Supabase에 업로드하고 벡터화
 *
 * 실행: node scripts/upload-and-vectorize-premium.cjs
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Replicate = require('replicate');
const fs = require('fs');
const path = require('path');

// 환경변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const replicateToken = process.env.REPLICATE_API_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수 없음');
  process.exit(1);
}

if (!replicateToken) {
  console.error('❌ REPLICATE_API_TOKEN 환경변수 없음');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const replicate = new Replicate({ auth: replicateToken });

// 프리미엄 브랜드 목록
const PREMIUM_BRANDS = ['알로소', '에몬스', '우아미', '인아트', '일룸', '장인가구', '플랫포인트', '한샘'];

// 벡터화 함수
async function vectorizeImage(imageUrl) {
  try {
    const output = await replicate.run(
      "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
      {
        input: {
          inputs: imageUrl
        }
      }
    );

    let embedding = null;
    if (Array.isArray(output) && output.length > 0) {
      const firstResult = output[0];
      if (firstResult && Array.isArray(firstResult.embedding)) {
        embedding = firstResult.embedding;
      }
    }

    if (!embedding || embedding.length !== 768) {
      console.error('  ❌ Invalid embedding:', embedding?.length);
      return null;
    }

    return embedding;
  } catch (error) {
    console.error('  ❌ Vectorization error:', error.message);
    return null;
  }
}

// 메인 함수
async function main() {
  console.log('🚀 프리미엄 브랜드 제품 벡터화 시작\n');

  // 1. 데이터 로드
  const dataPath = path.join(__dirname, '..', 'data', 'premium-brands-unified.json');
  const products = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log(`📦 총 제품 수: ${products.length}개\n`);

  // 브랜드별 카운트
  const brandCounts = {};
  products.forEach(p => {
    brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
  });

  console.log('📊 브랜드별 제품 수:');
  Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([brand, count]) => {
      console.log(`  ${brand}: ${count}개`);
    });
  console.log('');

  // 2. 처리 시작
  let processed = 0;
  let uploaded = 0;
  let vectorized = 0;
  let failed = 0;

  for (const product of products) {
    processed++;

    if (processed % 10 === 0) {
      console.log(`\n⏳ 진행: ${processed}/${products.length} (업로드: ${uploaded}, 벡터화: ${vectorized}, 실패: ${failed})`);
    }

    try {
      // 제품 데이터 준비
      const productData = {
        id: product.productUrl, // URL을 ID로 사용
        brand: product.brand,
        title: product.title,
        category: product.category,
        price: product.price,
        image_url: product.imageUrl,
        url: product.productUrl,
        source: 'premium-crawler'
      };

      // Supabase에 업로드 (upsert)
      const { error: uploadError } = await supabase
        .from('products')
        .upsert(productData, { onConflict: 'id' });

      if (uploadError) {
        console.error(`  ❌ 업로드 실패 (${product.brand} - ${product.title}):`, uploadError.message);
        failed++;
        continue;
      }

      uploaded++;

      // 이미지 벡터화
      console.log(`  🔄 벡터화: ${product.brand} - ${product.title}`);
      const embedding = await vectorizeImage(product.imageUrl);

      if (!embedding) {
        console.error(`  ⚠️  벡터화 실패: ${product.title}`);
        failed++;
        continue;
      }

      // 벡터 저장
      const { error: vectorError } = await supabase
        .from('products')
        .update({ image_embedding: embedding })
        .eq('id', product.productUrl);

      if (vectorError) {
        console.error(`  ❌ 벡터 저장 실패:`, vectorError.message);
        failed++;
        continue;
      }

      vectorized++;
      console.log(`  ✅ 완료: ${product.brand} - ${product.title}`);

      // Rate limit 방지 (1초 대기)
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`  ❌ 오류 (${product.title}):`, error.message);
      failed++;
    }
  }

  // 최종 결과
  console.log('\n' + '='.repeat(60));
  console.log('✅ 처리 완료!');
  console.log('='.repeat(60));
  console.log(`총 처리: ${processed}개`);
  console.log(`업로드 성공: ${uploaded}개`);
  console.log(`벡터화 성공: ${vectorized}개`);
  console.log(`실패: ${failed}개`);
  console.log('='.repeat(60));
}

main().catch(console.error);
