'use client';

import { useState } from 'react';

interface ScrapeResult {
  success: boolean;
  message: string;
  products?: any[];
  error?: string;
}

export default function ScrapePage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScrapeResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('침실');

  const categories = ['침실', '거실', '주방', '서재', '아이방'];

  // 단일 카테고리 크롤링
  const handleScrapeCategory = async () => {
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch(`/api/scrape/iloom?category=${selectedCategory}`);
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({
        success: false,        message: '크롤링 중 오류 발생',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    } finally {
      setLoading(false);
    }
  };

  // 모든 카테고리 크롤링
  const handleScrapeAll = async () => {
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/scrape/iloom', {
        method: 'POST'
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({
        success: false,
        message: '크롤링 중 오류 발생',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    } finally {
      setLoading(false);
    }
  };

  return (    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">일룸 제품 크롤링 관리</h1>
        
        {/* 디버그 섹션 추가 */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">🔍 디버그 도구</h2>
          <div className="flex gap-4">
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch('/api/scrape/debug-advanced');
                  const data = await res.json();
                  console.log('Advanced Debug:', data);
                  alert(`디버그 완료! 콘솔을 확인하세요. 
이미지: ${data.analysis?.images?.total || 0}개
제품 이미지: ${data.analysis?.images?.productImages?.length || 0}개`);
                } catch (e) {
                  console.error(e);
                }
                setLoading(false);
              }}
              disabled={loading}
              className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-300"
            >
              🐛 고급 디버그 실행 (콘솔 확인)
            </button>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch('/api/scrape/test');
                  const data = await res.json();
                  alert(data.message || '테스트 완료');
                } catch (e) {
                  console.error(e);
                }
                setLoading(false);
              }}
              disabled={loading}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300"
            >
              🧪 기본 테스트
            </button>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch(`/api/scrape/fix?category=${selectedCategory}`);
                  const data = await res.json();
                  setResults(data);
                } catch (e) {
                  console.error(e);
                  setResults({
                    success: false,
                    message: '크롤링 실패',
                    error: '네트워크 오류'
                  });
                }
                setLoading(false);
              }}
              disabled={loading}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
            >
              🔧 수정된 크롤러 실행
            </button>
          </div>
        </div>
        
        {/* 크롤링 컨트롤 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">크롤링 실행</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              <button
                onClick={handleScrapeCategory}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
              >
                {loading ? '크롤링 중...' : '기본 크롤링 (원본)'}
              </button>
              
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch(`/api/scrape/stable?category=${selectedCategory}`);
                    const data = await res.json();
                    setResults(data);
                  } catch (e) {
                    setResults({
                      success: false,
                      message: '안정 버전 크롤링 실패',
                      error: e instanceof Error ? e.message : '알 수 없는 오류'
                    });
                  }
                  setLoading(false);
                }}
                disabled={loading}
                className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-300"
              >
                {loading ? '크롤링 중...' : '🔒 안정 버전'}
              </button>
            </div>
          </div>          
          <button
            onClick={handleScrapeAll}
            disabled={loading}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
          >
            {loading ? '크롤링 중...' : '모든 카테고리 크롤링'}
          </button>
        </div>

        {/* 결과 표시 */}
        {results && (
          <div className={`bg-white rounded-lg shadow-md p-6 ${results.success ? 'border-green-500' : 'border-red-500'} border-l-4`}>
            <h2 className="text-xl font-semibold mb-4">크롤링 결과</h2>
            <p className={`mb-2 ${results.success ? 'text-green-600' : 'text-red-600'}`}>
              {results.message}
            </p>
            {results.error && (
              <p className="text-red-500 text-sm mb-4">{results.error}</p>
            )}
            
            {results.products && results.products.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">수집된 제품 ({results.products.length}개):</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {results.products.map((product, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.priceText}</p>
                      <a 
                        href={product.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        제품 보기 →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}