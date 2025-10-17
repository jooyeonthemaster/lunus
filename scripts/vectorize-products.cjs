/* 
 * ============================================
 * LUNUS 이미지 벡터화 스크립트
 * ============================================
 * 
 * 이 스크립트는 Supabase에 저장된 모든 제품 이미지를
 * Replicate CLIP API를 사용하여 벡터화합니다.
 * 
 * 실행 방법:
 *   npm run vectorize
 * 
 * 또는:
 *   node scripts/vectorize-products.cjs
 * 
 * ============================================
 */

const { createClient } = require('@supabase/supabase-js');
const Replicate = require('replicate');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// .env.local 파일 로드
try {
  require('dotenv').config({ 
    path: fs.existsSync('.env.local') ? '.env.local' : '.env' 
  });
} catch (error) {
  console.error('⚠️  환경 변수 파일을 찾을 수 없습니다. .env.local 파일이 있는지 확인하세요.');
  process.exit(1);
}

// ============================================
// 설정 값
// ============================================
const CONFIG = {
  BATCH_SIZE: 50,           // 한 번에 처리할 제품 수
  DELAY_MS: 1000,           // API 호출 간 대기 시간 (밀리초)
  MAX_RETRIES: 3,           // 실패 시 재시도 횟수
  RETRY_DELAY_MS: 5000,     // 재시도 대기 시간 (밀리초)
  LOG_FILE: 'vectorization-log.json', // 진행 상황 로그 파일
  TEST_MODE: process.argv.includes('--test'),  // 테스트 모드 (10개만 처리)
  TEST_LIMIT: 10,           // 테스트 모드 제한
};

// ============================================
// Supabase & Replicate 클라이언트 초기화
// ============================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const replicateToken = process.env.REPLICATE_API_TOKEN;

// 환경 변수 검증
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('   NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인하세요.');
  process.exit(1);
}

