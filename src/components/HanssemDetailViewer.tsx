'use client';

interface DetailSection {
  title: string;
  description: string;
}

interface HanssemProduct {
  title: string;
  price: number;
  productUrl: string;
  imageUrl: string;
  thumbnailImages?: string[];
  detailSections?: DetailSection[];
  detailImages?: string[];
  scrapedAt?: string;
}

interface Props {
  product: HanssemProduct;
  onBack?: () => void;
}

export default function HanssemDetailViewer({ product, onBack }: Props) {
  // Get hero image (first thumbnail or main image)
  const heroImage = product.thumbnailImages?.[0] || product.imageUrl;

  // 모든 이미지 수집 (최소 3개)
  const allImages = [product.imageUrl, ...(product.thumbnailImages || [])]
    .filter((img, index, arr) => img && img.trim() !== '' && arr.indexOf(img) === index); // 중복 제거

  // Filter out meaningless sections (empty, too short, just punctuation)
  const meaningfulSections = (product.detailSections || []).filter(section => {
    const title = section.title?.trim() || '';
    const desc = section.description?.trim() || '';

    // Skip if both are empty
    if (!title && !desc) return false;

    // Skip if description is just punctuation or very short
    if (desc.length > 0 && desc.length < 10) return false;
    if (/^[.\s!?,:;-]+$/.test(desc)) return false;

    return true;
  });

  // Extract features from meaningful sections
  const features = meaningfulSections
    .filter(section => section.title && section.title.trim() !== '')
    .slice(0, 3);

  // Get first paragraph for hero description
  const heroDescription = meaningfulSections[0]?.description || '';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex-1">
              <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full mb-2">
                HANSSEM x LUNUS
              </div>
              <h1 className="text-xl font-bold text-gray-900">{product.title}</h1>
              <p className="text-lg text-gray-600">{product.price?.toLocaleString()}원</p>
            </div>
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              구매하기
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="relative w-full h-[500px] bg-gray-100 overflow-hidden">
          <img
            src={heroImage}
            alt={product.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
          <div className="absolute bottom-8 left-8 text-white">
            <p className="text-sm font-medium mb-2 tracking-wider">HANSSEM COLLECTION</p>
            <h2 className="text-4xl font-bold mb-2">{product.title}</h2>
          </div>
        </div>

        {/* Description Section */}
        {heroDescription && (
          <div className="px-8 py-12 bg-gray-50">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                {heroDescription}
              </p>
            </div>
          </div>
        )}

        {/* Features Section */}
        {features.length > 0 && (
          <div className="px-8 py-12">
            <h3 className="text-2xl font-bold text-center mb-12">주요 특징</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-900 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">{idx + 1}</span>
                  </div>
                  <h4 className="text-lg font-semibold mb-2">{feature.title}</h4>
                  <div className="w-12 h-1 bg-gray-900 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 상세 이미지 갤러리 (최소 3개) */}
        {allImages.length > 0 && (
          <div className="px-8 py-12 bg-gray-50">
            <h3 className="text-2xl font-bold text-center mb-12">제품 상세</h3>
            <div className="space-y-8">
              {allImages.map((img, idx) => (
                <div key={idx} className="relative w-full overflow-hidden rounded-lg">
                  <img
                    src={img}
                    alt={`${product.title} 상세 이미지 ${idx + 1}`}
                    className="w-full h-auto"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Detail Sections - removed, not needed in LUNUS style */}

        {/* CTA Section */}
        <div className="px-8 py-16 bg-gray-900 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">지금 바로 경험해보세요</h3>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            HANSSEM의 감각적인 디자인과 편안함을 직접 느껴보세요. 당신의 공간을 특별하게 만들어드립니다.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              제품 상세보기
            </a>
            {onBack && (
              <button
                onClick={onBack}
                className="px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white hover:text-gray-900 transition-colors font-medium"
              >
                다른 제품 보기
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}