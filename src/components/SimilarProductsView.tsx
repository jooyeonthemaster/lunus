"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/data/products";
import BottomNavigation from "@/components/BottomNavigation";

interface SimilarProductsViewProps {
  likedProduct: Product;
  similarProducts: Product[];
  onBackToMain: () => void;
  onSearchClick?: () => void;
  onMapClick?: () => void;
  onProductClick?: (product: Product) => void;
  onCartClick?: () => void;
}

export default function SimilarProductsView({ 
  likedProduct, 
  similarProducts, 
  onBackToMain,
  onSearchClick,
  onMapClick,
  onProductClick,
  onCartClick
}: SimilarProductsViewProps) {
  const categoryOptions = useMemo(() => {
    const set = new Set<string>([likedProduct.category, ...similarProducts.map(p => p.category)]);
    return ["전체", ...Array.from(set)];
  }, [likedProduct.category, similarProducts]);

  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [showAll, setShowAll] = useState(false);

  const filteredProducts = useMemo(() => {
    const filtered = selectedCategory === "전체"
      ? similarProducts
      : similarProducts.filter(p => p.category === selectedCategory);

    // 처음엔 12개만 표시, "더보기" 클릭하면 전체 표시
    return showAll ? filtered : filtered.slice(0, 12);
  }, [similarProducts, selectedCategory, showAll]);
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-4 lg:px-8 pt-6 lg:pt-24 pb-4 lg:pb-6">
        <div className="text-center mb-4 lg:mb-6">
          <h1 className="text-3xl lg:text-5xl font-normal tracking-[0.15em] mb-2 lg:mb-4">LUNUS</h1>
          <p className="text-gray-600 text-sm lg:text-lg">비슷한 제품을 찾았어요</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 lg:px-8 pb-20 lg:pb-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* 모바일/PC 모두 세로 레이아웃 */}
          <div className="flex flex-col">
            {/* Liked Product Section */}
            <div className="w-full mb-8 lg:mb-12">
              <div className="flex flex-col lg:flex-row lg:items-start lg:gap-8">
                {/* 제품 이미지 */}
                <div className="relative w-full lg:w-80 h-64 lg:h-80 rounded-lg overflow-hidden bg-gray-50 mb-4 lg:mb-0 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={likedProduct.image}
                    alt={likedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 제품 정보 */}
                <div className="flex-1">
                  <div className="text-center lg:text-left mb-2 lg:mb-3">
                    <p className="text-sm lg:text-base text-gray-400 mb-1">{likedProduct.brand}</p>
                    <h2 className="text-lg lg:text-2xl font-medium line-clamp-2">{likedProduct.name}</h2>
                  </div>
                  <p className="text-center lg:text-left text-gray-600 text-sm lg:text-base mb-4 lg:mb-6 line-clamp-2">{likedProduct.description}</p>
                  <p className="text-center lg:text-left text-lg lg:text-xl font-bold text-gray-800 mb-6 lg:mb-8">{likedProduct.price.toLocaleString()}원</p>

                  {/* Buttons */}
                  <div className="flex flex-col lg:flex-row gap-3">
                    <button
                      onClick={() => onProductClick?.(likedProduct)}
                      className="w-full lg:flex-1 py-4 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-900 transition-colors"
                    >
                      제품 상세보기
                    </button>
                    <button
                      onClick={onBackToMain}
                      className="w-full lg:flex-1 py-4 bg-gray-100 text-gray-800 rounded-full font-medium hover:bg-gray-200 transition-colors"
                    >
                      다른 제품 둘러보기
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Similar Products Section */}
            <div className="w-full">
              {/* Category Filter */}
              <div className="mb-6 lg:mb-8">
                <h3 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6">비슷한 제품들</h3>
                <div className="flex gap-2 lg:gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex-shrink-0 px-4 lg:px-6 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium whitespace-nowrap ${
                        selectedCategory === cat
                          ? "bg-gray-800 text-white shadow-md"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Similar Products Grid - 반응형: 모바일 2열, 태블릿 3열, PC 3-4열 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 mb-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white hover:shadow-lg transition-shadow rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => onProductClick?.(product)}
                  >
                    <div className="relative w-full h-40 lg:h-48 overflow-hidden bg-gray-50 mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      {/* 유사도 뱃지 */}
                      {(product as any).similarity && (
                        <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-90 text-white text-xs px-2 py-1 rounded-full font-bold">
                          {((product as any).similarity * 100).toFixed(0)}% 유사
                        </div>
                      )}
                    </div>
                    <div className="p-3 lg:p-4">
                      <div className="mb-1 lg:mb-2">
                        <p className="text-xs lg:text-sm text-gray-400 mb-1">{product.brand}</p>
                        <h3 className="text-sm lg:text-base font-medium line-clamp-2">{product.name}</h3>
                      </div>
                      <p className="text-xs lg:text-sm text-gray-500 mb-2 lg:mb-3 line-clamp-2">{product.description}</p>
                      <p className="text-sm lg:text-base font-semibold">{product.price.toLocaleString()}원</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 더보기 버튼 */}
              {!showAll && (selectedCategory === "전체" ? similarProducts.length : similarProducts.filter(p => p.category === selectedCategory).length) > 12 && (
                <div className="text-center mb-8">
                  <button
                    onClick={() => setShowAll(true)}
                    className="px-8 py-3 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-900 transition-colors"
                  >
                    더보기 ({(selectedCategory === "전체" ? similarProducts.length : similarProducts.filter(p => p.category === selectedCategory).length) - 12}개 더)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentView="similar"
        onSearchClick={onSearchClick}
        onMapClick={onMapClick}
        onCartClick={onCartClick}
      />
    </div>
  );
}
