# Lunus - 일룸 제품 크롤링 & 추천 시스템

취향 기반 가구/인테리어 제품 추천 플랫폼

## 🚀 주요 기능

### 1. 제품 추천 시스템
- 틴더 스타일의 제품 평가 (좋아요/고민돼요/별로에요)
- 평가 기반 유사 제품 추천
- 사진 업로드로 유사 제품 검색

### 2. 일룸 제품 크롤링
- Playwright 기반 동적 웹 크롤링
- 제품명, 이미지, 가격, 제품 링크 수집
- Supabase 자동 저장

## 📦 설치 방법

```bash
# 패키지 설치
npm install

# 환경 변수 설정 (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key # 옵션: 보안 강화용
```

## 🗄️ Supabase 설정

1. [Supabase](https://supabase.com) 프로젝트 생성
2. SQL Editor에서 `supabase_schema.sql` 실행
3. 환경 변수에 API 키 설정

## 🕷️ 크롤링 사용법

### 방법 1: 관리자 페이지
```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 접속
http://localhost:3000/admin/scrape
```

### 방법 2: API 호출
```javascript
// 단일 카테고리 크롤링
GET /api/scrape/iloom?category=침실

// 모든 카테고리 크롤링
POST /api/scrape/iloom
```

### 방법 3: 스크립트 실행
```bash
npm run scrape:iloom
```

## 📂 프로젝트 구조

```
lunus/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── scrape/
│   │   │       └── iloom/     # 크롤링 API
│   │   ├── admin/
│   │   │   └── scrape/        # 크롤링 관리 페이지
│   │   └── page.tsx           # 메인 페이지
│   ├── components/            # React 컴포넌트
│   ├── lib/
│   │   └── supabase.ts       # Supabase 클라이언트
│   └── types/
│       └── product.ts        # 타입 정의
├── scripts/
│   └── scrape-iloom.js       # 크롤링 스크립트
└── supabase_schema.sql       # DB 스키마
```

## 🔑 환경 변수

`.env.local` 파일:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_KEY=eyJxxxxx # 서버 사이드용 (옵션)
```

## 🛠️ 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 서버
npm run start

# 일룸 크롤링
npm run scrape:iloom
```

## 📊 수집 데이터 구조

```typescript
interface Product {
  name: string;          // 제품명
  imageUrl: string;      // 이미지 URL
  price: number;         // 가격 (숫자)
  priceText: string;     // 가격 (텍스트)
  category: string;      // 카테고리
  brand: string;         // 브랜드
  productUrl: string;    // 제품 상세 페이지 URL
}
```

## 🎯 카테고리

- 침실
- 거실  
- 주방
- 서재
- 아이방

## 📝 라이선스

Private Project