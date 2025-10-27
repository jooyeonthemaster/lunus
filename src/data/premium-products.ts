/**
 * LUNUS Premium Products
 * 
 * 상세페이지 크롤링이 완료된 8개 프리미엄 브랜드 제품 데이터
 */

import type { UnifiedProduct } from "@/types/unified-product";
import type { Product } from "./products";
import premiumData from "../../data/premium-brands-unified.json";

// UnifiedProduct → Product 변환
export function convertToProduct(unified: UnifiedProduct): Product {
  // 한샘 브랜드: thumbnailImages[0]을 우선 사용 (imageUrl이 배지 이미지인 경우가 있음)
  let displayImage = unified.imageUrl;
  if (unified.brand === '한샘' && (unified as any).thumbnailImages && (unified as any).thumbnailImages.length > 0) {
    displayImage = (unified as any).thumbnailImages[0];
  }

  return {
    id: `${unified.source}-${unified.title}-${unified.price}`,
    name: unified.title,
    brand: unified.brand,
    image: displayImage,
    category: unified.category,
    price: unified.price,
    description: unified.title,
    tags: [unified.brand, unified.category],
    externalUrl: unified.productUrl,
    // UnifiedProduct 데이터 전체를 메타데이터로 포함
    _unified: unified as any,
  };
}

// 프리미엄 제품 목록 (UnifiedProduct[])
export const premiumProducts: UnifiedProduct[] = premiumData as UnifiedProduct[];

// 기존 Product[] 형식으로 변환
export const premiumProductsCompat: Product[] = premiumProducts.map(convertToProduct);

// 카테고리별 제품 수 가져오기
export function getPremiumProductCountByCategory(category: string): number {
  if (category === "전체") return premiumProducts.length;
  return premiumProducts.filter((p) => p.category === category).length;
}

// 특정 카테고리의 모든 제품 가져오기
export function getPremiumProductsByCategory(category: string): UnifiedProduct[] {
  if (category === "전체") return premiumProducts;
  return premiumProducts.filter((p) => p.category === category);
}

// 랜덤 제품 가져오기
export function getRandomPremiumProduct(category?: string): UnifiedProduct {
  let filteredProducts = premiumProducts;

  if (category && category !== "전체") {
    filteredProducts = premiumProducts.filter((p) => p.category === category);
  }

  const randomIndex = Math.floor(Math.random() * filteredProducts.length);
  return filteredProducts[randomIndex];
}

// 유사 제품 찾기 (같은 카테고리 우선)
export function findSimilarPremiumProducts(
  productId: string,
  count: number = 3
): UnifiedProduct[] {
  const currentProduct = premiumProducts.find((p) => {
    const id = `${p.source}-${p.title}-${p.price}`;
    return id === productId;
  });

  if (!currentProduct) return [];

  // 같은 카테고리의 다른 제품들을 우선 찾기
  const sameCategoryProducts = premiumProducts.filter((product) => {
    const id = `${product.source}-${product.title}-${product.price}`;
    return id !== productId && product.category === currentProduct.category;
  });

  // 같은 카테고리 제품이 부족하면 다른 카테고리 제품도 포함
  let similarProducts = [...sameCategoryProducts];

  if (similarProducts.length < count) {
    const otherProducts = premiumProducts.filter((product) => {
      const id = `${product.source}-${product.title}-${product.price}`;
      return id !== productId && product.category !== currentProduct.category;
    });
    similarProducts = [...similarProducts, ...otherProducts];
  }

  // 랜덤하게 섞어서 요청된 개수만큼 반환
  const shuffled = similarProducts.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// 브랜드별 제품 가져오기
export function getProductsByBrand(brand: string): UnifiedProduct[] {
  return premiumProducts.filter((p) => p.brand === brand);
}

// 가격 범위로 필터링
export function getProductsByPriceRange(
  minPrice: number,
  maxPrice: number
): UnifiedProduct[] {
  return premiumProducts.filter((p) => p.price >= minPrice && p.price <= maxPrice);
}

// 검색
export function searchPremiumProducts(query: string): UnifiedProduct[] {
  const lowerQuery = query.toLowerCase();
  return premiumProducts.filter(
    (p) =>
      p.title.toLowerCase().includes(lowerQuery) ||
      p.brand.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery)
  );
}

