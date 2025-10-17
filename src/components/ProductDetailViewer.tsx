"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface ProductDetail {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  detailHTML?: string;
  detailImages?: string[];
  specifications?: Record<string, string>;
  description?: string;
  rawText?: string;
}

interface ProductDetailViewerProps {
  product: ProductDetail;
  onBack: () => void;
}

export default function ProductDetailViewer({ product, onBack }: ProductDetailViewerProps) {
  const [activeTab, setActiveTab] = useState<"rendered" | "images" | "specs" | "raw">("rendered");
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<number>>(new Set());

  const handleImageError = (index: number) => {
    setImageLoadErrors(prev => new Set(prev).add(index));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Go back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{product.title}</h1>
              <p className="text-lg text-gray-600 mt-1">
                {product.price?.toLocaleString()}원
              </p>
            </div>
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              원본 보기
            </a>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("rendered")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "rendered"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              상세 페이지
            </button>
            <button
              onClick={() => setActiveTab("images")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "images"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              이미지 ({product.detailImages?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("specs")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "specs"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              스펙
            </button>
            <button
              onClick={() => setActiveTab("raw")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "raw"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              원본 데이터
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Rendered HTML Tab */}
        {activeTab === "rendered" && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="prose max-w-none">
              {product.detailHTML ? (
                <div
                  dangerouslySetInnerHTML={{ __html: product.detailHTML }}
                  className="detail-content"
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>상세 페이지 데이터가 없습니다.</p>
                  <p className="text-sm mt-2">크롤링 스크립트를 실행해주세요.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Images Tab */}
        {activeTab === "images" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">
                추출된 이미지 목록 ({product.detailImages?.length || 0}개)
              </h2>

              {product.detailImages && product.detailImages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {product.detailImages.map((imageUrl, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div className="relative h-64 bg-gray-100">
                        {!imageLoadErrors.has(index) ? (
                          <img
                            src={imageUrl}
                            alt={`상세 이미지 ${index + 1}`}
                            className="w-full h-full object-contain"
                            onError={() => handleImageError(index)}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <div className="text-center">
                              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-xs">이미지 로드 실패</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-gray-50">
                        <p className="text-xs text-gray-600 truncate" title={imageUrl}>
                          {imageUrl}
                        </p>
                        <a
                          href={imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                        >
                          새 탭에서 열기 →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>추출된 이미지가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Specs Tab */}
        {activeTab === "specs" && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">제품 사양</h2>

            {product.specifications && Object.keys(product.specifications).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex border-b pb-3">
                    <div className="w-1/3 font-medium text-gray-700">{key}</div>
                    <div className="w-2/3 text-gray-900">{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>구조화된 사양 데이터가 없습니다.</p>
              </div>
            )}

            {product.description && (
              <div className="mt-8 pt-8 border-t">
                <h3 className="text-md font-bold mb-3">제품 설명</h3>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Raw Data Tab */}
        {activeTab === "raw" && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">JSON 데이터</h2>
              <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-sm">
                {JSON.stringify(product, null, 2)}
              </pre>
            </div>

            {product.detailHTML && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4">원본 HTML</h2>
                <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs max-h-96 overflow-y-auto">
                  {product.detailHTML}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Custom styles for detail content */}
      <style jsx global>{`
        .detail-content img {
          max-width: 100%;
          height: auto;
          margin: 1rem 0;
        }

        .detail-content p {
          margin: 1rem 0;
        }

        .detail-content .row {
          margin: 0 -12px;
        }

        .detail-content .col-6,
        .detail-content .col-12 {
          padding: 0 12px;
        }

        .detail-content iframe {
          max-width: 100%;
        }

        /* Lazy-loaded images */
        .detail-content img[ec-data-src] {
          min-height: 200px;
          background: #f3f4f6;
        }
      `}</style>
    </div>
  );
}
