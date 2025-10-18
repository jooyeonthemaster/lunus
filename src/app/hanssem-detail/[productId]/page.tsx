"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function HanssemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;

  const [htmlContent, setHtmlContent] = useState("");
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProductData() {
      try {
        const decodedId = decodeURIComponent(productId);

        // 스크래핑된 제품 데이터 로드
        const data = await import(
          `../../../../data/hanssem/scraped-products/${decodedId}.json`
        );

        const productData = data.default;
        setProductData(productData);

        // HTML 내용 가져오기
        let html = productData.detailHTML || "";

        // 이미지 URL 처리 (이미 절대 경로이므로 변환 불필요)
        // picture 태그의 srcset도 이미 절대 경로

        setHtmlContent(html);
        setLoading(false);
      } catch (err) {
        console.error("제품 데이터 로드 실패:", err);
        setError("제품을 찾을 수 없습니다. 스크래핑이 완료될 때까지 기다려주세요.");
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

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 text-red-600">오류</div>
          <div className="text-gray-500 mb-6">{error}</div>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">한샘 상세</h1>
          <div className="w-10"></div>
        </div>
      </header>

      {/* Product Info Banner */}
      <div className="max-w-7xl mx-auto px-6 py-8 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 대표 이미지 */}
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            {productData.mainImage ? (
              <img
                src={productData.mainImage}
                alt={productData.productName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl mb-4">🛋️</div>
                  <div className="text-xl font-medium text-gray-700">
                    {productData.category}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 제품 정보 */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-block px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium">
                한샘
              </div>
              <div className="inline-block px-4 py-2 bg-blue-100 text-blue-900 rounded-full text-sm font-medium">
                {productData.category}
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-3">{productData.productName}</h2>
            <p className="text-2xl font-bold text-gray-900 mb-6">
              {typeof productData.price === "number"
                ? productData.price.toLocaleString() + "원"
                : productData.price}
            </p>
            <a
              href={productData.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-center"
            >
              한샘 공식 스토어에서 보기 →
            </a>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-base font-bold text-blue-900 mb-3">
            🖥️ PC 데스크톱 렌더링
          </h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>• 한샘 공식 스토어의 PC 레이아웃</p>
            <p>• 뷰포트: 1920x1080 (Desktop PC)</p>
            <p>• 스타일 및 레이아웃 100% 원본 재현</p>
            <p>• "상세정보 펼치기" 버튼 자동 클릭</p>
            <p>• 반응형 이미지 (picture 태그) 지원</p>
            <p>
              • 스크래핑:{" "}
              {new Date(productData.scrapedAt).toLocaleString("ko-KR")}
            </p>
          </div>
        </div>
      </div>

      {/* 원본 HTML 렌더링 */}
      <div className="max-w-7xl mx-auto px-6">
        <div
          className="hanssem-detail-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      {/* Footer */}
      <footer className="mt-16 py-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p className="mb-2">LUNUS - 한샘 제품 상세</p>
          <p className="font-medium">PC 데스크톱 레이아웃 + 모바일 반응형</p>
        </div>
      </footer>

      {/* CSS for Hanssem Detail Content */}
      <style jsx global>{`
        /* Pretendard 폰트 import */
        @import url('https://res.remodeling.hanssem.com/font/pretendard/pretendard.css');

        /* 기본 컨테이너 */
        .hanssem-detail-content {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        /* img-box 스타일 - 한샘 원본과 동일하게 */
        .hanssem-detail-content .img-box {
          width: 100%;
          max-width: 870px;
          margin: 0 auto 80px;
          display: block;
        }

        .hanssem-detail-content .img-box picture {
          display: block;
          width: 100%;
        }

        .hanssem-detail-content .img-box img {
          width: 100%;
          height: auto;
          display: block;
        }

        /* 텍스트 컨텐츠 스타일 - 한샘 원본과 동일하게 */
        .hanssem-detail-content .cont-txt {
          max-width: 870px;
          margin: 0 auto 80px;
          padding: 0 20px;
          text-align: center;
          line-height: 1.6;
        }

        .hanssem-detail-content .cont-txt h1 {
          font-size: 48px;
          font-weight: 700;
          line-height: 1.4;
          margin: 0 0 30px;
          color: #000;
          letter-spacing: -0.02em;
        }

        .hanssem-detail-content .cont-txt h2 {
          font-size: 36px;
          font-weight: 700;
          line-height: 1.4;
          margin: 40px 0 20px;
          color: #000;
          letter-spacing: -0.02em;
        }

        .hanssem-detail-content .cont-txt h3 {
          font-size: 28px;
          font-weight: 700;
          line-height: 1.5;
          margin: 30px 0 15px;
          color: #000;
          letter-spacing: -0.02em;
        }

        .hanssem-detail-content .cont-txt h6 {
          font-size: 14px;
          font-weight: 400;
          line-height: 1.8;
          margin: 20px 0;
          color: #666;
        }

        .hanssem-detail-content .cont-txt p {
          font-size: 18px;
          line-height: 1.8;
          margin: 8px 0;
          color: #333;
        }

        .hanssem-detail-content .cont-txt b,
        .hanssem-detail-content .cont-txt strong {
          font-weight: 700;
          color: #000;
        }

        /* white-space-collapse 처리 */
        .hanssem-detail-content span[style*="white-space-collapse"] {
          white-space: pre-wrap;
        }

        /* br 태그 처리 */
        .hanssem-detail-content br {
          display: block;
          content: "";
          margin: 8px 0;
        }

        /* 모바일 반응형 - 한샘 원본 기준 */
        @media (max-width: 768px) {
          .hanssem-detail-content .img-box {
            max-width: 100%;
            margin-bottom: 60px;
          }

          .hanssem-detail-content .cont-txt {
            margin-bottom: 60px;
            padding: 0 20px;
          }

          .hanssem-detail-content .cont-txt h1 {
            font-size: 32px;
            margin-bottom: 20px;
          }

          .hanssem-detail-content .cont-txt h2 {
            font-size: 24px;
            margin: 30px 0 15px;
          }

          .hanssem-detail-content .cont-txt h3 {
            font-size: 20px;
            margin: 20px 0 10px;
          }

          .hanssem-detail-content .cont-txt p {
            font-size: 16px;
            line-height: 1.7;
          }

          .hanssem-detail-content .cont-txt h6 {
            font-size: 13px;
            line-height: 1.7;
          }
        }
      `}</style>
    </div>
  );
}
