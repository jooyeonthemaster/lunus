"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 인아트 제품 데이터 import
import inartSofa from "../../../data/인아트/inart-소파.json";
import inartCloset from "../../../data/인아트/inart-옷장, 수납장.json";
import inartChair from "../../../data/인아트/inart-의자.json";
import inartBed from "../../../data/인아트/inart-침대.json";
import inartTable from "../../../data/인아트/inart-테이블.json";

export default function InartProductsPage() {
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("전체");

  // 카테고리 목록
  const categories = ["전체", "소파", "침대", "테이블", "의자", "옷장·수납장"];

  useEffect(() => {
    // 모든 제품 데이터 병합
    const allData = [
      ...inartSofa.map((p: any) => ({ ...p, category: "소파" })),
      ...inartCloset.map((p: any) => ({ ...p, category: "옷장·수납장" })),
      ...inartChair.map((p: any) => ({ ...p, category: "의자" })),
      ...inartBed.map((p: any) => ({ ...p, category: "침대" })),
      ...inartTable.map((p: any) => ({ ...p, category: "테이블" }))
    ];
    setAllProducts(allData);
  }, []);

  const filteredProducts =
    selectedCategory === "전체"
      ? allProducts
      : allProducts.filter((p) => p.category === selectedCategory);

  const handleProductClick = (product: any) => {
    // productUrl에서 no 파라미터 추출
    const match = product.productUrl.match(/no=(\d+)/);
    const productId = match ? match[1] : encodeURIComponent(product.title);
    router.push(`/inart-detail/${productId}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="mr-2"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm lg:text-base">홈으로</span>
          </button>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                인아트
              </h1>
              <p className="text-gray-600 text-sm lg:text-base">
                자연을 닮은 원목 가구 · 전체 {filteredProducts.length}개 제품
              </p>
            </div>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                  ${
                    selectedCategory === category
                      ? "bg-gray-900 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 lg:px-8 pb-20">
        <div className="max-w-[1400px] mx-auto">
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center text-gray-400">
                <p className="text-lg">제품을 불러오는 중...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 mt-8">
              {filteredProducts.map((product: any, index: number) => (
                <div
                  key={`${product.productUrl}-${index}`}
                  onClick={() => handleProductClick(product)}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer border border-gray-100 hover:border-gray-300"
                >
                  {/* 제품 이미지 */}
                  <div className="relative w-full aspect-square bg-gray-50">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='16' font-family='sans-serif'%3E이미지 없음%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>

                  {/* 제품 정보 */}
                  <div className="p-3 lg:p-4">
                    <div className="inline-block px-2 py-1 bg-green-50 rounded text-xs text-green-700 mb-2">
                      {product.category || "기타"}
                    </div>
                    <h3 className="text-sm lg:text-base font-medium text-gray-900 mb-2 line-clamp-2 min-h-[40px]">
                      {product.title}
                    </h3>
                    <p className="text-base lg:text-lg font-bold text-gray-900">
                      {typeof product.price === 'number'
                        ? `${product.price.toLocaleString()}원`
                        : "가격 문의"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 text-center">
          <p className="text-sm text-gray-500 mb-2">
            인아트 - 자연을 닮은 원목 가구
          </p>
          <p className="text-xs text-gray-400">Natural Wood Furniture</p>
        </div>
      </footer>
    </div>
  );
}
