"use client";

import { useEffect, useState } from "react";

export default function FlatpointPCTest() {
  const [htmlContent, setHtmlContent] = useState("");
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // JSON 데이터 로드
    async function loadData() {
      try {
        const data = await import("../../../data/플랫포인트/flatpoint-dob110-pc.json");
        setProductData(data.default);

        // HTML 내용 가져오기 + 이미지 경로 변환
        let html = data.default.detailHTML || "";

        // 1. ec-data-src를 src로 변환 (lazy loading 속성 처리)
        html = html.replace(/ec-data-src="\/shop\//g, 'src="https://flatpoint.co.kr/shop/');
        html = html.replace(/ec-data-src="\/web\//g, 'src="https://flatpoint.co.kr/web/');
        html = html.replace(/ec-data-src="\/banner\//g, 'src="https://flatpoint.co.kr/banner/');

        // 2. 기존 src 상대 경로도 절대 경로로 변환
        html = html.replace(/src="\/shop\//g, 'src="https://flatpoint.co.kr/shop/');
        html = html.replace(/src="\/web\//g, 'src="https://flatpoint.co.kr/web/');
        html = html.replace(/src="\/banner\//g, 'src="https://flatpoint.co.kr/banner/');

        // 3. href 링크도 절대 경로로
        html = html.replace(/href="\/shop\//g, 'href="https://flatpoint.co.kr/shop/');
        html = html.replace(/href="\/product\//g, 'href="https://flatpoint.co.kr/product/');

        // 4. data URL (1x1 투명 픽셀) 제거 - ec-data-src 변환 후에 실행
        html = html.replace(/src="data:image\/png;base64,iVBORw0KGg[^"]+"/g, '');

        setHtmlContent(html);
        setLoading(false);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">로딩 중...</div>
          <div className="text-gray-500">플랫포인트 PC 데이터를 불러오는 중입니다</div>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 text-red-600">데이터 없음</div>
          <div className="text-gray-500">flatpoint-dob110-pc.json 파일을 생성해주세요</div>
          <div className="mt-4 text-sm text-gray-400">
            실행: node scripts/flatpoint-pc-scraper.cjs
          </div>
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
            onClick={() => window.history.back()}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">플랫포인트 PC 뷰</h1>
          <div className="w-10"></div>
        </div>
      </header>

      {/* Product Info Banner */}
      <div className="max-w-7xl mx-auto px-6 py-8 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-block px-4 py-2 bg-black text-white rounded-full text-sm font-medium">
            플랫포인트
          </div>
          <div className="inline-block px-4 py-2 bg-blue-100 text-blue-900 rounded-full text-sm font-medium">
            PC 데스크톱 뷰
          </div>
        </div>
        <h2 className="text-3xl font-bold mb-3">{productData.productName}</h2>
        <p className="text-2xl font-bold text-gray-900 mb-6">{productData.price}</p>
        <a
          href={productData.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
        >
          플랫포인트 공식 사이트에서 보기 →
        </a>
      </div>

      {/* Info Box */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-base font-bold text-blue-900 mb-3">🖥️ PC 데스크톱 렌더링</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>• 플랫포인트 공식 사이트의 PC 레이아웃</p>
            <p>• 뷰포트: 1920x1080 (Desktop PC)</p>
            <p>• 스타일 및 레이아웃 100% 원본 재현</p>
            <p>• ec-data-src lazy loading 속성 처리 완료</p>
            <p>• 스크래핑: {new Date(productData.scrapedAt).toLocaleString('ko-KR')}</p>
          </div>
        </div>
      </div>

      {/* 원본 HTML 렌더링 */}
      <div className="max-w-7xl mx-auto px-6">
        <div
          className="flatpoint-pc-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      {/* Footer */}
      <footer className="mt-16 py-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p className="mb-2">LUNUS - 플랫포인트 PC 테스트</p>
          <p className="font-medium">PC 데스크톱 레이아웃 원본 재현</p>
        </div>
      </footer>

      {/* CSS for Flatpoint PC Content */}
      <style jsx global>{`
        /* 기본 컨테이너 */
        .flatpoint-pc-content {
          width: 100%;
          max-width: 100%;
        }

        /* 플랫포인트 pdp-detail 스타일 */
        .flatpoint-pc-content .pdp-detail {
          width: 100%;
        }

        /* Row/Column 그리드 */
        .flatpoint-pc-content .row {
          display: flex;
          flex-wrap: wrap;
          width: 100%;
        }

        .flatpoint-pc-content .col-12 {
          width: 100%;
        }

        .flatpoint-pc-content .col-6 {
          width: 50%;
        }

        .flatpoint-pc-content .col-4 {
          width: 33.333%;
        }

        .flatpoint-pc-content .col-3 {
          width: 25%;
        }

        /* 이미지 반응형 */
        .flatpoint-pc-content img {
          max-width: 100%;
          height: auto;
          display: block;
        }

        /* Padding/Margin */
        .flatpoint-pc-content .pa-50 {
          padding: 50px;
        }

        .flatpoint-pc-content .pa-30 {
          padding: 30px;
        }

        .flatpoint-pc-content .pb-20 {
          padding-bottom: 20px;
        }

        .flatpoint-pc-content .pb-40 {
          padding-bottom: 40px;
        }

        .flatpoint-pc-content .pb-80 {
          padding-bottom: 80px;
        }

        .flatpoint-pc-content .pt-10 {
          padding-top: 10px;
        }

        .flatpoint-pc-content .pt-30 {
          padding-top: 30px;
        }

        .flatpoint-pc-content .mb-80 {
          margin-bottom: 80px;
        }

        .flatpoint-pc-content .mb-120 {
          margin-bottom: 120px;
        }

        .flatpoint-pc-content .mb-150 {
          margin-bottom: 150px;
        }

        .flatpoint-pc-content .mb-200 {
          margin-bottom: 200px;
        }

        /* 폰트 스타일 */
        .flatpoint-pc-content .font-1414 {
          font-size: 14px;
          line-height: 1.4;
        }

        .flatpoint-pc-content .font-1616 {
          font-size: 16px;
          line-height: 1.6;
        }

        .flatpoint-pc-content .font-1818 {
          font-size: 18px;
          line-height: 1.8;
        }

        .flatpoint-pc-content .font-2222 {
          font-size: 22px;
          line-height: 1.5;
        }

        .flatpoint-pc-content .font-2424 {
          font-size: 24px;
          line-height: 1.4;
        }

        .flatpoint-pc-content .font-2828 {
          font-size: 28px;
          line-height: 1.3;
        }

        .flatpoint-pc-content .font-3838 {
          font-size: 38px;
          line-height: 1.2;
        }

        .flatpoint-pc-content .font-4242 {
          font-size: 42px;
          line-height: 1.2;
        }

        .flatpoint-pc-content .kr {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .flatpoint-pc-content .bold {
          font-weight: 700;
        }

        .flatpoint-pc-content .light {
          font-weight: 300;
        }

        /* iframe 반응형 */
        .flatpoint-pc-content .vimeo-wrapper {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
          overflow: hidden;
        }

        .flatpoint-pc-content .vimeo-wrapper iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        /* 카드 스타일 */
        .flatpoint-pc-content .card {
          display: block;
          margin-bottom: 20px;
        }

        .flatpoint-pc-content .card img {
          width: 100%;
          height: auto;
        }

        /* Swiper 슬라이더 */
        .flatpoint-pc-content .swiper {
          width: 100%;
          overflow: hidden;
        }

        .flatpoint-pc-content .swiper-slide {
          flex-shrink: 0;
        }

        /* 제목 스타일 */
        .flatpoint-pc-content .title-sm {
          padding: 30px 20px;
          font-size: 20px;
          font-weight: 700;
        }

        .flatpoint-pc-content .title-md {
          padding: 40px 20px;
          font-size: 28px;
          font-weight: 700;
        }

        .flatpoint-pc-content .title-lg {
          padding: 50px 20px;
          font-size: 36px;
          font-weight: 700;
        }

        /* 텍스트 정렬 */
        .flatpoint-pc-content .align-center {
          text-align: center;
        }

        .flatpoint-pc-content .align-left {
          text-align: left;
        }

        .flatpoint-pc-content .align-right {
          text-align: right;
        }

        /* 반응형 숨김/보임 */
        .flatpoint-pc-content .pc-only {
          display: block;
        }

        .flatpoint-pc-content .mobile-only {
          display: none;
        }

        /* 테두리 제거 */
        .flatpoint-pc-content .bo-r,
        .flatpoint-pc-content .bo-t,
        .flatpoint-pc-content .bo-b {
          border: none;
        }

        /* 추가 레이아웃 */
        .flatpoint-pc-content .clearfix::after {
          content: "";
          display: table;
          clear: both;
        }

        /* 🔥 모바일 반응형 미디어 쿼리 */
        @media (max-width: 768px) {
          /* 모바일에서 col-6을 100%로 */
          .flatpoint-pc-content .col-6 {
            width: 100% !important;
          }

          .flatpoint-pc-content .col-4 {
            width: 100% !important;
          }

          .flatpoint-pc-content .col-3 {
            width: 100% !important;
          }

          /* m-col-12 활성화 */
          .flatpoint-pc-content .m-col-12 {
            width: 100% !important;
          }

          .flatpoint-pc-content .m-col-6 {
            width: 50% !important;
          }

          /* 패딩 축소 */
          .flatpoint-pc-content .pa-50 {
            padding: 20px !important;
          }

          .flatpoint-pc-content .pa-30 {
            padding: 15px !important;
          }

          /* PC only 숨기기 */
          .flatpoint-pc-content .pc-only {
            display: none !important;
          }

          /* Mobile only 보이기 */
          .flatpoint-pc-content .mobile-only {
            display: block !important;
          }

          /* 폰트 사이즈 조정 */
          .flatpoint-pc-content .font-4242 {
            font-size: 28px !important;
          }

          .flatpoint-pc-content .font-3838 {
            font-size: 24px !important;
          }

          .flatpoint-pc-content .font-2828 {
            font-size: 20px !important;
          }

          .flatpoint-pc-content .font-2424 {
            font-size: 18px !important;
          }

          .flatpoint-pc-content .font-2222 {
            font-size: 16px !important;
          }

          /* 마진 축소 */
          .flatpoint-pc-content .mb-200 {
            margin-bottom: 80px !important;
          }

          .flatpoint-pc-content .mb-150 {
            margin-bottom: 60px !important;
          }

          .flatpoint-pc-content .mb-120 {
            margin-bottom: 50px !important;
          }

          .flatpoint-pc-content .mb-80 {
            margin-bottom: 40px !important;
          }
        }
      `}</style>
    </div>
  );
}
