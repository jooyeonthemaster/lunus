'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Product {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  detailHTML?: string;
  detailImages?: string[];
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

function getBrandFromUrl(url: string): string {
  if (url.includes('flatpoint')) return '플랫포인트';
  if (url.includes('iloom')) return '일룸';
  if (url.includes('hanssem')) return '한샘';
  if (url.includes('livart')) return '리바트';
  if (url.includes('enex')) return '에넥스';
  return '프리미엄 브랜드';
}

function getCategoryFromTitle(title: string): string {
  if (title.includes('소파') || title.toLowerCase().includes('sofa')) return '소파';
  if (title.includes('침대') || title.toLowerCase().includes('bed')) return '침대';
  if (title.includes('테이블') || title.toLowerCase().includes('table')) return '테이블';
  if (title.includes('의자') || title.toLowerCase().includes('chair')) return '의자';
  if (title.includes('책상') || title.toLowerCase().includes('desk')) return '책상';
  return '가구';
}

function generateDescription(product: Product): string {
  const brand = getBrandFromUrl(product.productUrl);
  const category = getCategoryFromTitle(product.title);

  const descriptions: { [key: string]: string } = {
    '소파': `${product.title}는 ${brand}의 프리미엄 소파입니다. 편안한 착석감과 세련된 디자인이 조화를 이루어, 당신의 거실을 한층 더 품격 있게 만들어줍니다. 고급 소재와 장인의 손길이 담긴 이 제품은 오랜 시간 사용해도 변함없는 편안함을 제공합니다.`,
    '침대': `${product.title}는 ${brand}의 프리미엄 침대입니다. 편안한 휴식을 위한 최적의 디자인과 고급 소재로 제작되어, 깊은 숙면을 선사합니다. 세련된 디자인이 침실을 더욱 품격 있게 완성합니다.`,
    '테이블': `${product.title}는 ${brand}의 실용적이고 아름다운 테이블입니다. 견고한 구조와 세련된 디자인이 조화를 이루어, 식사 시간을 더욱 특별하게 만들어줍니다.`,
    '의자': `${product.title}는 ${brand}의 프리미엄 의자입니다. 인체공학적 디자인과 편안한 착석감으로 장시간 사용해도 피로하지 않습니다.`,
    '책상': `${product.title}는 ${brand}의 실용적인 책상입니다. 넉넉한 작업 공간과 세련된 디자인으로 집중력 있는 업무 환경을 제공합니다.`,
  };

  return descriptions[category] || `${product.title}는 ${brand}의 프리미엄 제품입니다. 세련된 디자인과 우수한 품질로 공간에 품격을 더합니다.`;
}

function generateFeatures(product: Product): string[] {
  const category = getCategoryFromTitle(product.title);

  const featuresByCategory: { [key: string]: string[] } = {
    '소파': ['프리미엄 패브릭/가죽 소재', '편안한 착석감', '세련된 디자인'],
    '침대': ['편안한 휴식', '견고한 구조', '고급스러운 마감'],
    '테이블': ['견고한 내구성', '실용적인 디자인', '다양한 활용'],
    '의자': ['인체공학적 설계', '편안한 쿠션', '세련된 외관'],
    '책상': ['넉넉한 작업 공간', '수납 기능', '모던한 디자인'],
  };

  return featuresByCategory[category] || ['프리미엄 소재', '세련된 디자인', '우수한 품질'];
}

function processProduct(product: Product): ProcessedProduct {
  let mainDescription = '';
  let features: string[] = [];
  let keyImages: string[] = [];

  // detailHTML이 있는 경우 파싱
  if (product.detailHTML) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(product.detailHTML, 'text/html');

    // 텍스트 추출
    const textElements = Array.from(doc.querySelectorAll('.font-1818, .font-2222'))
      .map(el => el.textContent?.trim() || '')
      .filter(text => text.length > 50 && !text.includes('리뷰'))
      .sort((a, b) => b.length - a.length);

    mainDescription = textElements[0] || '';

    // 이미지 추출
    const allImages = Array.from(doc.querySelectorAll('img'))
      .map(img => img.getAttribute('src') || img.getAttribute('ec-data-src'))
      .filter(src => src && !src.includes('pictogram') && !src.includes('data:image'))
      .slice(1, 4);

    keyImages = allImages as string[];

    // 특징 추출
    const featureElements = Array.from(doc.querySelectorAll('.font-2222.kr.bold, .font-2828.kr.bold'))
      .map(el => el.textContent?.trim() || '')
      .filter(text => text.length > 5 && text.length < 50)
      .slice(0, 3);

    features = featureElements.length > 0 ? featureElements : generateFeatures(product);
  } else {
    // fallback: detailHTML이 없는 경우
    mainDescription = generateDescription(product);
    features = generateFeatures(product);
    keyImages = product.detailImages?.slice(1, 4) || [];
  }

  // 최종 fallback
  if (!mainDescription) {
    mainDescription = generateDescription(product);
  }

  if (features.length === 0) {
    features = generateFeatures(product);
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

export default function ProductCardVariant3({ product, index }: { product: Product; index: number }) {
  const [processed, setProcessed] = useState<ProcessedProduct | null>(null);

  useEffect(() => {
    const result = processProduct(product);
    setProcessed(result);
  }, [product]);

  if (!processed) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
        <div className="w-full h-64 bg-gray-200"></div>
        <div className="p-6">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/product/${index}`} className="block">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 group cursor-pointer">
        {/* Hero Image */}
        <div className="relative w-full h-64 bg-gray-100 overflow-hidden">
          <img
            src={processed.heroImage}
            alt={processed.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              LUNUS 스타일
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
            {processed.title}
          </h3>
          <p className="text-xl font-bold text-gray-900 mb-4">
            {processed.price.toLocaleString()}원
          </p>

          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {processed.mainDescription}
          </p>

          {/* Features */}
          <div className="mb-4 space-y-2">
            {processed.features.map((feature, idx) => (
              <div key={idx} className="flex items-center text-xs text-gray-500">
                <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></div>
                {feature}
              </div>
            ))}
          </div>

          {/* Key Images Preview */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {processed.keyImages.slice(0, 3).map((img, idx) => (
              <div key={idx} className="aspect-square overflow-hidden rounded">
                <img
                  src={img}
                  alt={`Detail ${idx + 1}`}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
              </div>
            ))}
          </div>

          {/* CTA Badge */}
          <div className="w-full py-3 bg-gray-900 text-white text-center rounded-lg group-hover:bg-gray-800 transition-colors font-medium">
            상세보기
          </div>
        </div>
      </div>
    </Link>
  );
}
