import type { UnifiedProduct } from "@/types/unified-product";

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
  _unified?: UnifiedProduct; // 프리미엄 브랜드 전체 데이터 (상세페이지용)
  similarity?: number; // AI 검색 유사도 점수
}

// 카테고리 배열 (프리미엄 브랜드 통합 카테고리)
export const categories = [
  "전체",
  "소파",
  "침대",
  "의자",
  "테이블",
  "책상",
  "옷장",
  "수납",
  "주방",
  "조명",
  "키즈",
  "화장대",
  "중문",
];

// 프리미엄 브랜드 제품 사용 (상세페이지 크롤링 완료된 8개 브랜드)
import { premiumProductsCompat } from "./premium-products";

export const products: Product[] = premiumProductsCompat;

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
