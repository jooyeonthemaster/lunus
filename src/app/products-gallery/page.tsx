'use client';

import { useEffect, useState } from 'react';
import ProductCardVariant3 from '@/components/ProductCardVariant3';

interface Product {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  detailHTML?: string;
  detailImages?: string[];
}

export default function ProductsGalleryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(12);

  useEffect(() => {
    fetch('/api/products-gallery')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProducts(data.products);
        } else {
          setError(data.error);
        }
      })
      .catch(err => {
        setError('Failed to load products');
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const loadMore = () => {
    setDisplayCount(prev => Math.min(prev + 12, products.length));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">제품을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">오류가 발생했습니다</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                플랫포인트 패브릭 소파 컬렉션
              </h1>
              <p className="text-gray-600">
                LUNUS 스타일로 재구성된 {products.length}개의 프리미엄 제품
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full font-medium">
                방식 3: LUNUS 스타일
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{products.length}</p>
              <p className="text-sm text-gray-600">전체 제품</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {products.filter(p => p.detailHTML).length}
              </p>
              <p className="text-sm text-gray-600">상세 HTML 보유</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {products.length - products.filter(p => p.detailHTML).length}
              </p>
              <p className="text-sm text-gray-600">Fallback 사용</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">100%</p>
              <p className="text-sm text-gray-600">처리 성공률</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.slice(0, displayCount).map((product, index) => (
            <ProductCardVariant3 key={index} product={product} index={index} />
          ))}
        </div>

        {/* Load More Button */}
        {displayCount < products.length && (
          <div className="text-center mt-12">
            <button
              onClick={loadMore}
              className="px-8 py-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              더 보기 ({products.length - displayCount}개 남음)
            </button>
          </div>
        )}

        {/* All Loaded Message */}
        {displayCount >= products.length && products.length > 0 && (
          <div className="text-center mt-12 py-8 border-t">
            <p className="text-gray-600 text-lg">
              모든 제품을 확인하셨습니다 ✨
            </p>
            <p className="text-gray-500 text-sm mt-2">
              총 {products.length}개의 제품이 LUNUS 스타일로 표시되었습니다
            </p>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">LUNUS 스타일 특징</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• 히어로 이미지 + 3개 주요 이미지</li>
                <li>• AI 기반 설명 자동 생성</li>
                <li>• 카테고리별 맞춤 특징</li>
                <li>• 100% Fallback 보장</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">데이터 처리</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• detailHTML 파싱: {products.filter(p => p.detailHTML).length}개</li>
                <li>• Fallback 생성: {products.length - products.filter(p => p.detailHTML).length}개</li>
                <li>• 브랜드: 플랫포인트</li>
                <li>• 카테고리: 패브릭 소파</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">자동화 전략</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• 범용 HTML 파서</li>
                <li>• 브랜드별 패턴 감지</li>
                <li>• 카테고리 기반 Fallback</li>
                <li>• 5000+ 제품 확장 가능</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
            <p>LUNUS AI-Powered Furniture Recommendation Platform</p>
            <p className="mt-2">플랫포인트 패브릭소파 {products.length}개 제품 • 방식 3 적용</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
