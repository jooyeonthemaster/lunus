/**
 * LUNUS 통일된 제품 타입 정의
 * 
 * 8개 프리미엄 브랜드의 모든 제품을 위한 통합 타입입니다.
 * - 알로소, 에몬스, 우아미, 인아트, 일룸, 장인가구, 플랫포인트, 한샘
 */

// 상세 섹션 (텍스트 + 이미지)
export interface DetailSection {
  title: string;           // 섹션 제목 (옵션)
  description: string;     // 설명 텍스트
  image?: string;          // 섹션 이미지 URL (옵션)
}

// 통일된 제품 타입
export interface UnifiedProduct {
  // === 기본 정보 ===
  source: string;          // 브랜드 소스 (alloso, emons, etc.)
  brand: string;           // 브랜드명 (알로소, 에몬스, etc.)
  category: string;        // 카테고리 (소파, 침대, 의자, etc.)
  
  // === 제품 정보 ===
  title: string;           // 제품명
  price: number;           // 가격
  productUrl: string;      // 제품 상세 페이지 URL
  imageUrl: string;        // 대표 이미지 URL
  
  // === 상세 정보 (정규화됨) ===
  detailImages?: string[];          // 상세 이미지 배열
  detailSections?: DetailSection[]; // 상세 설명 섹션
  thumbnailImages?: string[];       // 썸네일 이미지 (한샘 등)
  detailHTML?: string;              // HTML 전체 (플랫포인트)
  
  // === 메타 정보 ===
  scrapedAt: string;       // 크롤링 일시
  
  // === 검색/추천용 (옵션) ===
  similarity?: number;     // 유사도 점수 (AI 검색 시)
  tags?: string[];         // 태그
}

// 브랜드 정보
export interface BrandInfo {
  source: string;
  brand: string;
  folder: string;
  description?: string;
  logo?: string;
  website?: string;
}

// 프리미엄 브랜드 목록
export const PREMIUM_BRANDS: BrandInfo[] = [
  {
    source: 'alloso',
    brand: '알로소',
    folder: '알로소',
    description: '디자인 리클라이너의 새로운 기준',
    website: 'https://www.alloso.co.kr'
  },
  {
    source: 'emons',
    brand: '에몬스',
    folder: '에몬스',
    description: '합리적인 가격의 품질 좋은 가구',
    website: 'https://mall.emons.co.kr'
  },
  {
    source: 'wooami',
    brand: '우아미',
    folder: '우아미',
    description: '우아한 미소, 편안한 휴식',
    website: 'https://wooamimall.com'
  },
  {
    source: 'inart',
    brand: '인아트',
    folder: '인아트',
    description: '예술적인 디자인 가구',
    website: 'https://www.inartshop.com'
  },
  {
    source: 'iloom',
    brand: '일룸',
    folder: '일룸',
    description: '일상에 새로운 기대와 설렘을 더하다',
    website: 'https://www.iloom.com'
  },
  {
    source: 'jangin',
    brand: '장인가구',
    folder: '장인가구',
    description: '장인정신이 깃든 수제 가구',
    website: 'https://www.jangin.com'
  },
  {
    source: 'flatpoint',
    brand: '플랫포인트',
    folder: '플랫포인트',
    description: '미니멀리즘의 완성',
    website: 'https://flatpoint.co.kr'
  },
  {
    source: 'hanssem',
    brand: '한샘',
    folder: '한샘',
    description: '대한민국 No.1 가구 브랜드',
    website: 'https://store.hanssem.com'
  }
];

// 카테고리 목록
export const CATEGORIES = [
  '전체',
  '소파',
  '침대',
  '의자',
  '테이블',
  '책상',
  '옷장',
  '수납',
  '주방',
  '조명',
  '키즈',
  '화장대',
  '중문',
  '기타'
];

// 유틸리티 함수
export function getBrandInfo(source: string): BrandInfo | undefined {
  return PREMIUM_BRANDS.find(b => b.source === source);
}

export function isPremiumBrand(source: string): boolean {
  return PREMIUM_BRANDS.some(b => b.source === source);
}



