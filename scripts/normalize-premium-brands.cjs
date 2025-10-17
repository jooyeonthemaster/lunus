/*
 * ============================================
 * LUNUS Premium Brands Normalizer
 * ============================================
 * 
 * 상세페이지 크롤링이 완료된 8개 프리미엄 브랜드의 데이터를
 * 통일된 형식으로 정규화합니다.
 * 
 * 대상 브랜드:
 * - 알로소 (alloso)
 * - 에몬스 (emons)
 * - 우아미 (wooami)
 * - 인아트 (inart)
 * - 일룸 (iloom)
 * - 장인가구 (jangin)
 * - 플랫포인트 (flatpoint)
 * - 한샘 (hanssem)
 * 
 * 실행 방법:
 *   node scripts/normalize-premium-brands.cjs
 * 
 * ============================================
 */

const fs = require('fs');
const path = require('path');

// 브랜드 설정
const PREMIUM_BRANDS = [
  {
    source: 'alloso',
    brand: '알로소',
    folder: '알로소',
    categoryMapping: {
      '소파': '소파',
      '스토리지': '수납',
      '의자': '의자',
      '테이블': '테이블'
    }
  },
  {
    source: 'emons',
    brand: '에몬스',
    folder: '에몬스',
    categoryMapping: {
      '소파': '소파',
      '수납가구': '수납',
      '식탁': '테이블',
      '중문': '중문',
      '침대,매트리스': '침대',
      '학생,서재': '책상'
    }
  },
  {
    source: 'wooami',
    brand: '우아미',
    folder: '우아미',
    categoryMapping: {
      '거실소파': '소파',
      '거실장': '수납',
      '매트리스': '침대',
      '서랍장': '수납',
      '장롱': '옷장',
      '주방': '주방',
      '침대': '침대',
      '홈오피스': '책상',
      '화장대': '화장대'
    }
  },
  {
    source: 'inart',
    brand: '인아트',
    folder: '인아트',
    categoryMapping: {
      '소파': '소파',
      '옷장, 수납장': '옷장',
      '의자': '의자',
      '침대': '침대',
      '테이블': '테이블'
    }
  },
  {
    source: 'iloom',
    brand: '일룸',
    folder: '일룸',
    categoryMapping: {
      '거실': '소파',
      '서재': '책상',
      '옷장': '옷장',
      '조명': '조명',
      '주방': '주방',
      '키즈룸': '키즈',
      '학생방': '책상'
    }
  },
  {
    source: 'jangin',
    brand: '장인가구',
    folder: '장인가구',
    categoryMapping: {
      '거실': '소파',
      '소가구클로이': '수납',
      '주방': '주방',
      '침실': '침대',
      '키즈오피스': '키즈'
    }
  },
  {
    source: 'flatpoint',
    brand: '플랫포인트',
    folder: '플랫포인트',
    categoryMapping: {
      'DOB': '수납',
      '가죽소파': '소파',
      '사이드테이블': '테이블',
      '선반': '수납',
      '조명&홈데코': '조명',
      '체어': '의자',
      '침대&매트리스': '침대',
      '키즈': '키즈',
      '테이블': '테이블',
      '패브릭소파': '소파'
    }
  },
  {
    source: 'hanssem',
    brand: '한샘',
    folder: '한샘',
    categoryMapping: {
      '거실': '소파',
      '다이닝': '테이블',
      '옷장, 드레스룸': '옷장',
      '침실': '침대',
      '키즈룸': '키즈',
      '홈오피스': '책상'
    }
  }
];

// 카테고리 자동 감지 (파일명 기반)
function detectCategory(filename, categoryMapping) {
  for (const [fileCategory, normalizedCategory] of Object.entries(categoryMapping)) {
    if (filename.includes(fileCategory)) {
      return normalizedCategory;
    }
  }
  return '기타';
}

