#!/usr/bin/env node

/**
 * 프리미엄 브랜드 제품을 Supabase에 빠르게 업로드하고 샘플 벡터화
 *
 * 1단계: 모든 제품 업로드 (벡터 없이)
 * 2단계: 브랜드별로 일부만 벡터화 (균등 분포)
 *
 * 실행: node scripts/quick-upload-premium.cjs
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

// 설정
const VECTORIZE_PER_BRAND = 50; // 브랜드당 50개만 벡터화
const BATCH_SIZE = 100; // 한 번에 업로드할 제품 수

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
  console.log('🚀 프리미엄 브랜드 제품 빠른 업로드 시작\n');

  // 1. 데이터 로드
  const dataPath = path.join(__dirname, '..', 'data', 'premium-brands-unified.json');
  const allProducts = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log(`📦 총 제품 수: ${allProducts.length}개\n`);

  // 브랜드별 그룹화
  const brandGroups = {};
  allProducts.forEach(p => {
    if (!brandGroups[p.brand]) {
      brandGroups[p.brand] = [];
    }
    brandGroups[p.brand].push(p);
  });

  console.log('📊 브랜드별 제품 수:');
  Object.entries(brandGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([brand, products]) => {
      console.log(`  ${brand}: ${products.length}개`);
    });
  console.log('');

  // ========================================
  // STEP 1: 모든 제품 업로드 (벡터 없이)
  // ========================================
  console.log('📤 STEP 1: 모든 제품 업로드 중...\n');

  const productsToUpload = allProducts.map(p => ({
    id: p.productUrl,
    brand: p.brand,
    title: p.title,
    category: p.category,
    price: p.price,
    image_url: p.imageUrl,
    url: p.productUrl,
    source: 'premium-crawler'
  }));

  let uploadedCount = 0;
  for (let i = 0; i < productsToUpload.length; i += BATCH_SIZE) {
    const batch = productsToUpload.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`❌ 배치 업로드 실패 (${i}-${i + batch.length}):`, error.message);
    } else {
      uploadedCount += batch.length;
      console.log(`✅ 업로드: ${uploadedCount}/${allProducts.length}`);
    }
  }

  console.log(`\n✅ STEP 1 완료: ${uploadedCount}개 제품 업로드\n`);

  // ========================================
  // STEP 2: 브랜드별로 샘플 벡터화
  // ========================================
  console.log(`🔄 STEP 2: 브랜드별 샘플 벡터화 (각 브랜드당 ${VECTORIZE_PER_BRAND}개)\n`);

  let vectorizedTotal = 0;
  let failedTotal = 0;

  for (const [brand, products] of Object.entries(brandGroups)) {
    console.log(`\n📌 ${brand} (${products.length}개 중 ${Math.min(VECTORIZE_PER_BRAND, products.length)}개 벡터화)`);

    // 랜덤 샘플링
    const sampled = products
      .sort(() => Math.random() - 0.5)
      .slice(0, VECTORIZE_PER_BRAND);

    let brandVectorized = 0;
    let brandFailed = 0;

    for (const product of sampled) {
      try {
        const embedding = await vectorizeImage(product.imageUrl);

        if (!embedding) {
          console.log(`  ⚠️  벡터화 실패: ${product.title}`);
          brandFailed++;
          failedTotal++;
          continue;
        }

        const { error } = await supabase
          .from('products')
          .update({ image_embedding: embedding })
          .eq('id', product.productUrl);

        if (error) {
          console.error(`  ❌ 저장 실패:`, error.message);
          brandFailed++;
          failedTotal++;
          continue;
        }

        brandVectorized++;
        vectorizedTotal++;
        console.log(`  ✅ [${brandVectorized}/${sampled.length}] ${product.title}`);

        // Rate limit 방지
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`  ❌ 오류: ${error.message}`);
        brandFailed++;
        failedTotal++;
      }
    }

    console.log(`  📊 ${brand} 완료: 성공 ${brandVectorized}, 실패 ${brandFailed}`);
  }

  // 최종 결과
  console.log('\n' + '='.repeat(60));
  console.log('✅ 모든 작업 완료!');
  console.log('='.repeat(60));
  console.log(`총 업로드: ${uploadedCount}개`);
  console.log(`벡터화 성공: ${vectorizedTotal}개`);
  console.log(`벡터화 실패: ${failedTotal}개`);
  console.log('='.repeat(60));
  console.log('\n💡 이제 AI 검색에서 다양한 브랜드가 추천됩니다!');
}

main().catch(console.error);
