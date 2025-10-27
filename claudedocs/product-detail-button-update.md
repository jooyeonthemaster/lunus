# 제품 상세보기 버튼 추가 완료

**수정 일시:** 2025-10-27
**수정 파일:** `src/components/SimilarProductsView.tsx`

---

## ✅ 변경 사항

### Before (기존)
```typescript
{/* Back Button - PC/모바일 공통 */}
<button onClick={onBackToMain} className="...">
  다른 제품 둘러보기
</button>
```

### After (수정)
```typescript
{/* PC 버전 */}
<div className="hidden lg:flex lg:flex-col lg:gap-3">
  <button onClick={() => onProductClick?.(likedProduct)} className="...">
    제품 상세보기  {/* 새로 추가 */}
  </button>
  <button onClick={onBackToMain} className="...">
    다른 제품 둘러보기  {/* 보조 버튼으로 변경 */}
  </button>
</div>

{/* 모바일 버전 */}
<div className="lg:hidden flex flex-col gap-3">
  <button onClick={() => onProductClick?.(likedProduct)} className="...">
    제품 상세보기  {/* 새로 추가 */}
  </button>
  <button onClick={onBackToMain} className="...">
    다른 제품 둘러보기  {/* 보조 버튼으로 변경 */}
  </button>
</div>
```

---

## 🎯 기능 설명

### 1. 주요 버튼: 제품 상세보기
- **위치:** 좋아한 제품 정보 하단
- **스타일:** 검은색 배경 (bg-gray-800)
- **동작:** 클릭 시 해당 제품의 상세 페이지로 이동
- **연결:** `onProductClick(likedProduct)` 호출

### 2. 보조 버튼: 다른 제품 둘러보기
- **위치:** 제품 상세보기 버튼 아래
- **스타일:** 회색 배경 (bg-gray-100)
- **동작:** 홈 화면으로 돌아가기
- **연결:** `onBackToMain()` 호출

---

## 🔄 사용자 플로우

### 기존 플로우:
```
1. 제품 카드 보기
2. "좋아요" 클릭
3. AI 유사도 검색
4. 유사 제품 목록 표시
5. [다른 제품 둘러보기] → 홈 화면으로 돌아가기
```

### 새로운 플로우:
```
1. 제품 카드 보기
2. "좋아요" 클릭
3. AI 유사도 검색
4. 유사 제품 목록 표시
5-A. [제품 상세보기] → 좋아한 제품 상세 페이지
5-B. [다른 제품 둘러보기] → 홈 화면으로 돌아가기
```

---

## 📱 반응형 디자인

### PC 버전 (lg 이상)
```
┌─────────────────────────────┐
│  좋아한 제품 정보             │
│  - 이미지                     │
│  - 제품명                     │
│  - 가격                       │
│                              │
│  ┌─────────────────────┐    │
│  │  제품 상세보기  ⬅️ 주요  │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ 다른 제품 둘러보기    │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

### 모바일 버전
```
┌─────────────────┐
│  좋아한 제품     │
│                 │
│  유사 제품들     │
│                 │
│  ┌───────────┐  │
│  │제품상세보기│  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │다른제품둘러│  │
│  └───────────┘  │
└─────────────────┘
```

---

## 🎨 스타일 세부사항

### 주요 버튼 (제품 상세보기)
```css
className="
  w-full py-4
  bg-gray-800 text-white
  rounded-full font-medium
  hover:bg-gray-900
  transition-colors
"
```

### 보조 버튼 (다른 제품 둘러보기)
```css
className="
  w-full py-4
  bg-gray-100 text-gray-800
  rounded-full font-medium
  hover:bg-gray-200
  transition-colors
"
```

### 버튼 컨테이너
```css
className="
  hidden lg:flex lg:flex-col lg:gap-3  {/* PC */}
  lg:hidden flex flex-col gap-3        {/* 모바일 */}