// 상세 정보 정규화
function normalizeDetailData(product, brandSource) {
  const normalized = {};
  
  // 원본 필드들을 그대로 복사 (매우 중요!)
  if (product.detailImage) normalized.detailImage = product.detailImage; // 인아트
  if (product.detailImage1) normalized.detailImage1 = product.detailImage1;
  if (product.detailImage2) normalized.detailImage2 = product.detailImage2;
  if (product.detailImage3) normalized.detailImage3 = product.detailImage3;
  if (product.detailText1) normalized.detailText1 = product.detailText1;
  if (product.detailText2) normalized.detailText2 = product.detailText2;
  if (product.detailText3) normalized.detailText3 = product.detailText3;
  
  // 배열 필드들
  if (product.detailImages && Array.isArray(product.detailImages)) {
    normalized.detailImages = [...product.detailImages];
  }
  
  if (product.galleryImages && Array.isArray(product.galleryImages)) {
    normalized.galleryImages = [...product.galleryImages];
  }
  
  if (product.thumbnailImages && Array.isArray(product.thumbnailImages)) {
    normalized.thumbnailImages = [...product.thumbnailImages];
  }
  
  if (product.detailSections && Array.isArray(product.detailSections)) {
    normalized.detailSections = [...product.detailSections];
  }
  
  // HTML (플랫포인트)
  if (product.detailHTML) {
    normalized.detailHTML = product.detailHTML;
  }
  
  return normalized;
}

// 제품 정규화
function normalizeProduct(product, brandConfig, category) {
  return {
    // 기본 정보
    source: brandConfig.source,
    brand: brandConfig.brand,
    category: category || product.category || '기타',
    
    // 제품 정보
    title: product.title || product.name || '',
    price: product.price || 0,
    productUrl: product.productUrl || product.url || '',
    imageUrl: product.imageUrl || product.image || '',
    
    // 상세 정보 (정규화)
    ...normalizeDetailData(product, brandConfig.source),
    
    // 메타 정보
    scrapedAt: product.scrapedAt || product.capturedAt || new Date().toISOString()
  };
}

// 메인 처리 함수
async function processBrand(brandConfig) {
  console.log(`\n📦 Processing: ${brandConfig.brand}`);
  
  const brandDir = path.join(process.cwd(), 'data', brandConfig.folder);
  
  // 폴더 내 모든 JSON 파일 읽기 (products.json 제외 - 상세 정보 없음)
  const allFiles = fs.readdirSync(brandDir).filter(f => f.endsWith('.json') && f !== 'products.json');
  
  let allProducts = [];
  
  console.log(`   Found ${allFiles.length} category files`);
  
  // 각 카테고리 파일에서 데이터 읽기
  for (const file of allFiles) {
    const filePath = path.join(brandDir, file);
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // 파일명에서 카테고리 추출
    const fileCategory = file.replace(brandConfig.folder.replace(/\s+/g, ''), '')
      .replace(brandConfig.source, '')
      .replace('.json', '')
      .replace(/^-/, '')
      .trim();
    
    // 각 제품 정규화
    const normalized = fileData.map(product => {
      // 제품 카테고리 우선, 없으면 파일 카테고리, 없으면 매핑
      let category = product.category || fileCategory || '기타';
      
      // 카테고리 매핑
      const mappedCategory = brandConfig.categoryMapping[fileCategory] || 
                            brandConfig.categoryMapping[category] || 
                            category || '기타';
      
      return normalizeProduct(product, brandConfig, mappedCategory);
    });
    
    allProducts = allProducts.concat(normalized);
  }
  
  console.log(`   ✅ Normalized ${allProducts.length} products from ${allFiles.length} files`);
  return allProducts;
}

// 실행
async function main() {
  console.log('🚀 Starting Premium Brands Normalization\n');
  console.log('Target brands:', PREMIUM_BRANDS.map(b => b.brand).join(', '));
  
  let allProducts = [];
  let stats = {};
  
  for (const brandConfig of PREMIUM_BRANDS) {
    try {
      const products = await processBrand(brandConfig);
      allProducts = allProducts.concat(products);
      stats[brandConfig.brand] = products.length;
    } catch (error) {
      console.error(`❌ Error processing ${brandConfig.brand}:`, error.message);
      stats[brandConfig.brand] = 0;
    }
  }
  
  // 출력 파일 저장
  const outputFile = path.join(process.cwd(), 'data', 'premium-brands-unified.json');
  fs.writeFileSync(outputFile, JSON.stringify(allProducts, null, 2), 'utf8');
  
  console.log('\n\n📊 Final Statistics:');
  console.log('━'.repeat(50));
  for (const [brand, count] of Object.entries(stats)) {
    console.log(`${brand.padEnd(15)} ${count.toString().padStart(6)} 제품`);
  }
  console.log('━'.repeat(50));
  console.log(`Total:          ${allProducts.length.toString().padStart(6)} 제품`);
  console.log(`\n✅ Saved to: ${outputFile}`);
}

main().catch(console.error);

