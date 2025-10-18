"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// 인아트 제품 데이터
import inartSofa from "../../../../data/인아트/inart-소파.json";
import inartCloset from "../../../../data/인아트/inart-옷장, 수납장.json";
import inartChair from "../../../../data/인아트/inart-의자.json";
import inartBed from "../../../../data/인아트/inart-침대.json";
import inartTable from "../../../../data/인아트/inart-테이블.json";

export default function InartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;

  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProductData() {
      try {
        // 모든 제품 데이터 병합
        const allProducts = [
          ...inartSofa,
          ...inartCloset,
          ...inartChair,
          ...inartBed,
          ...inartTable
        ];

        // productId로 제품 찾기 (productUrl의 no 파라미터 사용)
        const foundProduct = allProducts.find((p: any) => {
          const match = p.productUrl?.match(/no=(\d+)/);
          return match && match[1] === productId;
        });

        if (!foundProduct) {
          setError("제품을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        // detailHTML의 이미지 경로를 절대 경로로 변환
        if (foundProduct.detailHTML) {
          let html = foundProduct.detailHTML;

          // 상대 경로를 절대 경로로 변환
          html = html.replace(/src="\/data\//g, 'src="https://www.inartshop.com/data/');
          html = html.replace(/href="\/data\//g, 'href="https://www.inartshop.com/data/');

          foundProduct.detailHTML = html;
        }

        setProductData(foundProduct);

        // 첫 번째 상세 이미지를 선택된 이미지로 설정
        if (foundProduct.detailImages && foundProduct.detailImages.length > 0) {
          setSelectedImage(foundProduct.detailImages[0]);
        } else if (foundProduct.imageUrl) {
          setSelectedImage(foundProduct.imageUrl);
        }

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
            onClick={() => router.push("/inart-products")}
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
            onClick={() => router.push("/inart-products")}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mr-2">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm lg:text-base">목록으로</span>
          </button>

          <div className="inline-block px-3 py-1 bg-green-50 rounded-full text-xs font-medium text-green-700 mb-3">
            인아트 • 자연을 닮은 원목 가구
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

      {/* 대표 이미지 */}
      {productData.imageUrl && (
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
          <div className="bg-white rounded-lg overflow-hidden shadow-lg">
            <img
              src={productData.imageUrl}
              alt={productData.title}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-base font-bold text-green-900 mb-3">
            🌿 인아트 상세 정보
          </h3>
          <div className="text-sm text-green-700 space-y-2">
            <p>• 자연을 닮은 원목 가구 브랜드</p>
            <p>• 고품질 원목 소재와 수작업 마감</p>
            {productData.detailImages && (
              <p>• 상세 이미지: {productData.detailImages.length}개</p>
            )}
            {productData.scrapedDetailAt && (
              <p>
                • 업데이트:{" "}
                {new Date(productData.scrapedDetailAt).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 상세 이미지만 추출해서 표시 */}
      {productData.detailImages && productData.detailImages.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-bold mb-6">제품 상세</h2>

          <div className="space-y-4">
            {productData.detailImages.map((imageUrl: string, index: number) => (
              <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <img
                  src={imageUrl}
                  alt={`상세 이미지 ${index + 1}`}
                  className="w-full h-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 py-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p className="mb-2">LUNUS - 인아트 제품 상세</p>
          <p className="font-medium">자연을 닮은 원목 가구</p>
        </div>
      </footer>
    </div>
  );
}
