/*
 * ============================================
 * LUNUS 이미지 Supabase Storage 업로드 스크립트
 * ============================================
 *
 * 외부 CDN의 방화벽을 우회하기 위해
 * 모든 제품 이미지를 Supabase Storage에 업로드합니다.
 *
 * ============================================
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');

// .env.local 파일 로드
require('dotenv').config({
  path: fs.existsSync('.env.local') ? '.env.local' : '.env'
});

// ============================================
// 설정
// ============================================
const CONFIG = {
  BATCH_SIZE: 50,
  DELAY_MS: 100,
  MAX_RETRIES: 3,
  LOG_FILE: 'image-upload-log.json',
};

// ============================================
// Supabase 클라이언트 초기화
// ============================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// 유틸리티 함수
// ============================================
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function saveLog(data) {
  try {
    fs.writeFileSync(CONFIG.LOG_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('⚠️  로그 저장 실패:', error.message);
  }
}

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
// 이미지 업로드 함수
// ============================================
async function uploadImageToStorage(productId, imageUrl, retries = 0) {
  try {
    console.log(`    📥 다운로드 중: ${imageUrl}`);

    // 이미지 다운로드 (User-Agent 추가로 방화벽 우회)
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 30000
    });

    const buffer = Buffer.from(response.data);
    console.log(`    ✅ 다운로드 완료: ${(buffer.length / 1024).toFixed(1)}KB`);

    // Supabase Storage에 업로드
    const fileName = `products/${productId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true // 덮어쓰기
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    // Public URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    console.log(`    ✅ 업로드 완료: ${publicUrl}`);

    // DB 업데이트 (storage_image_url 컬럼에 저장)
    const { error: updateError } = await supabase
      .from('products')
      .update({ storage_image_url: publicUrl })
      .eq('id', productId);

    if (updateError) {
      console.log(`    ⚠️  DB 업데이트 실패: ${updateError.message}`);
    }

    return publicUrl;
  } catch (error) {
    if (retries < CONFIG.MAX_RETRIES) {
      console.log(`    ⚠️  실패, 재시도 중... (${retries + 1}/${CONFIG.MAX_RETRIES})`);
      await delay(2000);
      return uploadImageToStorage(productId, imageUrl, retries + 1);
    }

    console.error(`    ✗ 업로드 실패: ${error.message}`);
    return null;
  }
}

// ============================================
// 메인 처리 함수
// ============================================
async function processImages() {
  console.log('🚀 이미지 Supabase Storage 업로드 시작\n');
  console.log('='.repeat(60));
  console.log('설정:');
  console.log(`  - 배치 크기: ${CONFIG.BATCH_SIZE}개`);
  console.log(`  - 업로드 간격: ${CONFIG.DELAY_MS}ms`);
  console.log('='.repeat(60));
  console.log('');

  // 진행 상황 불러오기
  const log = loadLog();
  const processedIds = new Set(log.processed || []);

  let totalProcessed = processedIds.size;
  let totalFailed = (log.failed || []).length;
  const failedLog = log.failed || [];
  const startTime = Date.now();

  // storage_image_url 컬럼이 없는 제품 수 확인
  const { count: totalCount, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .not('image_url', 'is', null)
    .is('storage_image_url', null);

  if (countError) {
    console.error('❌ 제품 수 확인 실패:', countError.message);
    process.exit(1);
  }

  console.log(`📊 전체 제품 수: ${totalCount}개`);
  console.log(`✓ 이미 처리된 제품: ${totalProcessed}개`);
  console.log(`⏳ 남은 제품: ${totalCount - totalProcessed}개\n`);

  if (totalProcessed >= totalCount) {
    console.log('🎉 모든 이미지가 이미 업로드되었습니다!');
    return;
  }

  // 배치 처리
  while (true) {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, image_url, title')
      .not('image_url', 'is', null)
      .is('storage_image_url', null)
      .limit(CONFIG.BATCH_SIZE);

    if (error) {
      console.error('❌ 제품 조회 실패:', error.message);
      break;
    }

    if (!products || products.length === 0) {
      console.log('\n✅ 모든 이미지 업로드 완료!');
      break;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 배치: ${products.length}개 이미지 업로드 중...`);
    console.log(`${'='.repeat(60)}`);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const progress = `[${i + 1}/${products.length}]`;

      if (processedIds.has(product.id)) {
        console.log(`  ${progress} ⏭️  이미 처리됨: ${product.id}`);
        continue;
      }

      console.log(`  ${progress} 처리 중: ${product.title?.substring(0, 50) || product.id}...`);

      const storageUrl = await uploadImageToStorage(product.id, product.image_url);

      if (storageUrl) {
        totalProcessed++;
        processedIds.add(product.id);
        saveLog({
          processed: Array.from(processedIds),
          failed: failedLog,
          lastUpdate: new Date().toISOString()
        });
      } else {
        totalFailed++;
        failedLog.push({
          id: product.id,
          title: product.title,
          image_url: product.image_url,
          error: 'Upload failed',
          timestamp: new Date().toISOString()
        });
      }

      const overallProgress = ((totalProcessed / totalCount) * 100).toFixed(1);
      console.log(`    📊 전체 진행률: ${totalProcessed}/${totalCount} (${overallProgress}%)`);

      await delay(CONFIG.DELAY_MS);
    }
  }

  // 최종 결과
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 업로드 완료!');
  console.log('='.repeat(60));
  console.log(`✅ 성공: ${totalProcessed}개`);
  console.log(`❌ 실패: ${totalFailed}개`);
  console.log(`⏱️  소요 시간: ${totalTime}분`);

  if (failedLog.length > 0) {
    const failedFile = 'image-upload-failed.json';
    fs.writeFileSync(failedFile, JSON.stringify(failedLog, null, 2));
    console.log(`⚠️  실패 목록: ${failedFile}`);
  }

  console.log('='.repeat(60));
}

// ============================================
// 스크립트 실행
// ============================================
processImages()
  .then(() => {
    console.log('\n✅ 스크립트 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 치명적 오류:', error);
    process.exit(1);
  });
