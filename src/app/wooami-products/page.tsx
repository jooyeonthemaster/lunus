"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// 우아미 제품 데이터 import
import wooamiProducts from "../../../data/우아미/products.json";

export default function WooamiProductsPage() {
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("전체");

  // 카테고리 목록
  const categories = ["전체", "거실소파", "거실장", "침대", "매트리스", "옷장", "서랍장", "주방", "홈오피스", "화장대"];

  useEffect(() => {
    // 카테고리 정보 추가 (URL에서 추정)
    const enrichedProducts = wooamiProducts.map((p: any) => ({
      ...p,
      category: getCategoryFromUrl(p.productUrl)
    }));
    setAllProducts(enrichedProducts);
  }, []);

  // URL에서 카테고리 추정
  function getCategoryFromUrl(url: string): string {
    if (!url) return "기타";
    
    // cate_no 파라미터로 카테고리 매핑
    const cateMap: Record<string, string> = {
      "43": "거실장",
      "44": "서랍장",
      "45": "옷장",
      "49": "홈오피스",
      "48": "화장대",
      "46": "주방",
      "47": "침대",
      "72": "매트리스",
      "70": "거실소파"
    };

    const match = url.match(/cate_no=(\d+)/);
    return match ? (cateMap[match[1]] || "기타") : "기타";
  }

  const filteredProducts =
    selectedCategory === "전체"
      ? allProducts
      : allProducts.filter((p) => p.category === selectedCategory);

  const handleProductClick = (product: any) => {
    const encodedTitle = encodeURIComponent(product.title);
    router.push(`/wooami-detail/${encodedTitle}`);
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
                우아미
              </h1>
              <p className="text-gray-600 text-sm lg:text-base">
                전체 {filteredProducts.length}개 제품
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
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Products Grid */}
      <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
          {filteredProducts.map((product, index) => (
            <div
              key={index}
              onClick={() => handleProductClick(product)}
              className="group cursor-pointer bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              {/* 이미지 */}
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400 text-xs">이미지 없음</span>
                  </div>
                )}
              </div>

              {/* 제품 정보 */}
              <div className="p-3 lg:p-4">
                <p className="text-xs text-gray-500 mb-1">
                  {product.category || "우아미"}
                </p>
                <h3 className="text-sm lg:text-base font-medium text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                  {product.title}
                </h3>
                <p className="text-base lg:text-lg font-bold text-gray-900">
                  {typeof product.price === "number"
                    ? `${product.price.toLocaleString()}원`
                    : product.price || "가격 문의"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 제품 없음 */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">
              해당 카테고리에 제품이 없습니다.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}



