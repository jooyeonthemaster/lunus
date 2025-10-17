"use client";

/**
 * Variant 1: HTML 임베드 방식
 * detailHTML을 그대로 렌더링 (dangerouslySetInnerHTML)
 */

interface ProductDetailVariant1Props {
  product: {
    title: string;
    price: number;
    productUrl: string;
    imageUrl: string;
    detailHTML?: string;
  };
  onBack: () => void;
}

export default function ProductDetailVariant1({ product, onBack }: ProductDetailVariant1Props) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full mb-2">
                방식 1: HTML 임베드
              </div>
              <h1 className="text-xl font-bold text-gray-900">{product.title}</h1>
              <p className="text-lg text-gray-600">{product.price?.toLocaleString()}원</p>
            </div>
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              원본 보기
            </a>
          </div>
        </div>
      </header>

      {/* HTML Content */}
      <main className="max-w-7xl mx-auto">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>주의:</strong> 원본 HTML을 그대로 렌더링합니다. 스타일이 깨질 수 있으며, 외부 스크립트는 작동하지 않습니다.
              </p>
            </div>
          </div>
        </div>

        {product.detailHTML ? (
          <div
            className="px-4 py-6"
            dangerouslySetInnerHTML={{ __html: product.detailHTML }}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600">HTML 콘텐츠가 없습니다.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
