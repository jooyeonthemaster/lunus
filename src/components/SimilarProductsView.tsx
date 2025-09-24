"use client";

import Image from "next/image";
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

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "전체") return similarProducts;
    return similarProducts.filter(p => p.category === selectedCategory);
  }, [similarProducts, selectedCategory]);
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
          {/* PC: 좌우 분할, 모바일: 세로 레이아웃 */}
          <div className="flex flex-col lg:flex-row lg:gap-12">
            {/* Liked Product Section */}
            <div className="lg:w-1/3 lg:sticky lg:top-8 lg:self-start mb-8 lg:mb-0">
              <div className="relative w-full h-64 lg:h-80 rounded-lg overflow-hidden bg-gray-50 mb-4 lg:mb-6">
                <Image
                  src={likedProduct.image}
                  alt={likedProduct.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  priority
                />
              </div>
              <div className="text-center lg:text-left mb-2 lg:mb-3">
                <p className="text-sm lg:text-base text-gray-400 mb-1">{likedProduct.brand}</p>
                <h2 className="text-lg lg:text-2xl font-medium">{likedProduct.name}</h2>
              </div>
              <p className="text-center lg:text-left text-gray-600 text-sm lg:text-base mb-4 lg:mb-6">{likedProduct.description}</p>
              <p className="text-center lg:text-left text-lg lg:text-xl font-bold text-gray-800 mb-6 lg:mb-8">{likedProduct.price.toLocaleString()}원</p>
              
              {/* Back Button - PC에서는 여기에 위치 */}
              <div className="hidden lg:block">
                <button
                  onClick={onBackToMain}
                  className="w-full py-4 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-900 transition-colors"
                >
                  다른 제품 둘러보기
                </button>
              </div>
            </div>

            {/* Similar Products Section */}
            <div className="lg:flex-1">
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 mb-8">
                {filteredProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="bg-white hover:shadow-lg transition-shadow rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => onProductClick?.(product)}
                  >
                    <div className="relative w-full h-40 lg:h-48 overflow-hidden bg-gray-50 mb-3">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
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

              {/* Back Button - 모바일에서만 표시 */}
              <div className="lg:hidden">
                <button
                  onClick={onBackToMain}
                  className="w-full py-4 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-900 transition-colors"
                >
                  다른 제품 둘러보기
                </button>
              </div>
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
