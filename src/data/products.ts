// 제품 타입 정의
export interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  category: string;
  price: number;
  description: string;
  tags: string[];
  externalUrl?: string; // 외부 사이트 상세페이지 URL
  storeIds?: string[]; // 해당 제품을 볼 수 있는 매장 ID들
  specifications?: {
    dimensions?: string;
    material?: string;
    color?: string;
    weight?: string;
  };
}

// 카테고리 배열
export const categories = [
  "전체",
  "의자",
  "테이블",
  "소파",
  "침대",
  "수납가구",
  "조명",
  "장식품"
];

// 제품 데이터
export const products: Product[] = [
  // 의자 카테고리
  {
    id: "chair-001",
    name: "모던 오피스 체어",
    brand: "Herman Miller",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
    category: "의자",
    price: 150000,
    description: "편안한 인체공학적 디자인의 오피스 체어",
    tags: ["모던", "인체공학적", "회전", "높이조절"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-007", "store-002"],
    specifications: {
      dimensions: "W 68 x D 68 x H 96-104 cm",
      material: "메쉬, 알루미늄",
      color: "블랙",
      weight: "18kg"
    }
  },
  {
    id: "chair-002", 
    name: "빈티지 암체어",
    brand: "Eames",
    image: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=400&fit=crop",
    category: "의자",
    price: 320000,
    description: "클래식한 가죽 암체어",
    tags: ["빈티지", "가죽", "클래식", "안락"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-001", "store-003"]
  },
  {
    id: "chair-003",
    name: "스칸디나비아 원목 의자",
    brand: "IKEA",
    image: "https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=400&h=400&fit=crop",
    category: "의자",
    price: 180000,
    description: "심플한 북유럽 스타일의 원목 의자",
    tags: ["북유럽", "원목", "심플", "내츄럴"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-001", "store-005"]
  },

  // 테이블 카테고리
  {
    id: "table-001",
    name: "원형 다이닝 테이블",
    brand: "West Elm",
    image: "https://images.unsplash.com/photo-1549497538-303791108f95?w=400&h=400&fit=crop",
    category: "테이블",
    price: 450000,
    description: "원목 원형 다이닝 테이블",
    tags: ["원형", "원목", "다이닝", "4인용"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-002", "store-004"]
  },
  {
    id: "table-002",
    name: "인더스트리얼 책상",
    brand: "CB2",
    image: "https://images.unsplash.com/photo-1586627404012-e5380fb86399?w=400&h=400&fit=crop",
    category: "테이블",
    price: 280000,
    description: "철제 프레임의 인더스트리얼 스타일 책상",
    tags: ["인더스트리얼", "철제", "작업용", "심플"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-003", "store-007"]
  },
  {
    id: "table-003",
    name: "대리석 커피 테이블",
    brand: "Restoration Hardware",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop",
    category: "테이블",
    price: 380000,
    description: "고급스러운 대리석 커피 테이블",
    tags: ["대리석", "럭셔리", "커피테이블", "모던"],
    externalUrl: "https://rh.com/catalog/category/products.jsp?categoryId=cat1560023",
    storeIds: ["store-004", "store-009"],
    specifications: {
      dimensions: "W 120 x D 60 x H 45 cm",
      material: "천연 대리석, 스테인리스 스틸",
      color: "화이트 마블",
      weight: "35kg"
    }
  },

  // 소파 카테고리
  {
    id: "sofa-001",
    name: "3인용 패브릭 소파",
    brand: "Pottery Barn",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop",
    category: "소파",
    price: 680000,
    description: "부드러운 패브릭 소재의 3인용 소파",
    tags: ["패브릭", "3인용", "편안함", "모던"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-004", "store-008"]
  },
  {
    id: "sofa-002",
    name: "가죽 리클라이너 소파",
    brand: "La-Z-Boy",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
    category: "소파",
    price: 1200000,
    description: "프리미엄 가죽 리클라이너 소파",
    tags: ["가죽", "리클라이너", "프리미엄", "편안함"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-009", "store-010"]
  },
  {
    id: "sofa-003",
    name: "미니멀 2인 소파",
    brand: "Muji",
    image: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=400&fit=crop",
    category: "소파",
    price: 420000,
    description: "깔끔한 디자인의 2인용 소파",
    tags: ["미니멀", "2인용", "컴팩트", "심플"],
    externalUrl: "https://store.ohou.se/exhibitions/15601",
    storeIds: ["store-005", "store-012"]
  },

  // 침대 카테고리
  {
    id: "bed-001",
    name: "원목 퀸 침대",
    brand: "Crate & Barrel",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=400&fit=crop",
    category: "침대",
    price: 550000,
    description: "따뜻한 원목 소재의 퀸사이즈 침대",
    tags: ["원목", "퀸사이즈", "내츄럴", "따뜻함"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-011", "store-002"]
  },
  {
    id: "bed-002",
    name: "모던 킹 침대",
    brand: "Room & Board",
    image: "https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=400&h=400&fit=crop",
    category: "침대",
    price: 750000,
    description: "세련된 디자인의 킹사이즈 침대",
    tags: ["모던", "킹사이즈", "세련됨", "고급"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-011", "store-008"]
  },

  // 수납가구 카테고리
  {
    id: "storage-001",
    name: "북쉘프",
    brand: "IKEA",
    image: "https://images.unsplash.com/photo-1549497538-303791108f95?w=400&h=400&fit=crop",
    category: "수납가구",
    price: 320000,
    description: "5단 원목 북쉘프",
    tags: ["북쉘프", "원목", "5단", "수납"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-001", "store-006"]
  },
  {
    id: "storage-002",
    name: "서랍장",
    brand: "Wayfair",
    image: "https://images.unsplash.com/photo-1586627404012-e5380fb86399?w=400&h=400&fit=crop",
    category: "수납가구",
    price: 280000,
    description: "4단 서랍장",
    tags: ["서랍장", "4단", "수납", "정리"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-006", "store-008"]
  },

  // 조명 카테고리
  {
    id: "light-001",
    name: "펜던트 조명",
    brand: "Philips",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop",
    category: "조명",
    price: 180000,
    description: "모던한 펜던트 조명",
    tags: ["펜던트", "모던", "LED", "따뜻한빛"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-003", "store-007"]
  },
  {
    id: "light-002",
    name: "플로어 램프",
    brand: "IKEA",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
    category: "조명",
    price: 220000,
    description: "심플한 디자인의 플로어 램프",
    tags: ["플로어램프", "심플", "독서등", "간접조명"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-001", "store-012"]
  },

  // 장식품 카테고리
  {
    id: "deco-001",
    name: "세라믹 화분",
    brand: "CB2",
    image: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=400&fit=crop",
    category: "장식품",
    price: 45000,
    description: "수제 세라믹 화분",
    tags: ["화분", "세라믹", "수제", "식물"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-005", "store-010"]
  },
  {
    id: "deco-002",
    name: "미러 월아트",
    brand: "Urban Outfitters",
    image: "https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=400&h=400&fit=crop",
    category: "장식품",
    price: 120000,
    description: "기하학적 디자인의 미러 장식",
    tags: ["미러", "월아트", "기하학적", "모던"],
    externalUrl: "https://www.iloom.com/product/detail.do?productCd=IAL00NT16A",
    storeIds: ["store-009", "store-012"]
  }
];

// 랜덤 제품 가져오기 함수
export function getRandomProduct(category?: string): Product {
  let filteredProducts = products;
  
  if (category && category !== "전체") {
    filteredProducts = products.filter(product => product.category === category);
  }
  
  const randomIndex = Math.floor(Math.random() * filteredProducts.length);
  return filteredProducts[randomIndex];
}

// 유사 제품 찾기 함수
export function findSimilarProducts(productId: string, count: number = 3): Product[] {
  const currentProduct = products.find(p => p.id === productId);
  if (!currentProduct) return [];
  
  // 같은 카테고리의 다른 제품들을 우선 찾기
  const sameCategoryProducts = products.filter(product => 
    product.id !== productId && 
    product.category === currentProduct.category
  );
  
  // 같은 카테고리 제품이 부족하면 다른 카테고리 제품도 포함
  let similarProducts = [...sameCategoryProducts];
  
  if (similarProducts.length < count) {
    const otherProducts = products.filter(product => 
      product.id !== productId && 
      product.category !== currentProduct.category
    );
    similarProducts = [...similarProducts, ...otherProducts];
  }
  
  // 랜덤하게 섞어서 요청된 개수만큼 반환
  const shuffled = similarProducts.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// 카테고리별 제품 개수 가져오기
export function getProductCountByCategory(category: string): number {
  if (category === "전체") return products.length;
  return products.filter(product => product.category === category).length;
}

// 특정 카테고리의 모든 제품 가져오기
export function getProductsByCategory(category: string): Product[] {
  if (category === "전체") return products;
  return products.filter(product => product.category === category);
}
