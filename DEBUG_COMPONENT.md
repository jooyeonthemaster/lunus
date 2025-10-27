# 상세페이지 디버깅 가이드

## 문제 상황
- 서버 로그: `_unified` 데이터 전달 ✅
- 콘솔 로그: `✅ UnifiedProductDetail로 이동` ✅
- **BUT**: 여전히 구형 페이지처럼 보임

## 디버깅 방법

### 1단계: 브라우저 콘솔 확인
제품 클릭 후 브라우저 콘솔(F12)에서:
```
🖱️ 제품 클릭: 도노 엣지 세라믹 식탁세트 4인용(위드의자4 포함)
   _unified 존재: O
   브랜드: 한샘
   ✅ UnifiedProductDetail로 이동
```
이게 나오는지 확인

### 2단계: React DevTools 확인
1. Chrome/Edge에서 React DevTools 설치
2. 제품 상세페이지 열기
3. Components 탭에서 확인:
   - `<UnifiedProductDetail>` 컴포넌트가 렌더링되는가?
   - 아니면 `<ProductDetailView>`가 렌더링되는가?

### 3단계: 컴포넌트에 시각적 표시 추가
`UnifiedProductDetail` 컴포넌트 최상단에 임시로 배너를 추가하여 확인:

```tsx
// UnifiedProductDetail.tsx 최상단
<div style={{
  background: 'lime',
  color: 'black',
  padding: '20px',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center'
}}>
  ✅ 이것은 NEW UnifiedProductDetail입니다!
</div>
```

만약 이 배너가 안 보인다면 → `UnifiedProductDetail`가 렌더링 안 되고 있는 것

### 4단계: 가능한 원인들

#### 원인 A: `_unified` 데이터가 실제로 없음
- 콘솔에는 `O`라고 나오지만, 실제로 `undefined`일 수 있음
- 해결: `console.log('_unified 전체 데이터:', product._unified)` 추가

#### 원인 B: 타입 변환 문제
- `_unified` 객체가 boolean으로 평가될 때 false
- 해결: `console.log('typeof _unified:', typeof product._unified)` 확인

#### 원인 C: 컴포넌트 조건이 다른 곳에서 재정의됨
- `SimilarProductsView`에서 제품 클릭 시 다른 로직 실행
- 해결: `SimilarProductsView` 컴포넌트의 `onProductClick` 확인

#### 원인 D: UnifiedProductDetail이 구형 디자인처럼 생김
- 실제로는 UnifiedProductDetail이 렌더링되지만 디자인이 비슷함
- 해결: 위 3단계의 시각적 배너 추가

## 다음 단계

제품 클릭 → F12 콘솔 확인 → 결과 알려주세요:

1. 콘솔에 `✅ UnifiedProductDetail로 이동` 나오나요?
2. `_unified 존재: O` 나오나요?
3. React DevTools에서 어떤 컴포넌트가 렌더링되나요?
