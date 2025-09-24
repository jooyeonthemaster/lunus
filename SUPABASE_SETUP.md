# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성
1. https://supabase.com 접속
2. 새 프로젝트 생성
3. Project Settings > API에서 다음 정보 복사:
   - Project URL
   - Anon/public key

## 2. 데이터베이스 테이블 생성
Supabase SQL Editor에서 다음 쿼리 실행:

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  imageUrl TEXT,
  price INTEGER,
  priceText TEXT,
  category TEXT,
  brand TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 3. 패키지 설치
```bash
npm install @supabase/supabase-js
```

## 4. 환경변수 설정
upload-to-supabase.js 파일에서 다음 값을 수정:
- YOUR_SUPABASE_URL → 실제 Project URL
- YOUR_SUPABASE_ANON_KEY → 실제 Anon Key

## 5. 데이터 업로드
```bash
node upload-to-supabase.js
```

## 크롤링된 데이터 요약
- 총 제품 수: 23개
- 브랜드: 일룸
- 카테고리: 침실
- 가격대: 1,090,000원 ~ 1,270,000원

## 주요 제품
1. 일룸 소프토 패브릭 침대 (Q/K)
2. 일룸 토스티 호텔 침대 (Q/K)
3. 일룸 모니스W 3단 수납장
4. 일룸 쿠시노 시리즈 침대들
5. 일룸 다나 모션베드
6. 일룸 미엘 시리즈 가구들