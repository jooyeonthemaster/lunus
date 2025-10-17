'use client';

import React, { useState } from 'react';

interface EmonsProduct {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  detailImage1?: string;
  detailImage2?: string;
  detailImage3?: string;
}

interface EmonsDetailViewerProps {
  product: EmonsProduct;
}

export default function EmonsDetailViewer({ product }: EmonsDetailViewerProps) {
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});

  const handleImageError = (imageKey: string) => {
    setImageErrors(prev => ({ ...prev, [imageKey]: true }));
  };

  const isImageValid = (url: string | undefined, key: string) => {
    return url && url.trim() !== '' && !imageErrors[key];
  };

  // 모든 이미지 수집 (최소 3개)
  const allImages = [
    { url: product.imageUrl, key: 'main', alt: product.title },
    { url: product.detailImage1, key: 'detail1', alt: `${product.title} 상세 1` },
    { url: product.detailImage2, key: 'detail2', alt: `${product.title} 상세 2` },
    { url: product.detailImage3, key: 'detail3', alt: `${product.title} 상세 3` }
  ].filter(img => img.url && img.url.trim() !== '');

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 bg-white">
      {/* Hero Image */}
      <div className="mb-16">
        <img
          src={product.imageUrl}
          alt={product.title}
          className="w-full h-auto"
          onError={() => handleImageError('main')}
        />
      </div>

      {/* Product Info */}
      <div className="mb-16 text-center">
        <h1 className="text-3xl font-light text-gray-900 mb-4">{product.title}</h1>
        <p className="text-2xl text-gray-900 mb-8">
          {product.price?.toLocaleString()}원
        </p>
        <a
          href={product.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-black text-white px-12 py-4 text-sm tracking-wider hover:bg-gray-800 transition-colors"
        >
          구매하기
        </a>
      </div>

      {/* 상세 이미지 갤러리 (최소 3개) */}
      {allImages.length > 0 && (
        <div className="mb-16">
          <h2 className="text-2xl font-light text-gray-900 mb-8 text-center">제품 상세</h2>
          <div className="space-y-12">
            {allImages.map((img) => {
              return isImageValid(img.url, img.key) ? (
                <div key={img.key} className="w-full">
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-auto rounded-lg"
                    onError={() => handleImageError(img.key)}
                  />
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-20 pt-8 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">EMONS × LUNUS</p>
        <p className="text-xs text-gray-400 mt-2">와작 홈즈, scentdestination · 대표: 유선화</p>
      </div>
    </div>
  );
}
