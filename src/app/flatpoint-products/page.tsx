"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Product {
  title: string;
  price: number;
  url: string;
  category: string;
  source: string;
  imageUrl?: string;
}

export default function FlatpointProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await import("../../../flatpoint-all-urls.json");
        const allProducts = data.default as Product[];

        // dob110-mobile, dob110-pc 제외
        const validProducts = allProducts.filter(
          (p) => !p.source.includes("dob110-mobile") && !p.source.includes("dob110-pc")
        );

        setProducts(validProducts);
        setFilteredProducts(validProducts);

        // 카테고리 추출
        const uniqueCategories = Array.from(
          new Set(validProducts.map((p) => p.category))
        ).sort();
        setCategories(uniqueCategories);

        setLoading(false);
      } catch (error) {
        console.error("제품 로드 실패:", error);
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  // 카테고리 필터링
  useEffect(() => {
    let filtered = products;

    if (selectedCategory !== "전체") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [selectedCategory, searchTerm, products]);

  const handleProductClick = (product: Product) => {
    // 파일명 생성 (스크래퍼와 동일한 로직)
    const safeFilename = product.title
      .replace(/[^a-zA-Z0-9가-힣\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 100);

    router.push(`/flatpoint-detail/${encodeURIComponent(safeFilename)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">로딩 중...</div>
          <div className="text-gray-500">플랫포인트 제품 목록을 불러오는 중입니다</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold mb-4">플랫포인트 제품 목록</h1>

          {/* 검색 */}
          <input
            type="text"
            placeholder="제품명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 카테고리 필터 */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("전체")}
            className={`px-4 py-2 rounded-full font-medium transition-colors ${
              selectedCategory === "전체"
                ? "bg-black text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            전체 ({products.length})
          </button>
          {categories.map((category) => {
            const count = products.filter((p) => p.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-black text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {category} ({count})
              </button>
            );
          })}
        </div>

        {/* 제품 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product, index) => (
            <div
              key={index}
              onClick={() => handleProductClick(product)}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
            >
              <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="text-center p-6">
                    <div className="text-6xl mb-4">🪑</div>
                    <div className="text-sm font-medium text-gray-700">
                      {product.category}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2 group-hover:text-blue-600 transition-colors">
                  {product.title}
                </h3>
                <p className="text-gray-600 text-sm mb-2">{product.category}</p>
                {product.price > 0 && (
                  <p className="text-lg font-bold">
                    {product.price.toLocaleString()}원
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 결과 없음 */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="text-2xl font-bold text-gray-400 mb-2">
              검색 결과가 없습니다
            </div>
            <div className="text-gray-500">다른 검색어를 시도해보세요</div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>총 {filteredProducts.length}개 제품</p>
        </div>
      </div>
    </div>
  );
}
