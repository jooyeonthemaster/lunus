"use client";

import { useState, useEffect } from "react";
import ProductDetailVariant1 from "@/components/ProductDetailVariant1";
import ProductDetailVariant2 from "@/components/ProductDetailVariant2";
import ProductDetailVariant3 from "@/components/ProductDetailVariant3";

type Variant = '1' | '2' | '3';

export default function TestScreenshotPage() {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [variant, setVariant] = useState<Variant>('1');

  useEffect(() => {
    fetch(`/api/test-screenshot?variant=${variant}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [variant]);

  const handleBack = () => {
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">에러: {error}</p>
          <a href="/" className="text-blue-600 hover:underline">
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">제품 데이터를 찾을 수 없습니다.</p>
          <a href="/" className="text-blue-600 hover:underline">
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Floating Variant Switcher */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-600 mb-3 text-center">표시 방식</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setVariant('1')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                variant === '1'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              1️⃣ HTML
            </button>
            <button
              onClick={() => setVariant('2')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                variant === '2'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              2️⃣ 이미지+텍스트
            </button>
            <button
              onClick={() => setVariant('3')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                variant === '3'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              3️⃣ LUNUS 스타일
            </button>
          </div>
        </div>
      </div>

      {/* Render Selected Variant */}
      {variant === '1' && <ProductDetailVariant1 product={product} onBack={handleBack} />}
      {variant === '2' && <ProductDetailVariant2 product={product} onBack={handleBack} />}
      {variant === '3' && <ProductDetailVariant3 product={product} onBack={handleBack} />}
    </div>
  );
}
