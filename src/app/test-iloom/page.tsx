'use client';

import { useEffect, useState } from 'react';
import IloomDetailViewer from '@/components/IloomDetailViewer';

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

export default function TestIloomPage() {
  const [products, setProducts] = useState<IloomProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<IloomProduct | null>(null);
  const [showSelector, setShowSelector] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/test-iloom')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProducts(data.products);
          if (data.products.length > 0) {
            setSelectedProduct(data.products[0]);
          }
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to load products:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">제품 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">제품 데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  if (showSelector) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <div className="mb-6">
              <h1 className="text-3xl font-light text-gray-900 mb-2">일룸 제품 뷰어</h1>
              <p className="text-gray-600 text-sm">
                전체 {products.length}개의 제품 · LUNUS Magazine Style
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제품 선택
              </label>
              <select
                value={selectedProduct?.title || ''}
                onChange={(e) => {
                  const product = products.find(p => p.title === e.target.value);
                  if (product) setSelectedProduct(product);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                {products.map((product, idx) => (
                  <option key={idx} value={product.title}>
                    {product.title}
                    {product.price ? ` - ${product.price.toLocaleString()}원` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3">선택된 제품 정보</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">제품명:</span> {selectedProduct.title}</p>
                  {selectedProduct.price && (
                    <p><span className="font-medium">가격:</span> {selectedProduct.price.toLocaleString()}원</p>
                  )}
                  {selectedProduct.galleryImages && (
                    <p><span className="font-medium">갤러리 이미지:</span> {selectedProduct.galleryImages.length}개</p>
                  )}
                  {selectedProduct.detailSections && (
                    <p><span className="font-medium">상세 섹션:</span> {selectedProduct.detailSections.length}개</p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSelector(false)}
              className="mt-6 w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              LUNUS 스타일로 보기
            </button>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>일룸 × LUNUS Magazine</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <IloomDetailViewer
      product={selectedProduct!}
      onBack={() => setShowSelector(true)}
    />
  );
}
