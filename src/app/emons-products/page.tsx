"use client";

import { useState } from "react";
import Link from "next/link";
import emonsSofa from "../../../data/에몬스/emons-소파.json";
import emonsStorage from "../../../data/에몬스/emons-수납가구.json";
import emonsDining from "../../../data/에몬스/emons-식탁.json";
import emonsDoor from "../../../data/에몬스/emons-중문.json";
import emonsBed from "../../../data/에몬스/emons-침대,매트리스.json";
import emonsStudy from "../../../data/에몬스/emons-학생,서재.json";

// 제품 타입 정의
interface EmonsProduct {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  detailImage1?: string;
  detailImage2?: string;
  detailImage3?: string;
  scrapedAt: string;
  category?: string;
}

export default function EmonsProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState("전체");

  // 모든 카테고리
  const categories = ["전체", "소파", "수납가구", "식탁", "중문", "침대·매트리스", "학생·서재"];

  // 카테고리 태그 추가
  const sofaProducts = emonsSofa.map(p => ({ ...p, category: "소파" }));
  const storageProducts = emonsStorage.map(p => ({ ...p, category: "수납가구" }));
  const diningProducts = emonsDining.map(p => ({ ...p, category: "식탁" }));
  const doorProducts = emonsDoor.map(p => ({ ...p, category: "중문" }));
  const bedProducts = emonsBed.map(p => ({ ...p, category: "침대·매트리스" }));
  const studyProducts = emonsStudy.map(p => ({ ...p, category: "학생·서재" }));

  // 모든 제품 데이터 병합
  const allProducts: EmonsProduct[] = [
    ...sofaProducts,
    ...storageProducts,
    ...diningProducts,
    ...doorProducts,
    ...bedProducts,
    ...studyProducts,
  ];

  // 카테고리 필터링
  const filteredProducts = selectedCategory === "전체"
    ? allProducts
    : allProducts.filter(p => p.category === selectedCategory);

  // productId 생성 함수 (productUrl에서 추출)
  const getProductId = (product: EmonsProduct) => {
    const match = product.productUrl.match(/prodId=(\d+)/);
    return match ? match[1] : "";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">🪑 에몬스 제품</h1>
          <p className="text-sm text-gray-600 mt-1">
            총 {allProducts.length}개 제품
          </p>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="bg-white border-b sticky top-[73px] z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 제품 그리드 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product, index) => {
            const productId = getProductId(product);
            return (
              <Link
                key={index}
                href={`/emons-detail/${productId}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="aspect-square relative bg-gray-100">
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
                    {product.title}
                  </h3>
                  <p className="text-lg font-bold text-blue-600">
                    {product.price.toLocaleString()}원
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
