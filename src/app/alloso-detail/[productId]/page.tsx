"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface AllosoProduct {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  detailHTML?: string;
  detailImages?: string[];
  sameCollection?: Array<{
    title: string;
    desc: string;
    price: string;
    image: string;
    url: string;
  }>;
  scrapedDetailAt?: string;
}

export default function AllosoDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const router = useRouter();
  const { productId } = use(params);
  const [product, setProduct] = useState<AllosoProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/alloso-detail?productId=${productId}`);
      const data = await response.json();
      
      if (data.success && data.product) {
        setProduct(data.product);
        console.log('✅ Product loaded:', data.product.title);
        console.log('📄 Has HTML:', !!data.product.detailHTML);
      }
    } catch (error) {
      console.error("Failed to load product:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">제품을 찾을 수 없습니다</div>
      </div>
    );
  }

  // HTML이 있으면 원본 렌더링
  if (product.detailHTML) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="sticky top-0 bg-white border-b border-gray-200 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <button 
              onClick={() => router.push('/alloso-products')}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold">알로소 상세</h1>
            <div className="w-10"></div>
          </div>
        </header>

        {/* Product Info Section */}
        <div className="max-w-7xl mx-auto px-6 py-8 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Main Image */}
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <img
                alt={product.title}
                className="w-full h-full object-cover"
                src={product.imageUrl}
              />
            </div>

            {/* Product Info */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-block px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium">
                  알로소
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-3">{product.title}</h2>
              <p className="text-2xl font-bold text-gray-900 mb-6">{product.price.toLocaleString()}원</p>
              <a
                href={product.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
              >
                알로소 공식 사이트에서 보기 →
              </a>
            </div>
          </div>
        </div>

        {/* Info Notice */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-base font-bold text-blue-900 mb-3">🛋️ 알로소 원본 렌더링</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p>• 디자인 리클라이너의 새로운 기준</p>
              <p>• 원본 HTML 및 스타일 100% 재현</p>
              <p>• 상세 이미지: {product.detailImages?.length || 0}개</p>
              {product.scrapedDetailAt && (
                <p>• 업데이트: {new Date(product.scrapedDetailAt).toLocaleString('ko-KR')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Detail HTML Content */}
        <div className="max-w-7xl mx-auto px-6">
          <div 
            className="alloso-detail-content"
            dangerouslySetInnerHTML={{ __html: product.detailHTML }}
          />
        </div>

        {/* Same Collection */}
        {product.sameCollection && product.sameCollection.length > 0 && (
          <div className="max-w-7xl mx-auto px-6 py-8 bg-gray-50 mt-8">
            <h2 className="text-2xl font-bold mb-6">같은 컬렉션</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {product.sameCollection.slice(0, 8).map((item, index) => (
                <a
                  key={index}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="relative w-full h-48 bg-gray-50">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-contain p-4"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 text-sm">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-1">{item.desc}</p>
                    <p className="text-blue-600 font-bold text-sm">{item.price}원</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 py-8 bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
            <p className="mb-2">LUNUS - 알로소 제품 상세</p>
            <p className="font-medium">디자인 리클라이너의 새로운 기준</p>
            <p className="mt-4">와작 홈즈, scentdestination</p>
            <p>대표: 유선화</p>
          </div>
        </footer>

        {/* Alloso CSS Styles */}
        <style jsx global>{`
          /* 알로소 상세 컨테이너 */
          .alloso-detail-content {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
          }

          /* 알로소 그리드 시스템 */
          .alloso-detail-content .col_wrap {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            margin: 0 auto;
          }

          .alloso-detail-content .col_comm {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          /* col1: 전체 너비 */
          .alloso-detail-content .col1,
          .alloso-detail-content .col1_tit {
            width: 100%;
          }

          /* col2: 2등분 (가로 배치) */
          .alloso-detail-content .col2 {
            width: calc(50% - 5px);
            box-sizing: border-box;
          }

          /* col3: 3등분 */
          .alloso-detail-content .col3 {
            width: calc(33.333% - 7px);
            box-sizing: border-box;
          }

          /* col4: 4등분 */
          .alloso-detail-content .col4 {
            width: calc(25% - 8px);
            box-sizing: border-box;
          }

          .alloso-detail-content .col_item {
            width: 100%;
            margin-bottom: 20px;
          }

          /* 이미지 스타일 */
          .alloso-detail-content img {
            max-width: 100%;
            height: auto;
            display: block;
          }

          /* 썸네일 타일 그리드 */
          .alloso-detail-content .thumb.ico {
            display: inline-block;
            margin: 5px;
          }

          .alloso-detail-content .thumb.ico img {
            width: 100%;
            height: auto;
            border-radius: 4px;
          }

          /* 텍스트 스타일 */
          .alloso-detail-content .txt2_eng,
          .alloso-detail-content .txt2_ko {
            display: none; /* breadcrumb 숨김 */
          }

          .alloso-detail-content .ft_normal {
            font-weight: normal;
          }

          /* 모든 불필요한 요소 숨김 */
          .alloso-detail-content .detail_notice,
          .alloso-detail-content .detail_sns,
          .alloso-detail-content .delivery,
          .alloso-detail-content .slick-dots,
          .alloso-detail-content .slick-arrow,
          .alloso-detail-content button {
            display: none !important;
          }

          /* 반응형 */
          @media (max-width: 768px) {
            .alloso-detail-content .col_wrap {
              width: 100% !important;
              padding: 10px !important;
            }

            .alloso-detail-content .col_comm {
              width: 100% !important;
            }

            /* 모바일에서는 세로 배치 */
            .alloso-detail-content .col2 {
              width: 100% !important;
            }

            .alloso-detail-content .col3 {
              width: 100% !important;
            }

            .alloso-detail-content .col4 {
              width: 100% !important;
            }

            /* 폰트 크기 조정 */
            .alloso-detail-content span[style*="font-size: 30px"] {
              font-size: 22px !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // Fallback: HTML이 없으면 안내
  return (
    <div className="min-h-screen bg-white">
      <header className="px-4 lg:px-8 pt-6 pb-4 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.push('/alloso-products')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mr-2">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm">목록으로</span>
          </button>

          <div className="inline-block px-3 py-1 bg-blue-50 rounded-full text-xs font-medium text-blue-700 mb-3">
            알로소 • 디자인 리클라이너
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{product.title}</h1>
          <p className="text-2xl font-bold text-gray-900 mb-4">{product.price.toLocaleString()}원</p>
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            공식 사이트에서 보기 →
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-bold mb-2">⚠️ HTML 상세 정보가 없습니다.</p>
          <p className="text-yellow-700 text-sm">
            터미널에서 <code className="bg-yellow-100 px-2 py-1 rounded">node scripts/alloso-html-scraper.cjs</code> 를 실행해주세요.
          </p>
        </div>
      </div>

      <footer className="mt-16 py-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p className="mb-2">LUNUS - 알로소 제품 상세</p>
          <p className="mt-4">와작 홈즈, scentdestination</p>
          <p>대표: 유선화</p>
        </div>
      </footer>
    </div>
  );
}
