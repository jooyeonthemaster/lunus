import Link from "next/link";
import enexKitchen from "../../../../data/에넥스/enex-리모델링주방.json";
import enexCloset from "../../../../data/에넥스/enex-붙박이장.json";
import enexOffice from "../../../../data/에넥스/enex-서재오피스.json";
import enexSofa from "../../../../data/에넥스/enex-소파거실.json";
import enexDining from "../../../../data/에넥스/enex-식탁다이닝.json";
import enexDress from "../../../../data/에넥스/enex-옷장드레스룸.json";
import enexDoor from "../../../../data/에넥스/enex-중문.json";
import enexBed from "../../../../data/에넥스/enex-침실가구.json";

// 제품 타입 정의
interface EnexProduct {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  detailImages?: string[];
  scrapedDetailAt?: string;
}

export default async function EnexDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  // 모든 제품 데이터 병합
  const allProducts: EnexProduct[] = [
    ...enexKitchen,
    ...enexCloset,
    ...enexOffice,
    ...enexSofa,
    ...enexDining,
    ...enexDress,
    ...enexDoor,
    ...enexBed,
  ];

  // productId로 제품 찾기
  const productData = allProducts.find((product) =>
    product.productUrl.includes(`goodsNo=${productId}`)
  );

  if (!productData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            제품을 찾을 수 없습니다
          </h1>
          <Link
            href="/enex-products"
            className="text-blue-600 hover:underline"
          >
            제품 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 상세 이미지 배열 생성
  const detailImages: string[] = productData.detailImages || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            href="/enex-products"
            className="text-blue-600 hover:underline text-sm mb-2 inline-block"
          >
            ← 제품 목록으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {productData.title}
          </h1>
        </div>
      </div>

      {/* 메인 이미지 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="aspect-square relative bg-gray-100">
            <img
              src={productData.imageUrl}
              alt={productData.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {productData.title}
            </h2>
            <p className="text-3xl font-bold text-blue-600 mb-4">
              {productData.price.toLocaleString()}원
            </p>
            <a
              href={productData.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              제품 상세보기 (에넥스 공식 사이트)
            </a>
          </div>
        </div>

        {/* 상세 이미지 */}
        {detailImages.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">제품 상세</h2>
            <div className="space-y-4">
              {detailImages.map((imageUrl: string, index: number) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                >
                  <img
                    src={imageUrl}
                    alt={`상세 이미지 ${index + 1}`}
                    className="w-full h-auto"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {detailImages.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            상세 이미지가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
