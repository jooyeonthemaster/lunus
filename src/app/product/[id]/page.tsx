'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Product {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  detailHTML?: string;
  detailImages?: string[];
  description?: string;
}

interface ProcessedProduct {
  title: string;
  price: number;
  productUrl: string;
  heroImage: string;
  keyImages: string[];
  mainDescription: string;
  features: string[];
}

function processProduct(product: Product): ProcessedProduct {
  let mainDescription = '';
  let features: string[] = [];
  let keyImages: string[] = [];

  if (product.detailHTML) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(product.detailHTML, 'text/html');

    // 텍스트 추출 - 가장 긴 텍스트
    const textElements = Array.from(doc.querySelectorAll('.font-1818, .font-2222'))
      .map(el => el.textContent?.trim() || '')
      .filter(text => text.length > 50 && !text.includes('리뷰') && !text.includes('REVIEW'))
      .sort((a, b) => b.length - a.length);

    mainDescription = textElements[0] || '';

    // 이미지 추출 - 첫 3개 주요 이미지
    const allImages = Array.from(doc.querySelectorAll('img'))
      .map(img => img.getAttribute('src') || img.getAttribute('ec-data-src'))
      .filter(src => src &&
        !src.includes('pictogram') &&
        !src.includes('data:image') &&
        !src.includes('icon') &&
        !src.includes('badge'))
      .slice(1, 4);

    keyImages = allImages as string[];

    // 특징 추출 - 볼드체 제목들
    const featureElements = Array.from(doc.querySelectorAll('.font-2222.kr.bold, .font-2828.kr.bold'))
      .map(el => el.textContent?.trim() || '')
      .filter(text => text.length > 5 && text.length < 50 && !text.includes('DESIGN'))
      .slice(0, 3);

    features = featureElements;
  }

  // Fallback
  if (!mainDescription) {
    mainDescription = product.description ||
      `${product.title}는 플랫포인트의 프리미엄 소파입니다. 편안한 착석감과 세련된 디자인이 조화를 이루어, 당신의 거실을 한층 더 품격 있게 만들어줍니다.`;
  }

  if (features.length === 0) {
    features = ['프리미엄 패브릭 소재', '편안한 착석감', '세련된 디자인'];
  }

  if (keyImages.length === 0 && product.detailImages) {
    keyImages = product.detailImages.slice(1, 4);
  }

  if (keyImages.length === 0) {
    keyImages = [product.imageUrl, product.imageUrl, product.imageUrl];
  }

  return {
    title: product.title,
    price: product.price,
    productUrl: product.productUrl,
    heroImage: product.imageUrl,
    keyImages,
    mainDescription,
    features,
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [processed, setProcessed] = useState<ProcessedProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = parseInt(params.id as string);

    fetch('/api/products-gallery')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.products[id]) {
          const prod = data.products[id];
          setProduct(prod);
          setProcessed(processProduct(prod));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">제품을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!product || !processed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">제품을 찾을 수 없습니다</p>
          <button
            onClick={() => router.push('/products-gallery')}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
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
              <h1 className="text-xl font-bold text-gray-900">{processed.title}</h1>
              <p className="text-lg text-gray-600">{processed.price.toLocaleString()}원</p>
            </div>
            <a
              href={processed.productUrl}
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
            alt={processed.title}
            className="w-full h-full object-cover"
            src={processed.heroImage}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
          <div className="absolute bottom-8 left-8 text-white">
            <p className="text-sm font-medium mb-2 tracking-wider">LUNUS COLLECTION</p>
            <h2 className="text-4xl font-bold mb-2">{processed.title}</h2>
          </div>
        </div>

        {/* Description */}
        <div className="px-8 py-12 bg-gray-50">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-gray-700 leading-relaxed">
              {processed.mainDescription}
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="px-8 py-12">
          <h3 className="text-2xl font-bold text-center mb-12">주요 특징</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {processed.features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-900 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">{index + 1}</span>
                </div>
                <h4 className="text-lg font-semibold mb-2">{feature}</h4>
                <div className="w-12 h-1 bg-gray-900 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Images */}
        <div className="px-8 py-12 bg-gray-50">
          <h3 className="text-2xl font-bold text-center mb-12">디테일</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {processed.keyImages.map((img, index) => (
              <div key={index} className="relative aspect-square overflow-hidden rounded-lg group">
                <img
                  alt={`Detail ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  src={img}
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity"></div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="px-8 py-16 bg-gray-900 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">지금 바로 경험해보세요</h3>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            LUNUS만의 감각적인 디자인과 편안함을 직접 느껴보세요. 당신의 공간을 특별하게 만들어드립니다.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href={processed.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              제품 상세보기
            </a>
            <button
              onClick={() => router.push('/products-gallery')}
              className="px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white hover:text-gray-900 transition-colors font-medium"
            >
              다른 제품 보기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
