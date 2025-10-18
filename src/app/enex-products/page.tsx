"use client";

import { useState } from "react";
import Link from "next/link";
import enexKitchen from "../../../data/에넥스/enex-리모델링주방.json";
import enexCloset from "../../../data/에넥스/enex-붙박이장.json";
import enexOffice from "../../../data/에넥스/enex-서재오피스.json";
import enexSofa from "../../../data/에넥스/enex-소파거실.json";
import enexDining from "../../../data/에넥스/enex-식탁다이닝.json";
import enexDress from "../../../data/에넥스/enex-옷장드레스룸.json";
import enexDoor from "../../../data/에넥스/enex-중문.json";
import enexBed from "../../../data/에넥스/enex-침실가구.json";

// 제품 타입 정의
interface EnexProduct {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  detailImages?: string[];
  scrapedDetailAt?: string;
  category?: string;
}

export default function EnexProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState("전체");

  // 전체 카테고리
  const categories = [
    "전체",
    "리모델링주방",
    "붙박이장",
    "서재오피스",
    "소파거실",
    "식탁다이닝",
    "옷장드레스룸",
    "중문",
    "침실가구",
  ];

  // 카테고리 태그 추가
  const kitchenProducts = enexKitchen.map((p) => ({ ...p, category: "리모델링주방" }));
  const closetProducts = enexCloset.map((p) => ({ ...p, category: "붙박이장" }));
  const officeProducts = enexOffice.map((p) => ({ ...p, category: "서재오피스" }));
  const sofaProducts = enexSofa.map((p) => ({ ...p, category: "소파거실" }));
  const diningProducts = enexDining.map((p) => ({ ...p, category: "식탁다이닝" }));
  const dressProducts = enexDress.map((p) => ({ ...p, category: "옷장드레스룸" }));
  const doorProducts = enexDoor.map((p) => ({ ...p, category: "중문" }));
  const bedProducts = enexBed.map((p) => ({ ...p, category: "침실가구" }));

  // 모든 제품 데이터 병합
  const allProducts: EnexProduct[] = [
    ...kitchenProducts,
    ...closetProducts,
    ...officeProducts,
    ...sofaProducts,
    ...diningProducts,
    ...dressProducts,
    ...doorProducts,
    ...bedProducts,
  ];

  // 카테고리 필터링
  const filteredProducts =
    selectedCategory === "전체"
      ? allProducts
      : allProducts.filter((p) => p.category === selectedCategory);

  // productId 생성 함수 (goodsNo 추출)
  const getProductId = (product: EnexProduct) => {
    const match = product.productUrl.match(/goodsNo=(\d+)/);
    return match ? match[1] : "";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">🏠 에넥스 제품</h1>
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
                href={`/enex-detail/${productId}`}
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
