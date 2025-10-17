"use client";

import { useEffect, useState } from "react";

/**
 * Variant 2: 이미지 + 텍스트 나열 방식
 * HTML에서 이미지와 텍스트를 추출해서 순서대로 나열
 */

interface ProductDetailVariant2Props {
  product: {
    title: string;
    price: number;
    productUrl: string;
    imageUrl: string;
    detailHTML?: string;
  };
  onBack: () => void;
}

interface ContentBlock {
  type: 'image' | 'text';
  content: string;
}

export default function ProductDetailVariant2({ product, onBack }: ProductDetailVariant2Props) {
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);

  useEffect(() => {
    if (!product.detailHTML) return;

    // HTML 파싱해서 이미지와 텍스트 추출
    const parser = new DOMParser();
    const doc = parser.parseFromString(product.detailHTML, 'text/html');

    const blocks: ContentBlock[] = [];

    // 모든 이미지 추출
    const images = doc.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('ec-data-src');
      if (src && !src.includes('data:image') && !src.includes('icon') && !src.includes('badge')) {
        blocks.push({
          type: 'image',
          content: src
        });
      }
    });

    // 텍스트 추출 (리뷰 섹션 제외)
    const textElements = doc.querySelectorAll('.font-1818, .font-2222, .font-2828, .font-3838');
    const seenTexts = new Set<string>();

    textElements.forEach(el => {
      const text = el.textContent?.trim() || '';
      if (
        text &&
        text.length > 20 &&
        !text.includes('리뷰') &&
        !text.includes('REVIEW') &&
        !seenTexts.has(text)
      ) {
        seenTexts.add(text);
        // 이미지 3개마다 텍스트 하나 추가 (교차 배치)
        if (blocks.length % 4 === 3) {
          blocks.push({
            type: 'text',
            content: text
          });
        }
      }
    });

    setContentBlocks(blocks.slice(0, 30)); // 최대 30개 블록
  }, [product.detailHTML]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <div className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-2">
                방식 2: 이미지 + 텍스트 나열
              </div>
              <h1 className="text-xl font-bold text-gray-900">{product.title}</h1>
              <p className="text-lg text-gray-600">{product.price?.toLocaleString()}원</p>
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

      {/* Content Blocks */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>HTML에서 추출한 이미지와 텍스트를 순서대로 나열합니다. (총 {contentBlocks.length}개 블록)</span>
          </div>
        </div>

        {contentBlocks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600">콘텐츠를 로딩하는 중...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {contentBlocks.map((block, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {block.type === 'image' ? (
                  <div className="relative w-full">
                    <img
                      src={block.content}
                      alt={`Product image ${index + 1}`}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      이미지 {index + 1}
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-700 leading-relaxed flex-1">{block.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
