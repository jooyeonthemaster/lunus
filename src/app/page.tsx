"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { products, getRandomProduct, findSimilarProducts, categories } from "@/data/products";
import type { Product } from "@/data/products";
import { PREMIUM_BRANDS } from "@/types/unified-product";
import SimilarProductsView from "@/components/SimilarProductsView";
import PhotoSearchView from "@/components/PhotoSearchView";
import MapView from "@/components/MapView";
import AllProductsView from "@/components/AllProductsView";
import AllCrawledProductsView from "@/components/AllCrawledProductsView";
import ProductDetailView from "@/components/ProductDetailView";
import UnifiedProductDetail from "@/components/UnifiedProductDetail";
import BottomNavigation from "@/components/BottomNavigation";

export default function Home() {
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [currentView, setCurrentView] = useState<"main" | "similar" | "photo-search" | "map" | "all-products" | "crawled" | "product-detail">("main");
  const [likedProduct, setLikedProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTestBrand, setSelectedTestBrand] = useState(PREMIUM_BRANDS[0].source);

  useEffect(() => {
    setCurrentProduct(getRandomProduct());
  }, []);

  const handleEvaluation = (evaluation: "like" | "maybe" | "dislike") => {
    if (!currentProduct) return;

    if (evaluation === "like") {
      // 좋아요 클릭 시 유사 제품 페이지로 이동
      const similar = findSimilarProducts(currentProduct.id, 8);
      setLikedProduct(currentProduct);
      setSimilarProducts(similar);
      setCurrentView("similar");
    } else {
      // 고민돼요, 별로에요 클릭 시 다음 제품 보여주기
      const nextProduct = getRandomProduct(selectedCategory === "전체" ? undefined : selectedCategory);
      setCurrentProduct(nextProduct);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // 카테고리 변경 시 즉시 새로운 제품 표시
    const nextProduct = getRandomProduct(category === "전체" ? undefined : category);
    setCurrentProduct(nextProduct);
  };

  const handleBackToMain = () => {
    setCurrentView("main");
    setSelectedCategory("전체");
    const nextProduct = getRandomProduct();
    setCurrentProduct(nextProduct);
  };

  const handlePhotoSearch = () => {
    setCurrentView("photo-search");
  };

  const handleMapView = () => {
    setCurrentView("map");
  };

  const handleAllProducts = () => {
    setCurrentView("all-products");
  };

  const handleCrawledProducts = () => {
    setCurrentView("crawled");
  };

  const handlePhotoSelected = async (file: File) => {
    setUploadedPhoto(file);
    
    try {
      // FormData 생성
      const formData = new FormData();
      formData.append('image', file);
      
      // API 호출
      const response = await fetch('/api/search/similar', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      console.log('🔍 API Response:', data);
      console.log('📊 Products count:', data.products?.length);
      console.log('📦 First product:', data.products?.[0]);
      
      if (data.success && data.products && data.products.length > 0) {
        // Supabase 제품을 external.ts Product 형식으로 변환
        console.log('✅ Converting', data.products.length, 'products');
        const convertedProducts = data.products.map((p: any) => ({
          id: p.id || 'unknown',
          name: p.title || '제품명 없음',
          brand: p.brand || '브랜드 없음',
          image: p.image_url || '',
          category: p.category || '기타',
          price: p.price || 0,
          description: p.title || '',
          tags: [],
          externalUrl: p.url || undefined,
          similarity: p.similarity  // 유사도 추가!
        })).slice(0, 20);  // 8개 → 20개로 증가
        
        console.log('🎯 Converted products:', convertedProducts.map((p: Product) => 
          `${p.name} (${p.category}) - ${p.similarity ? (p.similarity * 100).toFixed(1) : 'N/A'}%`
        ));
        
        setSimilarProducts(convertedProducts);
        setCurrentView("similar");
      } else {
        // API 실패 시 임시로 랜덤 제품 표시
        console.warn('API returned no products, using fallback');
        const randomProducts = products.sort(() => 0.5 - Math.random()).slice(0, 8);
        setSimilarProducts(randomProducts);
        setCurrentView("similar");
      }
    } catch (error) {
      console.error('Photo search error:', error);
      // 에러 시 임시로 랜덤 제품 표시
      const randomProducts = products.sort(() => 0.5 - Math.random()).slice(0, 8);
      setSimilarProducts(randomProducts);
      setCurrentView("similar");
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView("product-detail");
  };

  // 상품 상세 뷰 렌더링 (프리미엄 브랜드는 UnifiedProductDetail 사용)
  if (currentView === "product-detail" && selectedProduct) {
    // 프리미엄 브랜드 제품이면 통일된 상세페이지 사용
    if (selectedProduct._unified) {
      return (
        <UnifiedProductDetail
          product={selectedProduct._unified}
          onBackToMain={handleBackToMain}
          onSearchClick={handlePhotoSearch}
          onMapClick={handleMapView}
          onCartClick={handleAllProducts}
        />
      );
    }
    
    // 기존 제품은 기존 상세페이지 사용
    return (
      <ProductDetailView
        product={selectedProduct}
        onBackToMain={handleBackToMain}
        onSearchClick={handlePhotoSearch}
        onMapClick={handleMapView}
        onCartClick={handleAllProducts}
      />
    );
  }

  // 사진 검색 뷰 렌더링
  if (currentView === "photo-search") {
    return (
      <PhotoSearchView
        onBackToMain={handleBackToMain}
        onPhotoSelected={handlePhotoSelected}
        onMapClick={handleMapView}
      />
    );
  }

  // 지도 뷰 렌더링
  if (currentView === "map") {
    return (
      <MapView
        onBackToMain={handleBackToMain}
        onSearchClick={handlePhotoSearch}
        onCartClick={handleAllProducts}
      />
    );
  }

  // 전체 상품 뷰 렌더링
  if (currentView === "all-products") {
    return (
      <AllProductsView
        onBackToMain={handleBackToMain}
        onSearchClick={handlePhotoSearch}
        onMapClick={handleMapView}
        onProductClick={handleProductClick}
        onCartClick={handleAllProducts}
      />
    );
  }

  if (currentView === "crawled") {
    return (
      <AllCrawledProductsView
        onBackToMain={handleBackToMain}
        onSearchClick={handlePhotoSearch}
        onMapClick={handleMapView}
        onCartClick={handleAllProducts}
      />
    );
  }

  // 유사 제품 뷰 렌더링 (좋아요 클릭 또는 사진 업로드 후)
  if (currentView === "similar" && similarProducts.length > 0) {
    return (
      <SimilarProductsView
        likedProduct={likedProduct || {
          id: "uploaded-photo",
          name: "업로드한 사진",
          brand: "AI 분석",
          image: uploadedPhoto ? URL.createObjectURL(uploadedPhoto) : "",
          category: "사진",
          price: 0,
          description: "AI가 분석한 유사 제품들",
          tags: []
        }}
        similarProducts={similarProducts}
        onBackToMain={handleBackToMain}
        onSearchClick={handlePhotoSearch}
        onMapClick={handleMapView}
        onProductClick={handleProductClick}
        onCartClick={handleAllProducts}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - PC에서는 상단 네비게이션 고려한 여백, 모바일에서는 기존과 동일 */}
      <header className="px-4 lg:px-8 pt-6 lg:pt-24 pb-4 lg:pb-6">
        <div className="text-center mb-6 lg:mb-8">
          <h1 className="text-3xl lg:text-5xl font-normal tracking-[0.15em] mb-2 lg:mb-4">LUNUS</h1>
          <p className="text-gray-600 text-sm lg:text-lg">취향에 딱 맞는 제품을 찾아드려요</p>
          
          {/* 브랜드별 상세페이지 테스트 */}
          <div className="mt-6 bg-gray-50 rounded-2xl p-6 max-w-2xl mx-auto border-2 border-gray-200">
            <h3 className="text-lg font-bold mb-4 text-gray-800">🔍 상세페이지 테스트</h3>
            
            {/* 브랜드 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">브랜드 선택</label>
              <select
                value={selectedTestBrand}
                onChange={(e) => setSelectedTestBrand(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-base font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent cursor-pointer"
              >
                {PREMIUM_BRANDS.map((brand) => (
                  <option key={brand.source} value={brand.source}>
                    {brand.brand} ({products.filter(p => p.brand === brand.brand).length}개 제품)
                  </option>
                ))}
              </select>
            </div>
            
            {/* 1안, 2안, 3안, 4안 버튼 */}
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((index) => {
                const brandProducts = products.filter(p => 
                  p.brand === PREMIUM_BRANDS.find(b => b.source === selectedTestBrand)?.brand
                );
                const product = brandProducts[index];
                
                // 4안은 특별 처리 (HTML 원본 렌더링)
                if (index === 3) {
                  return (
                    <button
                      key={index}
                      onClick={() => window.location.href = `/product-v4/${selectedTestBrand}`}
                      className="flex-1 px-4 py-4 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white rounded-xl font-bold shadow-md hover:shadow-xl transition-all transform hover:scale-105"
                    >
                      <div className="text-sm opacity-80 mb-1">4안</div>
                      <div className="text-xs">원본 HTML</div>
                      <div className="text-xs mt-1 opacity-70">🎨 실제 사이트</div>
                    </button>
                  );
                }
                
                return product ? (
                  <button
                    key={index}
                    onClick={() => handleProductClick(product)}
                    className="flex-1 px-4 py-4 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white rounded-xl font-bold shadow-md hover:shadow-xl transition-all transform hover:scale-105"
                  >
                    <div className="text-sm opacity-80 mb-1">{index + 1}안</div>
                    <div className="text-xs truncate">{product.name}</div>
                    <div className="text-xs mt-1 opacity-70">{product.price.toLocaleString()}원</div>
                  </button>
                ) : (
                  <div key={index} className="flex-1 px-4 py-4 bg-gray-200 rounded-xl text-gray-400 text-center">
                    <div className="text-sm">제품 없음</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center">
          <div className="flex gap-2 lg:gap-4 overflow-x-auto scrollbar-hide pb-2 max-w-4xl">
            {categories.map((category: string) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`
                  flex-shrink-0 px-4 lg:px-6 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium transition-all whitespace-nowrap
                  ${selectedCategory === category 
                    ? 'bg-gray-800 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 lg:px-8 pb-20 lg:pb-8">
        {currentProduct ? (
          <div className="max-w-7xl mx-auto">
            {/* PC: 좌우 분할 레이아웃, 모바일: 세로 레이아웃 */}
            <div className="flex flex-col lg:flex-row lg:gap-12 lg:items-center">
              {/* 제품 이미지 */}
              <div className="lg:flex-1 lg:max-w-2xl">
                <div 
                  className="relative w-full h-80 lg:h-96 xl:h-[500px] mb-6 lg:mb-0 overflow-hidden rounded-lg bg-gray-50 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleProductClick(currentProduct)}
                >
                  <Image
                    src={currentProduct.image}
                    alt={currentProduct.name}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                  {/* 클릭 힌트 오버레이 */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-90 rounded-full p-3">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* 제품 정보 및 평가 */}
              <div className="lg:flex-1 lg:max-w-xl lg:pl-8">
                {/* 제품 정보 */}
                <div className="mb-8 lg:mb-12">
                  <h2 className="text-xl lg:text-3xl font-bold mb-3 lg:mb-4">{currentProduct.name}</h2>
                  <p className="text-gray-600 text-sm lg:text-base mb-4 lg:mb-6">{currentProduct.description}</p>
                  <p className="text-lg lg:text-2xl font-bold text-gray-800">{currentProduct.price.toLocaleString()}원</p>
                </div>

                {/* Question */}
                <p className="text-center lg:text-left text-lg lg:text-xl font-bold mb-8 lg:mb-10">이 제품은 어떤가요?</p>

                {/* Evaluation Buttons */}
                <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
                  <button
                    onClick={() => handleEvaluation("like")}
                    className="flex-1 py-4 lg:py-5 px-4 lg:px-6 bg-gray-50 hover:bg-gray-100 rounded-full text-sm lg:text-base font-medium transition-colors text-gray-700"
                  >
                    좋아요
                  </button>
                  <button
                    onClick={() => handleEvaluation("maybe")}
                    className="flex-1 py-4 lg:py-5 px-4 lg:px-6 bg-gray-300 hover:bg-gray-400 rounded-full text-sm lg:text-base font-medium transition-colors text-gray-800"
                  >
                    고민돼요
                  </button>
                  <button
                    onClick={() => handleEvaluation("dislike")}
                    className="flex-1 py-4 lg:py-5 px-4 lg:px-6 bg-gray-600 hover:bg-gray-700 text-white rounded-full text-sm lg:text-base font-medium transition-colors"
                  >
                    별로에요
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center text-gray-400">
              <p className="text-lg lg:text-xl">로딩 중...</p>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentView={currentView === "product-detail" ? "main" : currentView}
        onSearchClick={handlePhotoSearch}
        onMapClick={handleMapView}
        onCartClick={handleCrawledProducts}
      />
    </div>
  );
}