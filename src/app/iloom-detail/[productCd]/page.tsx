"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function IloomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productCd = params.productCd as string;

  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProductData() {
      try {
        // 모든 일룸 JSON 파일 로드
        const categories = [
          "iloom-거실.json",
          "iloom-서재.json",
          "iloom-옷장.json",
          "iloom-조명.json",
          "iloom-주방.json",
          "iloom-키즈룸.json",
          "iloom-학생방.json",
        ];

        let foundProduct = null;

        for (const category of categories) {
          try {
            const data = await import(`../../../../data/일룸/${category}`);
            const products = data.default;

            // productCd로 제품 찾기
            foundProduct = products.find((p: any) => 
              p.productUrl?.includes(`productCd=${productCd}`)
            );

            if (foundProduct) {
              break;
            }
          } catch (e) {
            console.log(`${category} 로드 실패:`, e);
          }
        }

        if (!foundProduct) {
          setError("제품을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        setProductData(foundProduct);
        setLoading(false);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    }

    loadProductData();
  }, [productCd]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">제품 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !productData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "제품을 찾을 수 없습니다."}</p>
          <button
            onClick={() => router.push("/iloom-products")}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
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
      <header className="sticky top-0 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/iloom-products")}
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
          <h1 className="text-lg lg:text-xl font-bold">일룸</h1>
          <div className="w-10"></div>
        </div>
      </header>

      {/* Product Info */}
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
          {/* 대표 이미지 */}
          <div className="lg:w-1/2">
            <div className="relative w-full aspect-square bg-gray-50 rounded-lg overflow-hidden">
              <img
                src={productData.imageUrl}
                alt={productData.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='16' font-family='sans-serif'%3E이미지 없음%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
          </div>

          {/* 제품 정보 */}
          <div className="lg:w-1/2">
            <div className="inline-block px-4 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-700 mb-4">
              일룸
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold mb-4">{productData.title}</h2>
            <p className="text-xl lg:text-3xl font-bold text-gray-900 mb-6">
              {productData.price > 0
                ? `${productData.price.toLocaleString()}원`
                : "가격 문의"}
            </p>
            <a
              href={productData.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 lg:px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              일룸 공식 사이트에서 보기 →
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-4 lg:px-8 pb-20">
        {/* Detail HTML (if exists) - 우선 표시 */}
        {productData.detailHTML && productData.detailHTML.length > 0 ? (
          <div className="mb-12">
            <div className="iloom-detail-content">
              <div dangerouslySetInnerHTML={{ __html: productData.detailHTML }} />
            </div>

            {/* CSS for iloom content */}
            <style jsx global>{`
              .iloom-detail-content .box {
                margin-bottom: 20px;
                width: 100%;
              }

              .iloom-detail-content .contents_100img {
                width: 100%;
                height: auto;
                display: block;
                margin: 0;
                padding: 0;
              }

              .iloom-detail-content .contents_50img {
                width: 48%;
                height: auto;
                display: inline-block;
                margin: 0 1%;
              }

              .iloom-detail-content .contents_50img2 {
                width: 48%;
                height: auto;
                display: inline-block;
                margin: 0 1%;
                vertical-align: top;
              }

              .iloom-detail-content .contents_50contents2 {
                width: 48%;
                display: inline-block;
                margin: 0 1%;
                padding: 20px;
                vertical-align: top;
              }

              .iloom-detail-content .contents_title {
                padding: 20px 0;
                font-size: 18px;
                font-weight: bold;
              }

              .iloom-detail-content .contents_100contents {
                padding: 20px 0;
                line-height: 1.6;
                color: #333;
              }
            `}</style>
          </div>
        ) : (
          <>
            {/* Gallery Images - detailHTML 없을 때만 표시 */}
            {productData.galleryImages && productData.galleryImages.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xl lg:text-2xl font-bold mb-6">제품 갤러리</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {productData.galleryImages.map((img: string, index: number) => (
                    <div
                      key={index}
                      className="relative w-full aspect-square bg-gray-50 rounded-lg overflow-hidden"
                    >
                      <img
                        src={img}
                        alt={`${productData.title} 이미지 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detail Sections - detailHTML 없을 때만 표시 */}
            {productData.detailSections && productData.detailSections.length > 0 && (
              <div className="mb-12">
                <h3 className="text-xl lg:text-2xl font-bold mb-6">상세 정보</h3>
                <div className="space-y-8">
                  {productData.detailSections.map((section: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-6 lg:p-8">
                      {section.title && (
                        <h4 className="text-lg lg:text-xl font-bold mb-4">
                          {section.title}
                        </h4>
                      )}
                      {section.description && (
                        <p className="text-base lg:text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {section.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 text-center">
          <p className="text-sm text-gray-500 mb-2">
            와작 홈즈, scentdestination
          </p>
          <p className="text-xs text-gray-400">대표: 유선화</p>
          <p className="text-xs text-gray-400 mt-2">
            크롤링 일시: {new Date(productData.scrapedAt).toLocaleString("ko-KR")}
          </p>
        </div>
      </footer>
    </div>
  );
}

