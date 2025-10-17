"use client";

import { useState } from "react";
import Image from "next/image";

interface ProductScreenshot {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  screenshotPath?: string;
  screenshotSize?: string;
  screenshotHeight?: number;
  detailText?: string;
  detailImages?: string[];
}

interface Props {
  product: ProductScreenshot;
  onBack: () => void;
}

export default function ProductScreenshotViewer({ product, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<"screenshot" | "images" | "text">("screenshot");
  const [imageScale, setImageScale] = useState(1);

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
              <div className="flex items-center gap-4 mt-1">
                <p className="text-lg text-gray-600">
                  {product.price?.toLocaleString()}원
                </p>
                {product.screenshotSize && (
                  <span className="text-sm text-gray-500">
                    📸 {product.screenshotSize}KB ({(product.screenshotHeight || 0).toLocaleString()}px)
                  </span>
                )}
              </div>
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
              onClick={() => setActiveTab("screenshot")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "screenshot"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📸 스크린샷
            </button>
            <button
              onClick={() => setActiveTab("images")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "images"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🖼️ 이미지 ({product.detailImages?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("text")}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === "text"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📝 텍스트
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Screenshot Tab */}
        {activeTab === "screenshot" && (
          <div className="space-y-4">
            {product.screenshotPath ? (
              <>
                {/* Zoom Controls */}
                <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">확대/축소:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setImageScale(Math.max(0.5, imageScale - 0.25))}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                        disabled={imageScale <= 0.5}
                      >
                        −
                      </button>
                      <span className="w-16 text-center font-medium">
                        {Math.round(imageScale * 100)}%
                      </span>
                      <button
                        onClick={() => setImageScale(Math.min(2, imageScale + 0.25))}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                        disabled={imageScale >= 2}
                      >
                        +
                      </button>
                      <button
                        onClick={() => setImageScale(1)}
                        className="ml-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm"
                      >
                        100%
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    높이: {(product.screenshotHeight || 0).toLocaleString()}px
                  </div>
                </div>

                {/* Screenshot Image */}
                <div className="bg-white rounded-lg shadow-lg overflow-auto">
                  <div
                    className="inline-block min-w-full"
                    style={{ transform: `scale(${imageScale})`, transformOrigin: 'top center' }}
                  >
                    <img
                      src={product.screenshotPath}
                      alt={`${product.title} 상세페이지`}
                      className="w-full"
                      style={{ maxWidth: 'none' }}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 font-medium">
                        이 이미지는 원본 상세페이지의 완벽한 스크린샷입니다.
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        리뷰 섹션은 자동으로 제외되었습니다. 스타일과 레이아웃이 100% 보존됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600 mb-2">스크린샷이 아직 생성되지 않았습니다.</p>
                <p className="text-sm text-gray-500">
                  <code className="bg-gray-100 px-2 py-1 rounded">node scripts/flatpoint-screenshot-scraper.cjs</code>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Images Tab */}
        {activeTab === "images" && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">
              추출된 이미지 ({product.detailImages?.length || 0}개)
            </h2>
            {product.detailImages && product.detailImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {product.detailImages.map((url, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden group">
                    <div className="relative h-48 bg-gray-100">
                      <img
                        src={url}
                        alt={`이미지 ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-2 bg-gray-50">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline block truncate"
                      >
                        새 탭에서 열기 →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">추출된 이미지가 없습니다.</p>
            )}
          </div>
        )}

        {/* Text Tab */}
        {activeTab === "text" && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">추출된 텍스트</h2>
            {product.detailText ? (
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {product.detailText}
                </p>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">추출된 텍스트가 없습니다.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
