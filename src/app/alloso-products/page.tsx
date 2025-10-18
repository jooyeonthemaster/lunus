"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface AllosoProduct {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  detailImage1?: string;
  detailText1?: string;
  detailImage2?: string;
  detailText2?: string;
  detailImages?: string[];
  sameCollection?: any[];
  scrapedAt?: string;
  scrapedDetailAt?: string;
}

export default function AllosoProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AllosoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("소파");

  const categories = ["소파", "스토리지", "의자", "테이블"];

  useEffect(() => {
    loadProducts();
  }, [category]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Import from local data files
      const categoryMap: { [key: string]: string } = {
        "소파": "alloso-소파.json",
        "스토리지": "alloso-스토리지.json",
        "의자": "alloso-의자.json",
        "테이블": "alloso-테이블.json"
      };

      const fileName = categoryMap[category];
      console.log('🔍 Loading alloso products:', fileName);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

      const response = await fetch(`/api/alloso-products?category=${fileName}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Loaded products:', data.count);
      
      setProducts(data.products || []);
    } catch (error: any) {
      console.error("Failed to load products:", error);
      if (error.name === 'AbortError') {
        console.error('Request timeout - file too large');
        alert('파일이 너무 커서 로딩에 시간이 걸립니다. 잠시만 기다려주세요.');
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const getProductId = (url: string) => {
    const match = url.match(/productCd=([^&]+)/);
    return match ? match[1] : '';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-4 py-6 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.push('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mr-2">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm">홈으로</span>
          </button>

          <div className="inline-block px-3 py-1 bg-blue-50 rounded-full text-xs font-medium text-blue-700 mb-3">
            알로소 • 디자인 리클라이너의 새로운 기준
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">알로소 제품 목록</h1>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  category === cat
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Product Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-gray-400">로딩 중...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-gray-400">제품이 없습니다</div>
          </div>
        ) : (
          <>
            <div className="mb-6 text-gray-600">
              총 <span className="font-bold text-blue-600">{products.length}</span>개 제품
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product, index) => (
                <div
                  key={index}
                  onClick={() => router.push(`/alloso-detail/${getProductId(product.productUrl)}`)}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer border border-gray-100"
                >
                  <div className="relative w-full h-48 bg-gray-50">
                    <Image
                      src={product.imageUrl}
                      alt={product.title}
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm">
                      {product.title}
                    </h3>
                    <p className="text-blue-600 font-bold text-sm">
                      {product.price.toLocaleString()}원
                    </p>
                    {product.detailImages && product.detailImages.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        📸 상세 이미지 {product.detailImages.length}개
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

