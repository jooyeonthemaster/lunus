# 🔍 문제 원인 분석 리포트

**날짜**: 2025-10-27
**상태**: 근본 원인 분석 완료 (코드 수정 안 함)

---

## 📋 발견된 문제들

### 문제 1: AI 이미지 검색 500 에러
- **제품**: "라옴 블루 사무드 가죽 3인 / 4인 소파"
- **브랜드**: 우아미 (Wooami)
- **이미지 URL**: `https://wooamimall.com/web/product/medium/202305/1ffabb1a9c8f086222ecfc7db78f3c3f.jpg`
- **에러**: `/api/search/similar`에서 500 Internal Server Error

### 문제 2: 우아미 제품 상세 페이지 라우팅 실패
- **URL**: `http://localhost:3000/wooami-detail/1349`
- **문제**: "제품을 찾을 수 없습니다" 에러 표시

---

## 🔴 문제 1: AI 이미지 검색 500 에러

### 브라우저 콘솔 로그
```
❤️ 좋아요 클릭! AI 유사도 검색 시작: 라옴 블루 사무드 가죽 3인 / 4인 소파
🖼️ 이미지 URL: https://wooamimall.com/web/product/medium/202305/1ffabb1a9c8f086222ecfc7db78f3c3f.jpg
Failed to load resource: the server responded with a status of 500
🔍 AI 검색 결과: Object
📊 유사 제품 수: undefined
⚠️ AI 검색 실패, 카테고리 기반 추천으로 전환
```

### 원인 분석 과정

#### 1단계: 요청 전송 부분 확인
**파일**: `src/app/page.tsx` (42-57줄)
```typescript
const apiResponse = await fetch('/api/search/similar', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    imageUrl: currentProduct.image
  })
});
```
✅ **요청 전송**: 정상 - JSON으로 imageUrl 전송

#### 2단계: API 라우트 핸들러 확인
**파일**: `src/app/api/search/similar/route.ts` (102-197줄)

**JSON 요청 처리** (111-124줄):
```typescript
if (contentType?.includes('application/json')) {
  const body = await request.json();
  const imageUrl = body.imageUrl;

  if (!imageUrl) {
    return NextResponse.json(
      { success: false, error: 'No imageUrl provided' },
      { status: 400 }
    );
  }

  console.log('🔗 Image URL received:', imageUrl);

  // URL로 직접 벡터화
  const embedding = await vectorizeImage(imageUrl, true);
```
✅ **요청 파싱**: 정상 - JSON에서 imageUrl 추출 성공

**벡터화 호출** (122줄):
```typescript
const embedding = await vectorizeImage(imageUrl, true);
```
- `isUrl: true` 파라미터로 호출
- 외부 URL 처리해야 함

#### 3단계: vectorizeImage 함수 분석
**파일**: `src/app/api/search/similar/route.ts` (44-97줄)

```typescript
async function vectorizeImage(imageInput: string | Buffer, isUrl: boolean = false): Promise<number[] | null> {
  try {
    const client = getReplicateClient();
    let finalInput: string;

    if (isUrl) {
      finalInput = imageInput as string; // ✅ URL 그대로 전달
    } else if (Buffer.isBuffer(imageInput)) {
      const base64 = imageInput.toString('base64');
      finalInput = `data:image/jpeg;base64,${base64}`;
    } else {
      finalInput = imageInput as string;
    }

    const output = await client.run(
      "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
      {
        input: {
          inputs: finalInput // ⚠️ Replicate API 호출
        }
      }
    ) as any;

    // 응답에서 embedding 추출
    let embedding: number[] | null = null;

    if (Array.isArray(output) && output.length > 0) {
      const firstResult = output[0];
      if (firstResult && Array.isArray(firstResult.embedding)) {
        embedding = firstResult.embedding; // ⚠️ 응답 파싱
      }
    }

    return embedding;
  } catch (error: any) {
    console.error('Vectorization error:', error); // ⚠️ 에러 로깅
    throw error;
  }
}
```

### 원인 가설들

#### 가설 1: Replicate API 실패 (가장 유력 ⭐)
**확률**: 70%

**근거**:
1. 우아미 이미지 URL이 외부 URL이라서 CORS나 접근 권한 문제가 있을 수 있음
2. Replicate CLIP 모델이 특정 외부 URL을 가져오지 못할 수 있음
3. `vectorizeImage()` 함수의 API 호출 시점에서 에러 발생

**확인 필요 사항**:
- 서버 콘솔에서 "Vectorization error:" 메시지 확인
- REPLICATE_API_TOKEN이 제대로 설정되어 있는지 확인
- Replicate가 우아미 도메인 URL에 접근 가능한지 테스트
- 이미지 URL이 서버에서 접근 가능한지 확인