if (!replicateToken) {
  console.error('❌ Replicate API 토큰이 설정되지 않았습니다.');
  console.error('   REPLICATE_API_TOKEN을 .env.local 파일에 추가하세요.');
  console.error('   발급 방법: https://replicate.com/account/api-tokens');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const replicate = new Replicate({ auth: replicateToken });

// ============================================
// 유틸리티 함수
// ============================================

// 대기 함수
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 진행 상황 로그 저장
function saveLog(data) {
  try {
    fs.writeFileSync(
      CONFIG.LOG_FILE,
      JSON.stringify(data, null, 2),
      'utf8'
    );
  } catch (error) {
    console.error('⚠️  로그 저장 실패:', error.message);
  }
}

// 진행 상황 로그 불러오기
function loadLog() {
  try {
    if (fs.existsSync(CONFIG.LOG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG.LOG_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('⚠️  로그 불러오기 실패:', error.message);
  }
  return { processed: [], failed: [] };
}

// ============================================
// 이미지 벡터화 함수 (Supabase Storage 경유)
// ============================================
async function vectorizeImage(imageUrl, productId, retries = 0) {
  let tempFileName = null;

  try {
    // 1. 외부 CDN 이미지를 Supabase Storage에 임시 업로드 (방화벽 우회)
    console.log(`    📥 이미지 다운로드 중...`);

    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 30000
    });

    const buffer = Buffer.from(response.data);
    const sizeKB = buffer.length / 1024;
    console.log(`    ✅ 다운로드 완료: ${sizeKB.toFixed(1)}KB`);

    // ⚠️ 방화벽 차단 체크: 5KB 미만이면 HTML 에러 페이지로 간주하고 스킵
    if (sizeKB < 5) {
      console.log(`    ⚠️  이미지가 너무 작습니다 (${sizeKB.toFixed(1)}KB). 방화벽 차단으로 추정, 스킵합니다.`);
      return null;
    }

    // 2. Supabase Storage에 임시 업로드 (파일명을 Base64로 인코딩하여 안전하게)
    const safeProductId = Buffer.from(productId).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    tempFileName = `temp/${Date.now()}-${safeProductId.substring(0, 20)}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(tempFileName, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 3. Public URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(tempFileName);

    console.log(`    ✅ Supabase Storage 업로드 완료`);
    console.log(`    🔄 Replicate API 호출 중...`);

    // 4. Public URL로 벡터화
    const output = await replicate.run(
      "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
      {
        input: {
          inputs: publicUrl  // ⚠️ Supabase Storage URL 사용
        }
      }
    );
    
    // Replicate CLIP은 배열 형식으로 반환: [{"embedding": [...], "input": "..."}]
    let embedding = null;
    
    console.log(`    📊 응답 타입: ${typeof output}`);
    console.log(`    📊 배열 여부: ${Array.isArray(output)}`);
    console.log(`    📊 배열 길이: ${Array.isArray(output) ? output.length : 'N/A'}`);

    if (Array.isArray(output) && output.length > 0) {
      // ⚠️ 배열이 2개일 경우 두 번째 결과 확인
      const firstResult = output[0];
      const secondResult = output.length > 1 ? output[1] : null;

      console.log(`    📊 첫 번째 결과 타입: ${typeof firstResult}`);
      console.log(`    📊 embedding 필드 존재: ${firstResult && 'embedding' in firstResult}`);
      console.log(`    📊 embedding 길이: ${firstResult && Array.isArray(firstResult.embedding) ? firstResult.embedding.length : 'N/A'}`);

      if (secondResult) {
        console.log(`    📊 두 번째 결과 타입: ${typeof secondResult}`);
        console.log(`    📊 두 번째 embedding 존재: ${secondResult && 'embedding' in secondResult}`);
        console.log(`    📊 두 번째 embedding 길이: ${secondResult && Array.isArray(secondResult.embedding) ? secondResult.embedding.length : 'N/A'}`);
      }

      // 두 번째 결과가 있고 embedding이 있으면 두 번째 사용
      if (secondResult && Array.isArray(secondResult.embedding)) {
        embedding = secondResult.embedding;
        console.log(`    ✅ 두 번째 embedding 사용: ${embedding.length}차원`);
      } else if (firstResult && Array.isArray(firstResult.embedding)) {
        embedding = firstResult.embedding;
        console.log(`    ✅ 첫 번째 embedding 사용: ${embedding.length}차원`);
      }
    } else if (Array.isArray(output) && output.length === 512) {
      // 직접 벡터 배열인 경우
      embedding = output;
      console.log(`    ✅ 직접 벡터 배열: ${embedding.length}차원`);
    } else if (output && typeof output === 'object' && Array.isArray(output.embedding)) {
      // 객체 형식인 경우
      embedding = output.embedding;
      console.log(`    ✅ 객체에서 추출: ${embedding.length}차원`);
    }
    
    if (embedding && embedding.length === 768) {
      console.log(`    ✅✅ 벡터 추출 성공! (768차원)`);
      console.log(`    🔢 벡터 첫 5개 값: [${embedding.slice(0, 5).join(', ')}]`);

      // 5. 임시 파일 삭제
      if (tempFileName) {
        try {
          await supabase.storage.from('product-images').remove([tempFileName]);
          console.log(`    🗑️  임시 파일 삭제 완료`);
        } catch (e) {
          console.error(`    ⚠️  임시 파일 삭제 실패: ${e.message}`);
        }
      }

      return embedding;
    }

    console.error(`    ✗ 벡터 추출 실패`);
    console.error(`    ✗ embedding 변수: ${embedding ? `${embedding.length}차원` : 'null'}`);

    // 임시 파일 삭제
    if (tempFileName) {
      try {
        await supabase.storage.from('product-images').remove([tempFileName]);
      } catch (e) {
        // ignore
      }
    }

    return null;
  } catch (error) {
    // 임시 파일 삭제 (에러 발생 시에도)
    if (tempFileName) {
      try {
        await supabase.storage.from('product-images').remove([tempFileName]);
      } catch (e) {
        // ignore
      }
    }

    // Rate Limit 에러 처리
    if (error.message && error.message.includes('rate limit')) {
      if (retries < CONFIG.MAX_RETRIES) {
        console.log(`    ⏳ Rate limit 도달. ${CONFIG.RETRY_DELAY_MS}ms 후 재시도...`);
        await delay(CONFIG.RETRY_DELAY_MS);
        return vectorizeImage(imageUrl, productId, retries + 1);
      }
    }

    // 다른 에러
    console.error(`    ✗ 벡터화 실패: ${error.message}`);
    return null;
  }
}

// ============================================
// 메인 처리 함수
// ============================================
async function processProducts() {
  console.log('🚀 LUNUS 이미지 벡터화 시작\n');
  console.log('='.repeat(60));
  console.log('설정:');
  console.log(`  - 배치 크기: ${CONFIG.BATCH_SIZE}개`);
  console.log(`  - API 호출 간격: ${CONFIG.DELAY_MS}ms`);
  console.log(`  - 최대 재시도: ${CONFIG.MAX_RETRIES}회`);
  console.log('='.repeat(60));
  console.log('');

  // 진행 상황 불러오기
  const log = loadLog();
  const processedIds = new Set(log.processed || []);
  
  let totalProcessed = processedIds.size;
  let totalFailed = (log.failed || []).length;
  let currentBatch = 0;
  let offset = 0;
  
  const failedLog = log.failed || [];
  const startTime = Date.now();
  
  // 전체 제품 수 확인
  const { count: totalCount, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .not('image_url', 'is', null);
  
  if (countError) {
    console.error('❌ 제품 수 확인 실패:', countError.message);
    process.exit(1);
  }
  
  console.log(`📊 전체 제품 수: ${totalCount}개`);
  console.log(`✓ 이미 처리된 제품: ${totalProcessed}개`);
  console.log(`⏳ 남은 제품: ${totalCount - totalProcessed}개\n`);
  
  if (totalProcessed >= totalCount) {
    console.log('🎉 모든 제품이 이미 벡터화되었습니다!');
    return;
  }
  
  // 배치 처리 시작
  while (true) {
    // 테스트 모드: 10개만 처리
    if (CONFIG.TEST_MODE && totalProcessed >= CONFIG.TEST_LIMIT) {
      console.log(`\n🧪 테스트 모드: ${CONFIG.TEST_LIMIT}개 처리 완료. 종료합니다.`);
      break;
    }
    
    // 벡터화되지 않은 제품 가져오기 (offset 고정 - 항상 최신 미처리 제품 가져오기)
    const { data: products, error } = await supabase
      .from('products')
      .select('id, image_url, title, brand, image_embedding')
      .is('image_embedding', null)
      .not('image_url', 'is', null)
      .limit(CONFIG.BATCH_SIZE);
    
    if (error) {
      console.error('❌ 제품 조회 실패:', error.message);
      break;
    }
    
    if (!products || products.length === 0) {
      console.log('\n✅ 모든 제품 처리 완료!');
      break;
    }
    
    currentBatch++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 배치 ${currentBatch}: ${products.length}개 제품 처리 중...`);
    console.log(`${'='.repeat(60)}`);
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const progress = `[${i + 1}/${products.length}]`;
      
      // 이미 처리된 제품은 스킵
      if (processedIds.has(product.id)) {
        console.log(`  ${progress} ⏭️  이미 처리됨: ${product.id}`);
        continue;
      }
      
      console.log(`  ${progress} 처리 중: ${product.title ? product.title.substring(0, 50) : product.id}...`);
      console.log(`    🔗 URL: ${product.image_url}`);

      // 이미지 벡터화 (product.id 전달)
      const embedding = await vectorizeImage(product.image_url, product.id);
      
      if (embedding && Array.isArray(embedding) && embedding.length === 768) {
        // Supabase에 벡터 저장 (배열 그대로 전달 - Supabase가 vector로 변환)
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_embedding: embedding })
          .eq('id', product.id);
        
        if (updateError) {
          console.log(`    ✗ DB 저장 실패: ${updateError.message}`);
          totalFailed++;
          failedLog.push({
            id: product.id,
            title: product.title,
            image_url: product.image_url,
            error: updateError.message,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log(`    ✓ 성공! (벡터 차원: ${embedding.length})`);
          totalProcessed++;
          processedIds.add(product.id);
          
          // 진행 상황 저장
          saveLog({
            processed: Array.from(processedIds),
            failed: failedLog,
            lastUpdate: new Date().toISOString()
          });
        }
      } else {
        console.log(`    ✗ 벡터화 실패 또는 잘못된 형식`);
        totalFailed++;
        failedLog.push({
          id: product.id,
          title: product.title,
          image_url: product.image_url,
          error: 'Invalid embedding format',
          timestamp: new Date().toISOString()
        });
      }
      
      // 진행률 표시
      const overallProgress = ((totalProcessed / totalCount) * 100).toFixed(1);
      console.log(`    📊 전체 진행률: ${totalProcessed}/${totalCount} (${overallProgress}%)`);
      
      // Rate Limiting
      await delay(CONFIG.DELAY_MS);
    }
  }
  
  // 최종 결과
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 벡터화 완료!');
  console.log('='.repeat(60));
  console.log(`✅ 성공: ${totalProcessed}개`);
  console.log(`❌ 실패: ${totalFailed}개`);
  console.log(`⏱️  소요 시간: ${totalTime}분`);
  
  if (failedLog.length > 0) {
    const failedFile = 'vectorization-failed.json';
    fs.writeFileSync(failedFile, JSON.stringify(failedLog, null, 2));
    console.log(`⚠️  실패 목록: ${failedFile}`);
  }
  
  console.log('='.repeat(60));
  
  // 진행 상황 확인 쿼리 안내
  console.log('\n💡 진행 상황 확인:');
  console.log('   Supabase SQL Editor에서 실행:');
  console.log('   SELECT * FROM vectorization_progress;');
}

// ============================================
// 스크립트 실행
// ============================================
processProducts()
  .then(() => {
    console.log('\n✅ 스크립트 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 치명적 오류:', error);
    process.exit(1);
  });

