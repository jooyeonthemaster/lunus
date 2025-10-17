'use client';

import React, { useState } from 'react';

interface DetailSection {
  title: string;
  description: string;
}

interface IloomProduct {
  title: string;
  price?: number;
  productUrl: string;
  imageUrl: string;
  galleryImages?: string[];
  detailSections?: DetailSection[];
  scrapedAt?: string;
}

interface IloomDetailViewerProps {
  product: IloomProduct;
  onBack: () => void;
}

export default function IloomDetailViewer({ product, onBack }: IloomDetailViewerProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (src: string) => {
    setImageErrors(prev => new Set(prev).add(src));
  };

  const isImageValid = (src: string) => {
    return src && !imageErrors.has(src);
  };

  // 모든 이미지 수집 (메인 + 갤러리, 최소 3개)
  const allImages = [product.imageUrl, ...(product.galleryImages || [])]
    .filter(img => img && img.trim() !== '')
    .filter(isImageValid);

  // 의미있는 상세 섹션만 필터링 (최대 3개만 표시)
  const meaningfulSections = (product.detailSections || [])
    .filter(section => {
      const title = section.title?.trim() || '';
      const desc = section.description?.trim() || '';

      // 제목과 설명 둘 다 비어있으면 제외
      if (!title && !desc) return false;

      // 설명이 너무 짧으면 제외
      if (desc.length > 0 && desc.length < 10) return false;

      // 구두점만 있으면 제외
      if (/^[.\s!?,:;-]+$/.test(desc)) return false;

      return true;
    })
    .slice(0, 3); // 최대 3개만 표시

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">목록으로</span>
          </button>
          <div className="text-xs text-gray-400">LUNUS × ILOOM</div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* 히어로 이미지 */}
          <div className="mb-12">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-50">
              {isImageValid(product.imageUrl) ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(product.imageUrl)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-gray-400 text-sm">이미지를 불러올 수 없습니다</span>
                </div>
              )}
            </div>
          </div>

          {/* 제품 정보 */}
          <div className="mb-16">
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 leading-tight">
              {product.title}
            </h1>

            {product.price && (
              <div className="flex items-baseline gap-3 mb-8">
                <span className="text-3xl font-semibold text-gray-900">
                  {product.price.toLocaleString()}
                </span>
                <span className="text-lg text-gray-500">원</span>
              </div>
            )}

            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
            >
              <span>구매하기</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>

          {/* 상세 이미지 갤러리 (최소 3개) */}
          {allImages.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-light text-gray-900 mb-6">제품 상세</h2>
              <div className="space-y-6">
                {allImages.map((imageSrc, index) => (
                  <div
                    key={index}
                    className="relative w-full overflow-hidden rounded-lg bg-gray-50"
                  >
                    <img
                      src={imageSrc}
                      alt={`${product.title} 상세 이미지 ${index + 1}`}
                      className="w-full h-auto"
                      loading="lazy"
                      onError={() => handleImageError(imageSrc)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 상세 정보 섹션 */}
          {meaningfulSections.length > 0 && (
            <div className="px-8 py-12">
              <h3 className="text-2xl font-bold text-center mb-12">주요 특징</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {meaningfulSections.map((section, index) => (
                  <div key={index} className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-900 rounded-full flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">{index + 1}</span>
                    </div>
                    {section.description && (
                      <p className="text-sm text-gray-600 whitespace-pre-line">
                        {section.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 푸터 */}
          <div className="mt-20 pt-12 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                <span className="font-medium text-gray-900">일룸</span>
                <span className="mx-2">·</span>
                <span>Designed for Life</span>
              </div>
              {product.scrapedAt && (
                <div className="text-xs text-gray-400">
                  {new Date(product.scrapedAt).toLocaleDateString('ko-KR')}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
