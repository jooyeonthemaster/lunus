import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const isMobile = searchParams.get('mobile') === 'true';

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // 모바일/데스크톱에 따라 다른 User-Agent 사용
    const userAgent = isMobile 
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

    // 대상 URL에서 HTML을 가져옵니다
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let html = await response.text();
    
    // 상대 경로를 절대 경로로 변환
    const baseUrl = new URL(url).origin;
    
    // CSS, JS, 이미지 등의 상대 경로를 절대 경로로 변환
    html = html.replace(/href="\/([^"]*?)"/g, `href="${baseUrl}/$1"`);
    html = html.replace(/src="\/([^"]*?)"/g, `src="${baseUrl}/$1"`);
    html = html.replace(/url\(\/([^)]*?)\)/g, `url(${baseUrl}/$1)`);
    
    // 링크들이 새 창에서 열리도록 수정
    html = html.replace(/<a /g, '<a target="_blank" ');
    
    // 모바일 최적화 및 보안 관련 스크립트 추가
    const mobileOptimization = isMobile ? `
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body { 
          font-size: 14px !important; 
          line-height: 1.4 !important;
          -webkit-text-size-adjust: 100% !important;
        }
        * { 
          max-width: 100% !important; 
          box-sizing: border-box !important;
        }
        img { 
          max-width: 100% !important; 
          height: auto !important; 
        }
        table { 
          width: 100% !important; 
          font-size: 12px !important;
        }
        .container, .wrap, .wrapper { 
          max-width: 100% !important; 
          padding: 10px !important;
        }
      </style>
    ` : '';

    const injectedScript = `
      <script>
        // X-Frame-Options 우회를 위한 스크립트
        if (window.self !== window.top) {
          // iframe 내부에서 실행 중
          document.addEventListener('DOMContentLoaded', function() {
            // 모든 링크를 새 창에서 열도록 설정
            const links = document.querySelectorAll('a');
            links.forEach(link => {
              link.setAttribute('target', '_blank');
            });
            
            ${isMobile ? `
            // 모바일 최적화 추가 스크립트
            const style = document.createElement('style');
            style.textContent = \`
              .pc-only, .desktop-only { display: none !important; }
              .mobile-hidden { display: none !important; }
              body { overflow-x: hidden !important; }
            \`;
            document.head.appendChild(style);
            ` : ''}
          });
        }
      </script>
    `;
    
    // head 태그에 모바일 최적화와 스크립트 추가
    if (html.includes('</head>')) {
      html = html.replace('</head>', mobileOptimization + injectedScript + '</head>');
    } else {
      // head 태그가 없는 경우 body 시작 부분에 추가
      html = html.replace('<body', mobileOptimization + injectedScript + '<body');
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL', // iframe 허용
        'Content-Security-Policy': 'frame-ancestors *', // 모든 도메인에서 iframe 허용
      },
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch the requested URL' }, 
      { status: 500 }
    );
  }
}
