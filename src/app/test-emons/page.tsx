'use client';

import { useState, useEffect } from 'react';
import EmonsDetailViewer from '@/components/EmonsDetailViewer';

interface EmonsProduct {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  detailImage1?: string;
  detailImage2?: string;
  detailImage3?: string;
}

export default function TestEmonsPage() {
  const [products, setProducts] = useState<EmonsProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<EmonsProduct | null>(null);
  const [showLunusView, setShowLunusView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/test-emons');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data.products);
        if (data.products.length > 0) {
          setSelectedProduct(data.products[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!selectedProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No products found</p>
      </div>
    );
  }

  if (showLunusView) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <button
            onClick={() => setShowLunusView(false)}
            className="mb-8 px-6 py-2 bg-gray-900 text-white text-sm hover:bg-gray-700 transition-colors"
          >
            ← Back to Product Selection
          </button>
          <EmonsDetailViewer product={selectedProduct} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Emons Products Test</h1>

        {/* Product Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <label htmlFor="product-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Product ({products.length} total)
          </label>
          <select
            id="product-select"
            value={selectedProduct.productUrl}
            onChange={(e) => {
              const product = products.find(p => p.productUrl === e.target.value);
              if (product) setSelectedProduct(product);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {products.map((product, index) => (
              <option key={index} value={product.productUrl}>
                {product.title}
              </option>
            ))}
          </select>
        </div>

        {/* Product Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Information</h2>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Title:</span>
              <p className="text-gray-600 mt-1">{selectedProduct.title}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Price:</span>
              <p className="text-gray-600 mt-1">{selectedProduct.price?.toLocaleString()}원</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Detail Images:</span>
              <ul className="text-gray-600 mt-1 space-y-1">
                <li>Image 1: {selectedProduct.detailImage1 ? '✓' : '✗'}</li>
                <li>Image 2: {selectedProduct.detailImage2 ? '✓' : '✗'}</li>
                <li>Image 3: {selectedProduct.detailImage3 ? '✓' : '✗'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* View Button */}
        <button
          onClick={() => setShowLunusView(true)}
          className="w-full bg-black text-white py-4 px-6 rounded-md hover:bg-gray-800 transition-colors font-medium"
        >
          View in LUNUS Style
        </button>
      </div>
    </div>
  );
}