**예상 에러 메시지**:
```
Vectorization error: Failed to fetch image from URL
Vectorization error: Invalid image format
Vectorization error: API rate limit exceeded
```

#### 가설 2: 응답 형식 불일치
**확률**: 20%

**근거**:
```typescript
if (Array.isArray(output) && output.length > 0) {
  const firstResult = output[0];
  if (firstResult && Array.isArray(firstResult.embedding)) {
    embedding = firstResult.embedding;
  }
}
```

**문제**: Replicate 응답 형식이 변경되었거나 URL 입력과 base64 입력의 형식이 다를 경우, 이 파싱 로직이 실패할 수 있음.

**결과**: `embedding`이 `null`이 되어서 125줄에서 500 에러 발생:
```typescript
if (!embedding) {
  return NextResponse.json(
    { success: false, error: 'Vectorization failed' },
    { status: 500 } // ⚠️ 사용자가 보는 500 에러
  );
}
```

#### 가설 3: 데이터베이스 쿼리 에러
**확률**: 10%

**근거**:
131-137줄에서 Supabase RPC 호출 실행:
```typescript
const { data: products, error } = await supabase.rpc('match_products_by_image', {
  query_embedding: embedding,
  match_threshold: 0.1,
  match_count: 30
});
```

**문제**: embedding이 잘못된 형식이거나 데이터베이스 함수에 문제가 있으면 실패할 수 있음.

---

## 🔴 문제 2: 우아미 제품 상세 페이지 라우팅 실패

### 근본 원인: 확인 완료 ✅

**불일치 지점**:

#### 라우팅 로직 (src/app/page.tsx:167-169)
```typescript
case "wooami":
  const wooamiId = unified.productUrl?.match(/product_no=(\d+)/)?.[1];
  if (wooamiId) router.push(`/wooami-detail/${wooamiId}`);
  break;
```

**동작 방식**:
1. URL에서 `product_no` 추출: `product_no=1349` → `"1349"` 추출
2. 라우팅: `/wooami-detail/1349`로 이동

#### 상세 페이지 로직 (src/app/wooami-detail/[productId]/page.tsx:22-27)
```typescript
const decodedTitle = decodeURIComponent(productId);

// products.json에서 제품 찾기
const foundProduct = wooamiProductsList.find(
  (p: any) => p.title === decodedTitle
);
```

**동작 방식**:
1. `productId` = `"1349"` 받음 (URL에서 온 product_no)
2. `title === "1349"`인 제품을 찾으려고 시도
3. **실패** - title이 "1349"인 제품은 없음

### 실제 제품 데이터

**`data/우아미/products.json` (935-938줄)**:
```json
{
  "title": "라옴 블루 사무드 가죽 3인 / 4인 소파",
  "price": 580000,
  "productUrl": "https://wooamimall.com/product/detail.html?product_no=1349&cate_no=57&display_group=1",
  "imageUrl": "https://wooamimall.com/web/product/medium/202305/1ffabb1a9c8f086222ecfc7db78f3c3f.jpg",
  ...
}
```

**분석**:
- ✅ 제품 데이터 존재함
- ✅ `product_no`는 `1349`
- ✅ `title`은 `"라옴 블루 사무드 가죽 3인 / 4인 소파"`
- ❌ 라우터는 `1349`를 보내는데, 상세 페이지는 title `"1349"`를 찾으려고 함 → 매칭 안 됨

### 왜 작동하지 않는가

**시나리오**:
1. 사용자가 "라옴 블루 사무드 가죽 3인 / 4인 소파" 제품의 "제품 상세보기" 클릭
2. 라우터가 URL에서 `product_no=1349` 추출
3. 라우터가 `/wooami-detail/1349`로 이동
4. 상세 페이지가 `productId = "1349"` 받음
5. 상세 페이지가 `products.json`에서 `title === "1349"` 검색
6. **매칭 안 됨** → 에러: "제품을 찾을 수 없습니다"

### 해결 방법

**옵션 A: title을 라우트 파라미터로 사용** (현재 상세 페이지 로직 유지)
```typescript
// 라우터에서 title을 인코딩해서 전달
const encodedTitle = encodeURIComponent(unified.title);
router.push(`/wooami-detail/${encodedTitle}`);
```

**옵션 B: product_no를 사용하고 상세 페이지 검색 로직 변경** (권장 ✅)
```typescript
// 상세 페이지에서 title 대신 product_no로 검색
const productNo = productId;
const foundProduct = wooamiProductsList.find(
  (p: any) => {
    const match = p.productUrl?.match(/product_no=(\d+)/);
    return match?.[1] === productNo;
  }
);
```

