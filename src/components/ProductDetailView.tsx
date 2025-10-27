"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Product } from "@/data/products";
import { furnitureStores, type FurnitureStore } from "@/data/stores";
import BottomNavigation from "@/components/BottomNavigation";

// 모바일 감지 함수
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 1024;
};

interface ProductDetailViewProps {
  product: Product;
  onBackToMain: () => void;
  onSearchClick?: () => void;
  onMapClick?: () => void;
  onCartClick?: () => void;
}

export default function ProductDetailView({ 
  product, 
  onBackToMain,
  onSearchClick,
  onMapClick,
  onCartClick
}: ProductDetailViewProps) {
  const [availableStores, setAvailableStores] = useState<FurnitureStore[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  useEffect(() => {
    // 해당 제품을 볼 수 있는 매장들 찾기
    if (product.storeIds) {
      const stores = furnitureStores.filter(store => 
        product.storeIds?.includes(store.id)
      );
      setAvailableStores(stores);
    }

    // 모바일 감지
    setIsMobile(isMobileDevice());
    
    // 리사이즈 이벤트 리스너
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [product.storeIds]);

  // 유사 제품 로드
  useEffect(() => {
    // product.id가 문자열이므로 숫자로 변환 시도
    const numericId = product.id.match(/\d+/)?.[0];
    if (!numericId) return;

    const loadSimilarProducts = async () => {
      setLoadingSimilar(true);
      try {
        const response = await fetch(`/api/search/similar?productId=${numericId}`);
        const data = await response.json();
        
        if (data.success && data.products) {
          setSimilarProducts(data.products.slice(0, 8));
        }
      } catch (error) {
        console.error('Failed to load similar products:', error);
      } finally {
        setLoadingSimilar(false);
      }
    };

    loadSimilarProducts();
  }, [product.id]);

  return (
    <div className="min-h-screen bg-white">
      {/* 🔥 디버깅: 구형 컴포넌트 확인 */}
      <div style={{
        background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        padding: '12px 20px',
        fontSize: '16px',
        fontWeight: 'bold',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        ❌ 구형 ProductDetailView 컴포넌트
      </div>

      {/* Header */}
      <header className="px-4 lg:px-8 pt-6 lg:pt-24 pb-4 lg:pb-6 bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToMain}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            뒤로가기
          </button>
          <h1 className="text-lg lg:text-xl font-semibold">제품 상세</h1>
          <div className="w-20"></div> {/* 균형을 위한 빈 공간 */}
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 lg:pb-8">
        {/* Product Info Section */}
        <div className="px-4 lg:px-8 py-6 lg:py-8 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:gap-8">
              {/* Product Image */}
              <div className="lg:w-1/3 mb-6 lg:mb-0">
                <div className="relative w-full h-80 lg:h-96 rounded-2xl overflow-hidden bg-white shadow-lg">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    priority
                  />
                </div>
              </div>

              {/* Product Details */}
              <div className="lg:flex-1">
                <div className="mb-4">
                  <p className="text-sm lg:text-base text-gray-500 mb-2">{product.brand}</p>
                  <h2 className="text-2xl lg:text-4xl font-bold mb-4">{product.name}</h2>
                  <p className="text-gray-600 text-base lg:text-lg mb-6">{product.description}</p>
                  <p className="text-3xl lg:text-4xl font-bold text-gray-800 mb-6">{product.price.toLocaleString()}원</p>
                </div>

                {/* Specifications */}
                {product.specifications && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">제품 사양</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {product.specifications.dimensions && (
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">크기</span>
                          <span className="font-medium">{product.specifications.dimensions}</span>
                        </div>
                      )}
                      {product.specifications.material && (
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">소재</span>
                          <span className="font-medium">{product.specifications.material}</span>
                        </div>
                      )}
                      {product.specifications.color && (
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">색상</span>
                          <span className="font-medium">{product.specifications.color}</span>
                        </div>
                      )}
                      {product.specifications.weight && (
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">무게</span>
                          <span className="font-medium">{product.specifications.weight}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* External Site Embed */}
        {product.externalUrl && (
          <div className="px-2 lg:px-8 py-4 lg:py-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-3 lg:mb-4 flex items-center justify-between">
                <h3 className="text-lg lg:text-2xl font-bold">브랜드 공식 페이지</h3>
                <a
                  href={product.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800 transition-colors text-xs lg:text-base"
                >
                  새 창에서 보기
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1 lg:w-4 lg:h-4">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15,3 21,3 21,9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>
              <div className="w-full h-[75vh] lg:h-[85vh] rounded-lg overflow-hidden shadow-lg border border-gray-200">
                <iframe
                  src={`/api/proxy?url=${encodeURIComponent(product.externalUrl)}&mobile=${isMobile}`}
                  className="w-full h-full"
                  title={`${product.brand} 공식 페이지`}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation allow-modals allow-downloads"
                  referrerPolicy="no-referrer-when-downgrade"
                  loading="lazy"
                  allow="fullscreen"
                />
              </div>
            </div>
          </div>
        )}

        {/* Available Stores */}
        {availableStores.length > 0 && (
          <div className="px-4 lg:px-8 py-6 lg:py-8 bg-gray-50">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-xl lg:text-2xl font-bold mb-6">이 제품을 볼 수 있는 매장</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {availableStores.map((store) => (
                  <div key={store.id} className="bg-white rounded-lg p-4 lg:p-6 shadow-md hover:shadow-lg transition-shadow">
                    <div className="mb-3">
                      <h4 className="font-bold text-lg mb-1">{store.name}</h4>
                      <p className="text-sm text-gray-500">{store.category}</p>
                    </div>
                    
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-start">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 mt-0.5 flex-shrink-0">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span className="text-gray-600">{store.address}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12,6 12,12 16,14"/>
                        </svg>
                        <span className="text-gray-600">{store.openHours}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="flex items-center mr-2">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill={i < Math.floor(store.rating) ? "#FCD34D" : "none"}
                              stroke="#FCD34D"
                              strokeWidth="1"
                            >
                              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                            </svg>
                          ))}
                        </div>
                        <span className="text-sm font-medium">{store.rating}</span>
                        <span className="text-xs text-gray-500 ml-1">({store.reviewCount})</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.open(`tel:${store.phone}`, '_self')}
                        className="flex-1 py-2 px-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center justify-center"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        전화
                      </button>
                      {store.website && (
                        <button
                          onClick={() => window.open(store.website, '_blank')}
                          className="py-2 px-3 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Similar Products - AI 기반 유사 제품 추천 */}
        {(loadingSimilar || similarProducts.length > 0) && (
          <div className="px-4 lg:px-8 py-6 lg:py-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl lg:text-2xl font-bold">이 제품과 비슷한 상품</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  AI 추천
                </span>
              </div>

              {loadingSimilar ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-800 mb-4"></div>
                  <p className="text-gray-600">유사한 제품을 찾고 있어요...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                  {similarProducts.map((similar) => (
                    <div 
                      key={similar.id} 
                      className="group cursor-pointer bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
                    >
                      <div className="relative w-full h-48 lg:h-56 bg-gray-100 overflow-hidden">
                        {similar.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={similar.image_url} 
                            alt={similar.title || '제품'} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">이미지 없음</span>
                          </div>
                        )}
                        {/* 유사도 뱃지 */}
                        {similar.similarity && (
                          <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-90 text-white text-xs px-2 py-1 rounded-full">
                            {(similar.similarity * 100).toFixed(0)}% 유사
                          </div>
                        )}
                      </div>
                      <div className="p-3 lg:p-4">
                        <p className="text-xs text-gray-500 mb-1">{similar.brand || '브랜드 없음'}</p>
                        <h4 className="text-sm lg:text-base font-medium line-clamp-2 mb-2 min-h-[2.5rem]">
                          {similar.title || '제품명 없음'}
                        </h4>
                        <p className="text-base lg:text-lg font-bold text-gray-800">
                          {similar.price ? `${similar.price.toLocaleString()}원` : '가격 문의'}
                        </p>
                        {similar.category && (
                          <p className="text-xs text-gray-400 mt-1">#{similar.category}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingSimilar && similarProducts.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">유사한 제품을 찾을 수 없습니다.</p>
                  <p className="text-sm text-gray-400 mt-2">제품이 벡터화되지 않았을 수 있습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentView="main"
        onSearchClick={onSearchClick}
        onMapClick={onMapClick}
        onCartClick={onCartClick}
      />
    </div>
  );
}
