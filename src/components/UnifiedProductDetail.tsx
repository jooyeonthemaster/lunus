"use client";

import { useState } from "react";
import Image from "next/image";
import type { UnifiedProduct } from "@/types/unified-product";
import BottomNavigation from "@/components/BottomNavigation";

interface UnifiedProductDetailProps {
  product: UnifiedProduct;
  onBackToMain: () => void;
  onSearchClick?: () => void;
  onMapClick?: () => void;
  onCartClick?: () => void;
}

export default function UnifiedProductDetail({
  product,
  onBackToMain,
  onSearchClick,
  onMapClick,
  onCartClick,
}: UnifiedProductDetailProps) {
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});

  const handleImageError = (imageKey: string) => {
    setImageErrors((prev) => ({ ...prev, [imageKey]: true }));
  };

  const isImageValid = (url: string | undefined, key: string) => {
    return url && url.trim() !== "" && !imageErrors[key];
  };

  // 🔥 브랜드별 데이터 구조 처리
  const brand = product.brand?.toLowerCase() || "";
  const productAny = product as any;
  
  // 🔥 알로소: detailImage1, detailText1, detailImage2, detailText2
  const allosoImages = (brand.includes("알로소") || brand.includes("alloso")) && productAny.detailImage1 ? [
    { url: product.imageUrl, text: "" },
    { url: productAny.detailImage1, text: productAny.detailText1 },
    { url: productAny.detailImage2, text: productAny.detailText2 },
  ].filter(img => img.url && img.url.trim() !== "") : [];

  // 🔥 에몬스: detailImage1, detailImage2, detailImage3 (텍스트 없음)
  const emonsImages = (brand.includes("에몬스") || brand.includes("emons")) && productAny.detailImage1 ? [
    { url: product.imageUrl, text: "" },
    { url: productAny.detailImage1, text: "" },
    { url: productAny.detailImage2, text: "" },
    { url: productAny.detailImage3, text: "" },
  ].filter(img => img.url && img.url.trim() !== "") : [];

  // 🔥 플랫포인트: detailImages (대량)
  const flatpointImages = (brand.includes("플랫포인트") || brand.includes("flatpoint")) && productAny.detailImages 
    ? productAny.detailImages || [] 
    : [];

  // 🔥 일룸: galleryImages + detailImages
  const iloomImages = (brand.includes("일룸") || brand.includes("iloom")) && productAny.galleryImages ? [
    product.imageUrl,
    ...productAny.galleryImages,
    ...(product.detailImages || []),
  ].filter((url) => url && url.trim() !== "") : [];

  // 🔥 인아트: detailImage (단일 이미지)
  const inartImages = (brand.includes("인아트") || brand.includes("inart")) && productAny.detailImage ? [
    product.imageUrl,
    productAny.detailImage,
  ].filter((url) => url && url.trim() !== "") : [];

  // 🔥 한샘: thumbnailImages + detailImages (최대 6개로 제한)
  const hanssemImages = (brand.includes("한샘") || brand.includes("hanssem")) && product.thumbnailImages ? [
    product.imageUrl,
    ...(product.thumbnailImages || []).slice(0, 4), // 썸네일 최대 4개
    ...(product.detailImages || []).slice(0, 1), // 상세 이미지 1개
  ].filter((url) => url && url.trim() !== "") : [];

  // 🔥 기타 브랜드: 표준 구조 (우아미 제외)
  const isExcludedBrand = brand.includes("우아미") || brand.includes("wooami");
  const standardImages = !isExcludedBrand ? [
    product.imageUrl,
    ...(product.thumbnailImages || []),
    ...(product.detailImages || []),
  ].filter((url) => url && url.trim() !== "") : [];

  // ⭐ 일룸 HTML 렌더링 모드 체크
  const isIloomHTMLMode = (brand.includes("일룸") || brand.includes("iloom")) && productAny.detailHTML && productAny.detailHTML.length > 0;

  // 🔥 최종 이미지 리스트 (브랜드별로 적절한 데이터 사용)
  let allDetailImages: Array<{ url: string; text?: string }> = [];
  
  if (allosoImages.length > 0) {
    // 알로소: 이미지 + 텍스트 쌍
    allDetailImages = allosoImages;
  } else if (emonsImages.length > 0) {
    // 에몬스: 이미지만 (텍스트 없음)
    allDetailImages = emonsImages;
  } else if (flatpointImages.length > 0) {
    // 플랫포인트: detailImages 배열
    allDetailImages = flatpointImages.map((url: string) => ({ url, text: "" }));
  } else if (iloomImages.length > 0) {
    // 일룸: galleryImages
    allDetailImages = iloomImages
      .filter((url, index, arr) => arr.indexOf(url) === index) // 중복 제거
      .map(url => ({ url, text: "" }));
  } else if (inartImages.length > 0) {
    // 인아트: detailImage 하나만
    allDetailImages = inartImages.map(url => ({ url, text: "" }));
  } else if (hanssemImages.length > 0) {
    // 한샘: thumbnailImages
    allDetailImages = hanssemImages
      .filter((url, index, arr) => arr.indexOf(url) === index) // 중복 제거
      .map(url => ({ url, text: "" }));
  } else if (standardImages.length > 0) {
    // 기타 브랜드: 기존 로직
    allDetailImages = standardImages
      .filter((url, index, arr) => arr.indexOf(url) === index) // 중복 제거
      .map(url => ({ url, text: "" }));
  } else {
    // 우아미 등 제외된 브랜드: 대표 이미지만
    allDetailImages = [{ url: product.imageUrl, text: "" }];
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 🔥 디버깅: 이 컴포넌트가 렌더링되는지 확인 */}
      <div style={{
        background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
        color: 'white',
        padding: '12px 20px',
        fontSize: '16px',
        fontWeight: 'bold',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        ✅ 최신 UnifiedProductDetail 컴포넌트 (프리미엄 브랜드 전용)
      </div>

      {/* Header */}
      <header className="px-4 lg:px-8 pt-6 lg:pt-24 pb-4 lg:pb-6 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={onBackToMain}
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
            <span className="text-sm lg:text-base">목록으로</span>
          </button>

          {/* Brand Badge */}
          <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700 mb-3">
            {product.brand} • {product.category}
          </div>

          {/* Product Title & Price */}
          <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-4">
            {product.title}
          </h1>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
            {product.price > 0 ? `${product.price.toLocaleString()}원` : "가격 문의"}
          </p>

          {/* External Link Button */}
          {product.productUrl && (
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              공식 사이트에서 보기 →
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 lg:px-8 pb-20 lg:pb-8">
        <div className="max-w-6xl mx-auto">
          {/* ⭐ 일룸 HTML 렌더링 모드 */}
          {isIloomHTMLMode ? (
            <section className="mb-12 lg:mb-16 mt-8">
              <div className="iloom-detail-content">
                <div dangerouslySetInnerHTML={{ __html: productAny.detailHTML }} />
              </div>
              
              {/* 일룸 HTML 전용 CSS */}
              <style jsx>{`
                .iloom-detail-content .box {
                  margin-bottom: 0;
                  width: 100%;
                }
                
                .iloom-detail-content .contents_100img {
                  width: 100%;
                  height: auto;
                  display: block;
                  margin: 0;
                  padding: 0;
                }
                
                .iloom-detail-content .contents_title {
                  padding: 20px 0;
                  font-size: 18px;
                  font-weight: bold;
                }
                
                .iloom-detail-content .contents_100contents {
                  padding: 20px 0;
                  line-height: 1.6;
                  color: #333;
                }
              `}</style>
            </section>
          ) : (
            <>
              {/* 상세 이미지 갤러리 (최소 3개, 세로로 쭉 나열) */}
              {allDetailImages.length > 0 && (
                <section className="mb-12 lg:mb-16 mt-8">
                  <div className="space-y-8">
                    {allDetailImages.map((item, index) => {
                      const imageKey = `detail-${index}`;
                      const imageUrl = typeof item === 'string' ? item : item.url;
                      const text = typeof item === 'object' && item.text ? item.text : '';
                      
                      return isImageValid(imageUrl, imageKey) ? (
                        <div key={index} className="space-y-6">
                          {/* 이미지 */}
                          <div className="relative w-full overflow-hidden rounded-lg bg-gray-50">
                            <Image
                              src={imageUrl}
                              alt={`${product.title} 상세 이미지 ${index + 1}`}
                              width={1200}
                              height={800}
                              className="w-full h-auto"
                              sizes="(max-width: 1024px) 100vw, 1024px"
                              priority={index === 0}
                              onError={() => handleImageError(imageKey)}
                            />
                          </div>
                          
                          {/* 텍스트 설명 (알로소 등) */}
                          {text && text.trim() !== '' && (
                            <div className="max-w-3xl mx-auto text-center px-4">
                              <p className="text-base lg:text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                                {text}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </section>
              )}

              {/* 텍스트 섹션 (있는 경우만) */}
              {product.detailSections && product.detailSections.length > 0 && (
                <section className="mb-12 lg:mb-16">
                  <div className="space-y-8">
                    {product.detailSections.map((section, index) => (
                      section.description && section.description.trim() ? (
                        <div key={index} className="max-w-3xl mx-auto text-center px-4">
                          {section.title && (
                            <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">
                              {section.title}
                            </h3>
                          )}
                          <p className="text-base lg:text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {section.description}
                          </p>
                        </div>
                      ) : null
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Footer Info */}
          <footer className="mt-16 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500 mb-2">
              제공: {product.brand}
            </p>
            <p className="text-xs text-gray-400">
              크롤링 일시: {new Date(product.scrapedAt).toLocaleDateString("ko-KR")}
            </p>
            <p className="text-xs text-gray-400 mt-4">
              와작 홈즈, scentdestination<br />
              대표: 유선화
            </p>
          </footer>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentView="main"
        onSearchClick={onSearchClick || (() => {})}
        onMapClick={onMapClick || (() => {})}
        onCartClick={onCartClick || (() => {})}
      />
    </div>
  );
}