---

## 📊 영향도 분석

### 문제 1 영향도
- **심각도**: 높음 (HIGH)
- **사용자 영향**: AI 유사도 검색이 완전히 작동 안 함
- **대체 수단**: 카테고리 기반 추천은 작동함
- **발생 빈도**: AI 검색 시 100% 실패

### 문제 2 영향도
- **심각도**: 매우 높음 (CRITICAL)
- **사용자 영향**: 모든 우아미 제품 상세 페이지 접근 불가 (386개 제품)
- **대체 수단**: 없음 - 우아미 제품 상세보기 완전 불가
- **발생 빈도**: 우아미 브랜드 100% 실패
- **범위**: 다른 브랜드도 같은 라우팅 패턴 사용하면 영향받을 수 있음

---

## 🔧 권장 수정 방안

### 문제 1: AI 이미지 검색

**1단계**: 서버 로그에서 실제 에러 확인
```bash
# Next.js 개발 서버 출력에서 확인:
# - "Vectorization error:" 메시지
# - Replicate API 에러
# - 기타 500 에러 상세 내용
```

**2단계**: Replicate API 직접 테스트
```typescript
// vectorizeImage 함수에 임시 로깅 추가
console.log('📸 Replicate API 입력:', finalInput);
console.log('📦 Replicate API 출력:', output);
console.log('✨ 추출된 embedding:', embedding);
```

**3단계**: 원인에 따라 수정
- **Replicate가 URL 접근 실패하면**: URL을 base64로 변환 후 전송
- **응답 형식이 변경되었으면**: 파싱 로직 업데이트
- **API 토큰 없으면**: REPLICATE_API_TOKEN 설정

### 문제 2: 우아미 라우팅

**권장 수정** (옵션 B - product_no 일관되게 사용):

**1. 라우팅은 그대로 유지** (이미 product_no 사용 중)
```typescript
// src/app/page.tsx:167-169 - 변경 불필요
case "wooami":
  const wooamiId = unified.productUrl?.match(/product_no=(\d+)/)?.[1];
  if (wooamiId) router.push(`/wooami-detail/${wooamiId}`);
```

**2. 상세 페이지의 검색 로직만 product_no로 변경**
```typescript
// src/app/wooami-detail/[productId]/page.tsx

// 기존 코드:
const decodedTitle = decodeURIComponent(productId);
const foundProduct = wooamiProductsList.find(
  (p: any) => p.title === decodedTitle
);

// 수정할 코드:
const productNo = productId; // productId가 이미 product_no임
const foundProduct = wooamiProductsList.find((p: any) => {
  const match = p.productUrl?.match(/product_no=(\d+)/);
  return match && match[1] === productNo;
});
```

**이 방식이 더 나은 이유**:
- ✅ `product_no`는 안정적이고 고유함
- ✅ `product_no`가 이미 URL에 있음 (진실의 원천)
- ✅ 한글 인코딩/디코딩 문제 없음
- ✅ URL이 더 짧고 깔끔함
- ❌ title은 변경될 수 있고, 특수문자 있고, 인코딩 필요

---

## 🎯 다음 단계

### 바로 해야 할 일

1. **서버 로그 확인** - 문제 1의 실제 에러 메시지 확인
2. **원인 확정** - 문제 1이 Replicate API 문제인지 응답 형식 문제인지 확인
3. **사용자 승인 받기** - 문제 2 수정 방법에 대한 승인
4. **수정 후 테스트** - 개발 환경에서 먼저 테스트

### 확인이 필요한 명령어

```bash
# 문제 1: 서버 로그 모니터링
npm run dev | grep -E "(Vectorization|error|500)"

# 문제 1: 이미지 URL 접근 가능 여부 테스트
curl -I "https://wooamimall.com/web/product/medium/202305/1ffabb1a9c8f086222ecfc7db78f3c3f.jpg"

# 문제 2: products.json 구조 확인
grep -A 5 "product_no=1349" "data/우아미/products.json"
```

---

## ✅ 분석 완료

**상태**: 근본 원인 분석 완료, 수정 승인 대기 중

**확신도**:
- 문제 2 (라우팅): 100% 확정 ✅
- 문제 1 (AI 검색): 70% 확신 (Replicate API 실패 가능성), 서버 로그로 확인 필요

**코드 수정 안 함** - 사용자 지시대로: "일단 코드 수정하지 말고 철저하게 원인 파악을 해봐"
