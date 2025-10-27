"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNavigation from "@/components/BottomNavigation";
import { getBrandDetailUrl } from "@/utils/brand-detail-url";

type CrawledProduct = {
  title: string | null;
  price: number | null;
  productUrl: string | null;
  imageUrl: string | null;
  origin?: { group: string; file: string; path: string; category?: string | null };
};

interface AllCrawledProductsViewProps {
  onBackToMain: () => void;
  onSearchClick?: () => void;
  onMapClick?: () => void;
  onCartClick?: () => void;
}

export default function AllCrawledProductsView({
  onBackToMain,
  onSearchClick,
  onMapClick,
  onCartClick,
}: AllCrawledProductsViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CrawledProduct[]>([]);
  const [group, setGroup] = useState<string>("전체");
  const [category, setCategory] = useState<string>("전체");
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // 상품 클릭 핸들러
  const handleProductClick = (product: CrawledProduct) => {
    const detailUrl = getBrandDetailUrl(product);
    if (detailUrl) {
      router.push(detailUrl);
    } else {
      // 폴백: 외부 링크
      if (product.productUrl) {
        window.open(product.productUrl, '_blank');
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/products/all");
        const data = await res.json();
        if (mounted) setItems(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const groups = Array.from(new Set(["전체", ...items.map((p) => p.origin?.group || "root")])) as string[];
  const categories = Array.from(new Set(["전체", ...items.filter(p => (group === "전체" ? true : p.origin?.group === group)).map(p => (p.origin?.category || "기타"))]));
  const filteredByGroup = items.filter((p) => (group === "전체" ? true : (p.origin?.group === group)));
  const filtered = filteredByGroup.filter((p) => (category === "전체" ? true : ((p.origin?.category || "기타") === category)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const current = filtered.slice(start, start + pageSize);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-4 lg:px-8 pt-6 lg:pt-24 pb-4 lg:pb-6">
        <div className="text-center mb-4 lg:mb-6">
          <h1 className="text-3xl lg:text-5xl font-normal tracking-[0.15em] mb-2 lg:mb-4">LUNUS</h1>
          <p className="text-gray-600 text-sm lg:text-lg">모든 크롤링 상품을 둘러보세요</p>
        </div>
      </header>

      {/* Main */}
      <main className="px-4 lg:px-8 pb-20 lg:pb-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Group (site-folder) filter */}
          <div className="mb-6 lg:mb-8">
            <h3 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6">크롤링 그룹(사이트/브랜드 폴더)</h3>
            <div className="flex gap-2 lg:gap-3 overflow-x-auto scrollbar-hide pb-2">
              {groups.map((label) => (
                <button
                  key={label}
                  onClick={() => { setGroup(label); setCategory("전체"); setPage(1); }}
                  className={`flex-shrink-0 px-4 lg:px-6 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium whitespace-nowrap transition-colors ${
                    group === label ? "bg-gray-800 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Category (file name) filter */}
          <div className="mb-6 lg:mb-8">
            <h3 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6">카테고리(파일)</h3>
            <div className="flex gap-2 lg:gap-3 overflow-x-auto scrollbar-hide pb-2">
              {categories.map((label) => (
                <button
                  key={label}
                  onClick={() => { setCategory(label); setPage(1); }}
                  className={`flex-shrink-0 px-4 lg:px-6 py-2 lg:py-3 rounded-full text-sm lg:text-base font-medium whitespace-nowrap transition-colors ${
                    category === label ? "bg-gray-800 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div className="mb-4 lg:mb-6">
            <div className="flex items-center justify-between">
              <p className="text-sm lg:text-base text-gray-600">
                {loading ? "불러오는 중..." : `총 ${filtered.length}개 / ${page}페이지 (${pageSize}개씩)`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-2 rounded bg-gray-100 text-gray-700 disabled:opacity-50"
                >
                  이전
                </button>
                <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-2 rounded bg-gray-100 text-gray-700 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 mb-8">
            {current.map((p, idx) => (
              <div
                key={idx}
                onClick={() => handleProductClick(p)}
                className="bg-white hover:shadow-lg transition-shadow rounded-lg overflow-hidden cursor-pointer"
              >
                <div className="relative w-full h-40 lg:h-48 overflow-hidden bg-gray-50 mb-3">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.title || ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </div>
                <div className="p-3 lg:p-4">
                  <h3 className="text-sm lg:text-base font-medium line-clamp-2 mb-1" title={p.title || undefined}>
                    {p.title || "제목 없음"}
                  </h3>
                  <p className="text-sm lg:text-base font-semibold">
                    {p.price != null ? `${p.price.toLocaleString()}원` : ""}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {p.origin?.group || ""}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Back */}
          <div className="text-center">
            <button
              onClick={onBackToMain}
              className="px-8 py-3 lg:px-12 lg:py-4 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-900 transition-colors"
            >
              메인으로 돌아가기
            </button>
          </div>
        </div>
      </main>

      <BottomNavigation
        currentView="all-products"
        onSearchClick={onSearchClick}
        onMapClick={onMapClick}
        onCartClick={onCartClick}
      />
    </div>
  );
}


