"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import testData from "../../../../data/일룸/iloom-test-html.json";

export default function ProductDetailV4() {
  const params = useParams();
  const brand = params.brand as string;
  const [htmlContent, setHtmlContent] = useState("");

  useEffect(() => {
    // HTML 내용을 가져와서 이미지 경로를 절대 경로로 변환
    let html = testData.detailHTML || "";
    
    // 상대 경로를 절대 경로로 변환
    html = html.replace(/src="\/upload\//g, 'src="https://www.iloom.com/upload/');
    
    setHtmlContent(html);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-[380px] mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold">4안 - 원본 HTML</h1>
          <div className="w-10"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[380px] mx-auto bg-white">
        {/* Product Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700 mb-3">
            {testData.brand} • 거실
          </div>
          <h2 className="text-2xl font-bold mb-2">{testData.productName}</h2>
          <p className="text-sm text-gray-500 mb-4">
            일룸 공식 사이트의 HTML을 그대로 가져온 4안입니다
          </p>
          <a
            href={testData.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full text-center py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium"
          >
            공식 사이트에서 보기 →
          </a>
        </div>

        {/* 원본 HTML 렌더링 */}
        <div className="p-4">
          <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="text-sm font-bold text-purple-900 mb-1">🎨 4안 특징</h3>
            <p className="text-xs text-purple-700">
              일룸 사이트의 HTML/CSS를 그대로 가져와 렌더링합니다
            </p>
          </div>

          {/* HTML Content */}
          <div 
            className="iloom-detail-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* Footer */}
        <footer className="mt-12 p-6 bg-gray-50 border-t border-gray-200">
          <div className="text-center text-xs text-gray-500">
            <p className="mb-1">와작 홈즈, scentdestination</p>
            <p className="font-medium">대표: 유선화</p>
            <p className="mt-2 text-gray-400">
              스크래핑: {new Date(testData.scrapedAt).toLocaleString('ko-KR')}
            </p>
          </div>
        </footer>
      </main>

      {/* CSS for iloom content */}
      <style jsx global>{`
        .iloom-detail-content .box {
          margin-bottom: 0;
          width: 100%;
        }
        
        .iloom-detail-content .contents_100img {
          width: 100%;
          height: auto;
          display: block;
          margin: 0;
          padding: 0;
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
  );
}

