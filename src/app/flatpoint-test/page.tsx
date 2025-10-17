"use client";

import { useEffect, useState } from "react";

export default function FlatpointMobileTest() {
  const [htmlContent, setHtmlContent] = useState("");
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // JSON 데이터 로드
    async function loadData() {
      try {
        const data = await import("../../../data/플랫포인트/flatpoint-dob110-mobile.json");
        setProductData(data.default);

        // HTML 내용 가져오기 + 이미지 경로 변환
        let html = data.default.detailHTML || "";

        // 1. 상대 경로를 절대 경로로 변환
        html = html.replace(/src="\/shop\//g, 'src="https://flatpoint.co.kr/shop/');
        html = html.replace(/src="\/web\//g, 'src="https://flatpoint.co.kr/web/');
        html = html.replace(/src="\/banner\//g, 'src="https://flatpoint.co.kr/banner/');
        html = html.replace(/href="\/shop\//g, 'href="https://flatpoint.co.kr/shop/');

        // 2. lazy loading 속성 처리 (ec-data-src를 src로 변환)
        html = html.replace(/ec-data-src="\/shop\//g, 'src="https://flatpoint.co.kr/shop/');
        html = html.replace(/ec-data-src="\/web\//g, 'src="https://flatpoint.co.kr/web/');
        html = html.replace(/ec-data-src="\/banner\//g, 'src="https://flatpoint.co.kr/banner/');

        // 3. data URL (1x1 투명 픽셀) 제거
        html = html.replace(/src="data:image\/png;base64,[^"]+"/g, '');

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
          <div className="text-gray-500">플랫포인트 모바일 데이터를 불러오는 중입니다</div>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 text-red-600">데이터 없음</div>
          <div className="text-gray-500">flatpoint-dob110-mobile.json 파일을 생성해주세요</div>
          <div className="mt-4 text-sm text-gray-400">
            실행: node scripts/flatpoint-mobile-scraper.cjs
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-[390px] mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold">플랫포인트 모바일</h1>
          <div className="w-10"></div>
        </div>
      </header>

      {/* Product Info Banner */}
      <div className="max-w-[390px] mx-auto px-4 py-6 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-block px-3 py-1 bg-black text-white rounded-full text-xs font-medium">
            플랫포인트
          </div>
          <div className="inline-block px-3 py-1 bg-purple-100 text-purple-900 rounded-full text-xs font-medium">
            모바일 뷰
          </div>
        </div>
        <h2 className="text-xl font-bold mb-2">{productData.productName}</h2>
        <p className="text-lg font-bold text-gray-900 mb-4">{productData.price}</p>
        <a
          href={productData.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full text-center py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors font-medium text-sm"
        >
          플랫포인트 공식 사이트에서 보기 →
        </a>
      </div>

      {/* Info Box */}
      <div className="max-w-[390px] mx-auto px-4 py-4">
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="text-sm font-bold text-purple-900 mb-2">📱 모바일 렌더링</h3>
          <div className="text-xs text-purple-700 space-y-1">
            <p>• 플랫포인트 공식 사이트의 모바일 레이아웃</p>
            <p>• 뷰포트: 390x844 (iPhone 12 Pro)</p>
            <p>• 스타일 및 레이아웃 100% 원본 재현</p>
            <p>• 스크래핑: {new Date(productData.scrapedAt).toLocaleString('ko-KR')}</p>
          </div>
        </div>
      </div>

      {/* 원본 HTML 렌더링 */}
      <div className="max-w-[390px] mx-auto">
        <div
          className="flatpoint-mobile-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>

      {/* Footer */}
      <footer className="mt-12 py-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-[390px] mx-auto px-4 text-center text-xs text-gray-500">
          <p className="mb-1">LUNUS - 플랫포인트 모바일 테스트</p>
          <p className="font-medium">모바일 레이아웃 원본 재현</p>
        </div>
      </footer>

      {/* CSS for Flatpoint Mobile Content */}
      <style jsx global>{`
        /* 모바일 컨테이너 최대 너비 */
        .flatpoint-mobile-content {
          max-width: 390px;
          margin: 0 auto;
          overflow-x: hidden;
        }

        /* 플랫포인트 기본 스타일 */
        .flatpoint-mobile-content .pdp-detail {
          width: 100%;
        }

        .flatpoint-mobile-content .row {
          display: flex;
          flex-wrap: wrap;
          width: 100%;
        }

        .flatpoint-mobile-content .col-12 {
          width: 100%;
        }

        .flatpoint-mobile-content .m-col-12 {
          width: 100%;
        }

        .flatpoint-mobile-content .m-col-6 {
          width: 50%;
        }

        .flatpoint-mobile-content .m-col-4 {
          width: 33.333%;
        }

        .flatpoint-mobile-content .m-col-3 {
          width: 25%;
        }

        /* 이미지 반응형 */
        .flatpoint-mobile-content img {
          max-width: 100%;
          height: auto;
          display: block;
        }

        /* 패딩/마진 */
        .flatpoint-mobile-content .pa-50 {
          padding: 20px;
        }

        .flatpoint-mobile-content .pb-20 {
          padding-bottom: 20px;
        }

        .flatpoint-mobile-content .pb-40 {
          padding-bottom: 40px;
        }

        .flatpoint-mobile-content .pt-10 {
          padding-top: 10px;
        }

        .flatpoint-mobile-content .mb-80 {
          margin-bottom: 80px;
        }

        .flatpoint-mobile-content .mb-120 {
          margin-bottom: 120px;
        }

        .flatpoint-mobile-content .mb-150 {
          margin-bottom: 150px;
        }

        .flatpoint-mobile-content .mb-200 {
          margin-bottom: 200px;
        }

        /* 폰트 */
        .flatpoint-mobile-content .font-1414 {
          font-size: 14px;
          line-height: 1.4;
        }

        .flatpoint-mobile-content .font-1616 {
          font-size: 16px;
          line-height: 1.6;
        }

        .flatpoint-mobile-content .font-1818 {
          font-size: 18px;
          line-height: 1.8;
        }

        .flatpoint-mobile-content .font-2222 {
          font-size: 22px;
          line-height: 1.5;
        }

        .flatpoint-mobile-content .font-2424 {
          font-size: 24px;
          line-height: 1.4;
        }

        .flatpoint-mobile-content .font-2828 {
          font-size: 28px;
          line-height: 1.3;
        }

        .flatpoint-mobile-content .font-3838 {
          font-size: 38px;
          line-height: 1.2;
        }

        .flatpoint-mobile-content .font-4242 {
          font-size: 42px;
          line-height: 1.2;
        }

        .flatpoint-mobile-content .kr {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .flatpoint-mobile-content .bold {
          font-weight: 700;
        }

        .flatpoint-mobile-content .light {
          font-weight: 300;
        }

        /* iframe 반응형 */
        .flatpoint-mobile-content .vimeo-wrapper {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
          overflow: hidden;
        }

        .flatpoint-mobile-content .vimeo-wrapper iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        /* 카드 스타일 */
        .flatpoint-mobile-content .card {
          display: block;
          margin-bottom: 20px;
        }

        .flatpoint-mobile-content .card img {
          width: 100%;
          height: auto;
        }

        /* Swiper 슬라이더 */
        .flatpoint-mobile-content .swiper {
          width: 100%;
          overflow: hidden;
        }

        .flatpoint-mobile-content .swiper-slide {
          flex-shrink: 0;
        }

        .flatpoint-mobile-content .swiper-button-prev,
        .flatpoint-mobile-content .swiper-button-next {
          display: none; /* 모바일에서는 버튼 숨김 */
        }

        /* 제목 스타일 */
        .flatpoint-mobile-content .title-sm {
          padding: 30px 20px;
          font-size: 20px;
          font-weight: 700;
        }

        .flatpoint-mobile-content .title-md {
          padding: 40px 20px;
          font-size: 24px;
          font-weight: 700;
        }

        /* 컬러 카드 */
        .flatpoint-mobile-content .color-card {
          display: block;
          padding: 10px;
        }

        .flatpoint-mobile-content .color-card img {
          width: 100%;
          margin-bottom: 10px;
        }

        /* 텍스트 정렬 */
        .flatpoint-mobile-content .align-center {
          text-align: center;
        }

        .flatpoint-mobile-content .m-align-center {
          text-align: center;
        }

        /* 기타 */
        .flatpoint-mobile-content .pc-only {
          display: none;
        }

        .flatpoint-mobile-content .mobile-only {
          display: block;
        }

        .flatpoint-mobile-content .bo-r,
        .flatpoint-mobile-content .bo-t,
        .flatpoint-mobile-content .bo-b,
        .flatpoint-mobile-content .m-bo-none {
          border: none;
        }
      `}</style>
    </div>
  );
}
