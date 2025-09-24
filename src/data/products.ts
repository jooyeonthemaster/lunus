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
  "소파",
  "옷장",
  "의자",
  "침대",
];

// 외부 스크레이핑 결과를 사용해 제품 목록 구성
import { externalProducts } from "./external";

// Try to load JSON overrides from public/external/products.json at build/runtime.
// Next.js can import JSON from public via fetch in runtime; for build-time, keep TS fallback.
let overrides: Product[] | null = null;
if (typeof window === 'undefined') {
  // Node (build) - no direct file system reads here to keep portability
  overrides = null;
} else {
  // Browser runtime - fetch the JSON once (will be used by pages importing this module)
  try {
    // Note: this fetch is async; keep synchronous export using fallback and allow pages to refetch as needed.
    // For now, prefer build-time externalProducts. If you want strict runtime overrides, wire fetch in page and merge.
  } catch {}
}

export const products: Product[] = externalProducts;

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
