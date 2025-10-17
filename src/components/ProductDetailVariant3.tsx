"use client";

import { useEffect, useState } from "react";

/**
 * Variant 3: LUNUS 정형화 스타일
 * 상단 히어로 이미지 + 주요 이미지 3개 + 깔끔한 텍스트 설명
 */

interface ProductDetailVariant3Props {
  product: {
    title: string;
    price: number;
    productUrl: string;
    imageUrl: string;
    detailHTML?: string;
  };
  onBack: () => void;
}

interface ExtractedContent {
  heroImage: string;
  keyImages: string[];
  mainDescription: string;
  features: string[];
}

export default function ProductDetailVariant3({ product, onBack }: ProductDetailVariant3Props) {
  const [content, setContent] = useState<ExtractedContent>({
    heroImage: product.imageUrl,
    keyImages: [],
    mainDescription: '',
    features: []
  });

  useEffect(() => {
    if (!product.detailHTML) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(product.detailHTML, 'text/html');

    // 히어로 이미지: 첫 번째 큰 이미지
    const firstImage = doc.querySelector('img');
    const heroImage = firstImage?.getAttribute('src') || firstImage?.getAttribute('ec-data-src') || product.imageUrl;

    // 주요 이미지 3개 추출
    const allImages = Array.from(doc.querySelectorAll('img'))
      .map(img => img.getAttribute('src') || img.getAttribute('ec-data-src'))
      .filter(src => src && !src.includes('data:image') && !src.includes('icon') && !src.includes('badge') && !src.includes('pictogram'))
      .slice(1, 4); // 히어로 제외 3개

    // 메인 설명: 가장 긴 텍스트
    const textElements = Array.from(doc.querySelectorAll('.font-1818, .font-2222'))
      .map(el => el.textContent?.trim() || '')
      .filter(text => text.length > 50 && !text.includes('리뷰') && !text.includes('REVIEW'))
      .sort((a, b) => b.length - a.length);

    const mainDescription = textElements[0] || '직선과 직각을 벗어나 아름다운 곡선의 실루엣을 담은 소파입니다.';

    // 특징 3개 추출 (짧은 텍스트)
    const features = Array.from(doc.querySelectorAll('.font-2222.kr.bold, .font-2828.kr.bold'))
      .map(el => el.textContent?.trim() || '')
      .filter(text => text.length > 5 && text.length < 50 && !text.includes('리뷰'))
      .slice(0, 3);

    setContent({
      heroImage,
      keyImages: allImages as string[],
      mainDescription,
      features: features.length > 0 ? features : ['프리미엄 디자인', '고급 소재', '뛰어난 내구성']
    });
  }, [product.detailHTML, product.imageUrl]);

  return (
    <div className="min-h-screen bg-white">
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
              <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full mb-2">
                방식 3: LUNUS 스타일
              </div>
              <h1 className="text-xl font-bold text-gray-900">{product.title}</h1>
              <p className="text-lg text-gray-600">{product.price?.toLocaleString()}원</p>
            </div>
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              구매하기
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Hero Image */}
        <div className="relative w-full h-[500px] bg-gray-100 overflow-hidden">
          <img
            src={content.heroImage}
            alt={product.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-8 left-8 text-white">
            <p className="text-sm font-medium mb-2 tracking-wider">LUNUS COLLECTION</p>
            <h2 className="text-4xl font-bold mb-2">{product.title}</h2>
          </div>
        </div>

        {/* Main Description */}
        <div className="px-8 py-12 bg-gray-50">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-gray-700 leading-relaxed">
              {content.mainDescription}
            </p>
          </div>
        </div>

        {/* Key Features */}
        <div className="px-8 py-12">
          <h3 className="text-2xl font-bold text-center mb-12">주요 특징</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {content.features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-900 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">{index + 1}</span>
                </div>
                <h4 className="text-lg font-semibold mb-2">{feature}</h4>
                <div className="w-12 h-1 bg-gray-900 mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Key Images Grid */}
        {content.keyImages.length > 0 && (
          <div className="px-8 py-12 bg-gray-50">
            <h3 className="text-2xl font-bold text-center mb-12">디테일</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {content.keyImages.map((img, index) => (
                <div key={index} className="relative aspect-square overflow-hidden rounded-lg group">
                  <img
                    src={img}
                    alt={`Detail ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="px-8 py-16 bg-gray-900 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">지금 바로 경험해보세요</h3>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            LUNUS만의 감각적인 디자인과 편안함을 직접 느껴보세요.
            당신의 공간을 특별하게 만들어드립니다.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              제품 상세보기
            </a>
            <button className="px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white hover:text-gray-900 transition-colors font-medium">
              매장 찾기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