"
```

---

## 🔗 상세 페이지 라우팅

### 라우팅 로직 (page.tsx의 handleProductClick)
```typescript
handleProductClick(likedProduct) {
  if (product._unified) {
    const unified = product._unified;
    const brand = unified.source;

    switch (brand) {
      case "alloso":
        const allosoId = unified.productUrl?.match(/productCd=([^&]+)/)?.[1];
        if (allosoId) router.push(`/alloso-detail/${allosoId}`);
        break;

      case "flatpoint":
        router.push(`/flatpoint-detail/${encodeURIComponent(unified.title)}`);
        break;

      case "iloom":
        const iloomId = unified.productUrl?.match(/productCd=([^&]+)/)?.[1];
        if (iloomId) router.push(`/iloom-detail/${iloomId}`);
        break;

      case "hanssem":
        const hanssemId = unified.productUrl?.match(/goods\/(\d+)/)?.[1];
        if (hanssemId) router.push(`/hanssem-detail/${hanssemId}`);
        break;

      case "wooami":
        const wooamiId = unified.productUrl?.match(/product_no=(\d+)/)?.[1];
        if (wooamiId) router.push(`/wooami-detail/${wooamiId}`);
        break;

      case "emons":
        router.push(`/emons-detail/${encodeURIComponent(unified.title)}`);
        break;

      case "inart":
        router.push(`/inart-detail/${encodeURIComponent(unified.title)}`);
        break;

      case "jangin":
        router.push(`/jangin-detail/${encodeURIComponent(unified.title)}`);
        break;
    }
  }
}
```

---

## 📊 영향 분석

### 사용성 개선
- ✅ **Before:** 좋아한 제품 상세 확인 불가
- ✅ **After:** 즉시 상세 정보 확인 가능

### UI 계층 구조
- ✅ **주요 액션:** 제품 상세보기 (검은색 강조)
- ✅ **보조 액션:** 다른 제품 둘러보기 (회색 보조)

### 사용자 의도 반영
- ✅ 좋아요를 누른 제품 → 더 알고 싶음 → 상세보기 필요
- ✅ 유사 제품 탐색 → 비교 후 결정 → 상세보기 필요

---

## ✅ 빌드 확인

```bash
✓ Compiled successfully in 12.0s
✓ Linting and checking validity of types
✓ Generating static pages (49/49)
```

---

## 🎯 예상 사용 시나리오

### 시나리오 1: 제품 자세히 보기
```
1. 사용자가 "올리버 메쉬 의자" 좋아요 클릭
2. AI가 유사 제품 20개 추천
3. 사용자가 "올리버 메쉬 의자" 더 자세히 보고 싶음
4. [제품 상세보기] 클릭
5. 일룸 상세 페이지로 이동
   - 제품 상세 이미지
   - 제품 설명
   - 사양
   - 구매 정보
```

### 시나리오 2: 유사 제품 비교
```
1. 사용자가 "패브릭 소파" 좋아요 클릭
2. AI가 유사 소파 20개 추천
3. 추천 목록에서 관심 있는 소파 클릭
4. 해당 소파 상세 페이지 확인
5. 뒤로가기 후 다른 소파도 비교
6. 마음에 드는 소파 찾기
```

### 시나리오 3: 홈으로 돌아가기
```
1. 사용자가 제품 좋아요 후 유사 제품 확인
2. 마음에 드는 제품 없음
3. [다른 제품 둘러보기] 클릭
4. 홈 화면으로 돌아가 새로운 제품 탐색
```

---

## 📝 요약

### 변경 내용
- ✅ "다른 제품 둘러보기" 버튼 → "제품 상세보기" + "다른 제품 둘러보기" 2개 버튼으로 변경
- ✅ 주요 버튼: 제품 상세보기 (검은색 강조)
- ✅ 보조 버튼: 다른 제품 둘러보기 (회색 보조)
- ✅ PC/모바일 모두 동일한 버튼 구조
- ✅ 크롤링한 8개 브랜드 상세 페이지로 자동 연결

### 개선 효과
- 🎯 사용자가 좋아한 제품의 상세 정보를 즉시 확인 가능
- 🎯 유사 제품과 비교 후 원래 제품으로 돌아가기 쉬움
- 🎯 명확한 시각적 계층 구조 (주요/보조 버튼)
- 🎯 사용자 의도에 맞는 자연스러운 플로우

---

**작성자:** Claude Code
**수정 파일:** `src/components/SimilarProductsView.tsx`
**변경 라인:** 69~83 (PC 버튼), 142~156 (모바일 버튼)
