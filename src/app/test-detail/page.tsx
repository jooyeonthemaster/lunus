"use client";

import { useState, useEffect } from "react";
import ProductDetailViewer from "@/components/ProductDetailViewer";

export default function TestDetailPage() {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load the first product from flatpoint JSON
    fetch('/api/test-detail')
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

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
    <ProductDetailViewer
      product={product}
      onBack={() => window.location.href = '/'}
    />
  );
}
