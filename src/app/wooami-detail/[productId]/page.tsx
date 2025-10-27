"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// 우아미 제품 리스트 데이터
import wooamiProductsList from "../../../../data/우아미/products.json";

export default function WooamiDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;

  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadProductData() {
      try {
        // productId는 product_no (예: "1349")
        const productNo = productId;

        // products.json에서 product_no로 제품 찾기
        const foundProduct = wooamiProductsList.find((p: any) => {
          const match = p.productUrl?.match(/product_no=(\d+)/);
          return match && match[1] === productNo;
        });

        if (!foundProduct) {
          console.error('❌ 제품을 찾을 수 없습니다. productNo:', productNo);
          setError("제품을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        console.log('✅ 제품 데이터 로드 (product_no:', productNo, '):', foundProduct);

        // 카테고리 정보 추가
        const categoryMap: Record<string, string> = {
          "43": "거실장",
          "44": "서랍장",
          "45": "옷장",
          "49": "홈오피스",
          "48": "화장대",
          "46": "주방",
          "47": "침대",
          "72": "매트리스",
          "70": "거실소파"
        };

        const cateMatch = foundProduct.productUrl?.match(/cate_no=(\d+)/);
        const category = cateMatch ? (categoryMap[cateMatch[1]] || "가구") : "가구";

        setProductData({
          ...foundProduct,
          category
        });
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

  const handleImageError = (src: string) => {
    setImageErrors(prev => new Set(prev).add(src));
  };

  const isImageValid = (src: string) => {
    return src && !imageErrors.has(src);
  };

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
            onClick={() => router.push("/wooami-products")}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            제품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 모든 이미지 수집 (메인 + 상세)
  const allImages = [productData.imageUrl, ...(productData.detailImages || [])]
    .filter(img => img && img.trim() !== '')
    .filter(isImageValid);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-4 lg:px-8 pt-6 lg:pt-24 pb-4 lg:pb-6 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.push("/wooami-products")}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mr-2">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm lg:text-base">목록으로</span>
          </button>

          <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700 mb-3">
            우아미 • {productData.category || "가구"}
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
      {productData.imageUrl && isImageValid(productData.imageUrl) && (
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
          <div className="bg-white rounded-lg overflow-hidden shadow-lg">
            <img
              src={productData.imageUrl}
              alt={productData.title}
              className="w-full h-auto"
              onError={() => handleImageError(productData.imageUrl)}
            />
          </div>
        </div>
      )}

      {/* 상세 이미지 갤러리 */}
      {productData.detailImages && productData.detailImages.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
          <div className="border-t border-gray-200 pt-12 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">제품 상세</h2>
            <p className="text-gray-600">제품의 상세한 정보를 확인하세요</p>
          </div>

          <div className="space-y-4">
            {productData.detailImages.map((imageSrc: string, index: number) => (
              isImageValid(imageSrc) && (
                <div
                  key={index}
                  className="bg-white rounded-lg overflow-hidden shadow-lg"
                >
                  <img
                    src={imageSrc}
                    alt={`${productData.title} 상세 이미지 ${index + 1}`}
                    className="w-full h-auto"
                    loading="lazy"
                    onError={() => handleImageError(imageSrc)}
                  />
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* 상세 이미지 없을 경우 */}
      {(!productData.detailImages || productData.detailImages.length === 0) && (
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12">
          <div className="text-center text-gray-500 bg-gray-50 rounded-lg py-12">
            <p className="text-lg">상세 이미지가 준비 중입니다.</p>
            <p className="text-sm mt-2">곧 업데이트될 예정입니다.</p>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            <span className="font-medium text-gray-900">우아미</span>
            <span className="mx-2">·</span>
            <span>Premium Furniture Collection</span>
          </div>
          {productData.scrapedDetailAt && (
            <div className="text-xs text-gray-400">
              {new Date(productData.scrapedDetailAt).toLocaleDateString('ko-KR')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





