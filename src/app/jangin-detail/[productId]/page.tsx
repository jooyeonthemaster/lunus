"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// 장인가구 제품 리스트 데이터
import janginProductsList from "../../../../data/장인가구/products.json";

export default function JanginDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;

  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProductData() {
      try {
        const decodedTitle = decodeURIComponent(productId);

        // products.json에서 제품 찾기
        const foundProduct = janginProductsList.find(
          (p: any) => p.title === decodedTitle
        );

        if (!foundProduct) {
          setError("제품을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        // scraped-products에서 상세 데이터 찾기 시도
        let detailData = null;
        try {
          const scrapedData = await import(`../../../../data/장인가구/scraped-products/${decodedTitle}.json`);
          detailData = scrapedData.default;
          console.log('✅ 상세 데이터 로드 성공:', detailData);
        } catch (e) {
          console.warn('⚠️ scraped-products에서 찾지 못함, 기본 데이터 사용');
        }

        // 데이터 병합
        const mergedData = detailData ? {
          ...foundProduct,
          ...detailData,
          // 리스트 데이터의 일부 필드 우선 유지
          title: foundProduct.title,
          productUrl: foundProduct.productUrl
        } : foundProduct;

        // detailHTML의 이미지 경로를 절대 경로로 변환
        if (mergedData.detailHTML) {
          let html = mergedData.detailHTML;
          
          // 상대 경로를 절대 경로로 변환
          html = html.replace(/src="\/data\//g, 'src="https://www.jangin.com/data/');
          html = html.replace(/href="\/data\//g, 'href="https://www.jangin.com/data/');
          
          mergedData.detailHTML = html;
          console.log('✅ 이미지 경로 변환 완료');
        }

        setProductData(mergedData);
        setLoading(false);
      } catch (err) {
        console.error("제품 데이터 로드 실패:", err);
        setError("제품을 찾을 수 없습니다.");
        setLoading(false);
      }
    }

    if (productId) {
      loadProductData();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">로딩 중...</div>
          <div className="text-gray-500">제품 상세 정보를 불러오는 중입니다</div>
        </div>
      </div>
    );
  }

  if (error || !productData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 text-red-600">오류</div>
          <div className="text-gray-500 mb-6">{error}</div>
          <button
            onClick={() => router.push("/jangin-products")}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            제품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - 간결한 스타일 */}
      <header className="px-4 lg:px-8 pt-6 lg:pt-24 pb-4 lg:pb-6 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.push("/jangin-products")}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mr-2">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm lg:text-base">목록으로</span>
          </button>

          <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700 mb-3">
            장인가구 • {productData.category || "가구"}
          </div>

          <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-4">
            {productData.title}
          </h1>

          <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
            {typeof productData.price === 'number'
              ? `${productData.price.toLocaleString()}원`
              : productData.price || '가격 문의'}
          </p>

          <a
            href={productData.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            공식 사이트에서 보기 →
          </a>
        </div>
      </header>

      {/* 대표 이미지 (bigimg) */}
      {(productData.mainImage || productData.imageUrl) && (
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
          <div className="bg-white rounded-lg overflow-hidden shadow-lg">
            <img
              src={productData.mainImage || productData.imageUrl}
              alt={productData.title}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}

      {/* 상세 이미지 세로 나열 */}
      {productData.detailImages && productData.detailImages.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="space-y-0">
            {productData.detailImages.map((imageUrl: string, index: number) => (
              <div key={index} className="w-full">
                <img
                  src={imageUrl}
                  alt={`${productData.title} 상세 이미지 ${index + 1}`}
                  className="w-full h-auto block"
                />
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Footer */}
      <footer className="mt-16 py-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p className="mb-2">LUNUS - 장인가구 제품 상세</p>
          <p className="font-medium">장인정신이 깃든 수제 가구</p>
          <div className="mt-4">
            <p className="text-xs">와작 홈즈, scentdestination</p>
            <p className="text-xs">대표: 유선화</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

