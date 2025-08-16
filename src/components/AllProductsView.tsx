"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/data/products";
import { products, categories } from "@/data/products";
import BottomNavigation from "@/components/BottomNavigation";

interface AllProductsViewProps {
  onBackToMain: () => void;
  onSearchClick?: () => void;
  onMapClick?: () => void;
  onProductClick?: (product: Product) => void;
  onCartClick?: () => void;
}

export default function AllProductsView({ 
  onBackToMain,
  onSearchClick,
  onMapClick,
  onProductClick,
  onCartClick
}: AllProductsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("전체");

  // 선택된 카테고리에 따라 상품 필터링
  const filteredProducts = selectedCategory === "전체" 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-4 lg:px-8 pt-6 lg:pt-24 pb-4 lg:pb-6">
        <div className="text-center mb-4 lg:mb-6">
          <h1 className="text-3xl lg:text-5xl font-normal tracking-[0.15em] mb-2 lg:mb-4">LUNUS</h1>
          <p className="text-gray-600 text-sm lg:text-lg">모든 제품을 둘러보세요</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 lg:px-8 pb-20 lg:pb-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Category Filter */}
          <div className="mb-6 lg:mb-8">
            <h3 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6">카테고리</h3>
            <div className="flex gap-2 lg:gap-3 overflow-x-auto scrollbar-hide pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex-shrink-0 px-4 lg:px-6 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? "bg-gray-800 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Products Count */}
          <div className="mb-4 lg:mb-6">
            <p className="text-sm lg:text-base text-gray-600">
              총 {filteredProducts.length}개의 제품
            </p>
          </div>

          {/* Products Grid - 반응형: 모바일 2열, 태블릿 3열, PC 4-5열 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 mb-8">
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
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
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

          {/* Back Button */}
          <div className="text-center">
            <button
              onClick={onBackToMain}
              className="px-8 py-3 lg:px-12 lg:py-4 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-900 transition-colors"
            >
              메인으로 돌아가기
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentView="all-products"
        onSearchClick={onSearchClick}
        onMapClick={onMapClick}
        onCartClick={onCartClick}
      />
    </div>
  );
}
