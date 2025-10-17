'use client';

import { useState, useEffect } from 'react';
import HanssemDetailViewer from '@/components/HanssemDetailViewer';

interface DetailSection {
  title: string;
  description: string;
}

interface HanssemProduct {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  thumbnailImages?: string[];
  detailSections?: DetailSection[];
  detailImages?: string[];
  scrapedAt?: string;
}

export default function TestHanssemPage() {
  const [products, setProducts] = useState<HanssemProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<HanssemProduct | null>(null);
  const [showSelector, setShowSelector] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('/api/test-hanssem');
        const data = await response.json();
        setProducts(data.products || []);
        if (data.products && data.products.length > 0) {
          setSelectedProduct(data.products[0]);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading Hanssem products...</div>
      </div>
    );
  }

  // Show product selector
  if (showSelector) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">한샘 제품 - LUNUS 스타일</h1>

          <div className="mb-8 bg-white p-6 rounded-lg shadow">
            <label className="block text-sm font-medium mb-3">제품 선택:</label>
            <select
              className="w-full p-3 border rounded-lg"
              value={selectedProduct?.title || ''}
              onChange={(e) => {
                const product = products.find(p => p.title === e.target.value);
                setSelectedProduct(product || null);
              }}
            >
              {products.map((product, idx) => (
                <option key={idx} value={product.title}>
                  {product.title} - {product.price?.toLocaleString()}원
                </option>
              ))}
            </select>
            <div className="mt-3 text-sm text-gray-600">
              총 {products.length}개 제품 | 상세 데이터 수집: {products.filter(p => p.detailSections).length}개
            </div>
            <button
              onClick={() => setShowSelector(false)}
              className="mt-4 w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              LUNUS 스타일로 보기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show LUNUS style viewer
  if (selectedProduct) {
    return (
      <HanssemDetailViewer
        product={selectedProduct}
        onBack={() => setShowSelector(true)}
      />
    );
  }

  return null;
}