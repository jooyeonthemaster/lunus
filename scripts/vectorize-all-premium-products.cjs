#!/usr/bin/env node

/**
 * 프리미엄 브랜드 전체 제품 벡터화
 *
 * - 2,274개 제품 전체를 실제 대표 이미지로 벡터화
 * - 진행상황 저장 (중단 후 재시작 가능)
 * - 안정적인 에러 처리
 *
 * 실행: node scripts/vectorize-all-premium-products.cjs
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
const BATCH_UPLOAD_SIZE = 100; // 한 번에 업로드할 제품 수
const PROGRESS_FILE = path.join(__dirname, 'vectorization-progress.json');
const DELAY_MS = 800; // API 호출 간격 (ms)

// 진행상황 로드
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    console.log(`📂 이전 진행상황 발견: ${data.completed}개 완료\n`);
    return data;
  }
  return { completed: 0, processedIds: [] };
}

// 진행상황 저장
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// 벡터화 함수
async function vectorizeImage(imageUrl, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
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
      } else if (Array.isArray(output) && output.length === 768) {
        embedding = output;
      }

      if (!embedding || embedding.length !== 768) {
        throw new Error(`Invalid embedding dimension: ${embedding?.length}`);
      }

      return embedding;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.log(`    ⚠️  재시도 ${attempt}/${retries}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

// 메인 함수
async function main() {
  console.log('🚀 프리미엄 브랜드 전체 제품 벡터화 시작\n');
  console.log('⏱️  예상 소요 시간: 약 30-40분\n');

  // 1. 데이터 로드
  const dataPath = path.join(__dirname, '..', 'data', 'premium-brands-unified.json');
  const allProducts = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log(`📦 총 제품 수: ${allProducts.length}개\n`);

  // 브랜드별 카운트
  const brandCounts = {};
  allProducts.forEach(p => {
    brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
  });

  console.log('📊 브랜드별 제품 수:');
  Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([brand, count]) => {
      console.log(`  ${brand}: ${count}개`);
    });
  console.log('');

  // 2. 진행상황 로드
  const progress = loadProgress();
  const processedSet = new Set(progress.processedIds || []);

  // 3. STEP 1: 모든 제품 업로드 (벡터 없이)
  console.log('📤 STEP 1: 모든 제품 Supabase에 업로드\n');

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
  for (let i = 0; i < productsToUpload.length; i += BATCH_UPLOAD_SIZE) {
    const batch = productsToUpload.slice(i, i + BATCH_UPLOAD_SIZE);

    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`❌ 배치 업로드 실패 (${i}-${i + batch.length}):`, error.message);
    } else {
      uploadedCount += batch.length;
      process.stdout.write(`\r✅ 업로드 진행: ${uploadedCount}/${allProducts.length} (${((uploadedCount/allProducts.length)*100).toFixed(1)}%)`);
    }
  }

  console.log(`\n\n✅ STEP 1 완료: ${uploadedCount}개 제품 업로드\n`);

  // 4. STEP 2: 전체 제품 벡터화
  console.log('🔄 STEP 2: 전체 제품 벡터화 시작\n');

  const startTime = Date.now();
  let vectorized = progress.completed || 0;
  let failed = 0;
  let skipped = 0;

  const totalToProcess = allProducts.length;

  for (let i = 0; i < allProducts.length; i++) {
    const product = allProducts[i];
    const productId = product.productUrl;

    // 이미 처리된 제품은 스킵
    if (processedSet.has(productId)) {
      skipped++;
      continue;
    }

    try {
      // 진행률 표시
      const percent = ((i + 1) / totalToProcess * 100).toFixed(1);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const estimatedTotal = totalToProcess / (i + 1) * elapsed;
      const remaining = Math.floor(estimatedTotal - elapsed);
      const remainingMin = Math.floor(remaining / 60);

      console.log(`\n[${i + 1}/${totalToProcess}] ${percent}% | ⏱️  ${remainingMin}분 남음`);
      console.log(`  🏷️  ${product.brand} - ${product.title}`);
      console.log(`  🖼️  ${product.imageUrl}`);

      // 이미지 벡터화
      const embedding = await vectorizeImage(product.imageUrl);

      // Supabase에 벡터 저장
      const { error } = await supabase
        .from('products')
        .update({ image_embedding: embedding })
        .eq('id', productId);

      if (error) {
        throw new Error(`DB 저장 실패: ${error.message}`);
      }

      vectorized++;
      processedSet.add(productId);

      console.log(`  ✅ 성공 (총 ${vectorized}개 완료)`);

      // 진행상황 저장 (10개마다)
      if (vectorized % 10 === 0) {
        saveProgress({
          completed: vectorized,
          processedIds: Array.from(processedSet),
          lastUpdated: new Date().toISOString()
        });
        console.log(`  💾 진행상황 저장됨`);
      }

      // Rate limit 방지
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));

    } catch (error) {
      failed++;
      console.log(`  ❌ 실패: ${error.message}`);

      // 실패해도 진행상황 기록 (재시도 방지)
      processedSet.add(productId);
      saveProgress({
        completed: vectorized,
        processedIds: Array.from(processedSet),
        lastUpdated: new Date().toISOString(),
        lastError: {
          product: product.title,
          error: error.message,
          time: new Date().toISOString()
        }
      });
    }
  }

  // 최종 진행상황 저장
  saveProgress({
    completed: vectorized,
    processedIds: Array.from(processedSet),
    finished: true,
    finishedAt: new Date().toISOString()
  });

  // 최종 결과
  const totalTime = Math.floor((Date.now() - startTime) / 1000 / 60);

  console.log('\n' + '='.repeat(70));
  console.log('✅ 벡터화 완료!');
  console.log('='.repeat(70));
  console.log(`📦 총 제품: ${allProducts.length}개`);
  console.log(`✅ 벡터화 성공: ${vectorized}개`);
  console.log(`❌ 벡터화 실패: ${failed}개`);
  console.log(`⏭️  스킵: ${skipped}개 (이미 처리됨)`);
  console.log(`⏱️  총 소요시간: ${totalTime}분`);
  console.log('='.repeat(70));

  // 브랜드별 통계
  console.log('\n📊 최종 브랜드별 벡터화 확인:');
  const { data: finalCounts } = await supabase
    .from('products')
    .select('brand')
    .not('image_embedding', 'is', null)
    .in('brand', Object.keys(brandCounts));

  const vectorizedByBrand = {};
  (finalCounts || []).forEach(p => {
    vectorizedByBrand[p.brand] = (vectorizedByBrand[p.brand] || 0) + 1;
  });

  Object.entries(vectorizedByBrand)
    .sort((a, b) => b[1] - a[1])
    .forEach(([brand, count]) => {
      console.log(`  ${brand}: ${count}개 벡터화`);
    });

  console.log('\n💡 이제 AI 검색에서 다양한 프리미엄 브랜드가 추천됩니다!');
}

main().catch(error => {
  console.error('\n❌ 치명적 오류:', error);
  process.exit(1);
});
