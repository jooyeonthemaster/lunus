/**
 * 브랜드별 상세 페이지 URL 생성 유틸리티
 */

type CrawledProduct = {
  title: string | null;
  productUrl: string | null;
  origin?: {
    group: string;
  };
};

/**
 * 브랜드별 상품 ID 추출
 */
export function extractProductId(product: CrawledProduct): string | null {
  const brand = product.origin?.group;
  const productUrl = product.productUrl;
  const title = product.title;

  if (!brand) return null;

  switch (brand) {
    case "알로소":
      // URL: https://www.alloso.co.kr/product/detail?productCd=ACSB0201K1
      if (productUrl) {
        const match = productUrl.match(/productCd=([^&]+)/);
        return match ? match[1] : null;
      }
      return null;

    case "플랫포인트":
      // URL: https://flatpoint.co.kr/product/bay-sofa-leather-2250/6995/...
      // title 기반 인코딩
      return title ? encodeURIComponent(title) : null;

    case "일룸":
      // URL: https://www.iloom.com/product/detail.do?productCd=HCS888
      if (productUrl) {
        const match = productUrl.match(/productCd=([^&]+)/);
        return match ? match[1] : null;
      }
      return null;

    case "한샘":
      // URL: https://store.hanssem.com/goods/1099086
      if (productUrl) {
        const match = productUrl.match(/goods\/(\d+)/);
        return match ? match[1] : null;
      }
      return null;

    case "우아미":
      // URL: https://wooamimall.com/product/detail.html?product_no=1847
      if (productUrl) {
        const match = productUrl.match(/product_no=(\d+)/);
        return match ? match[1] : null;
      }
      return null;

    case "에몬스":
      // title 기반
      return title ? encodeURIComponent(title) : null;

    case "인아트":
      // title 기반
      return title ? encodeURIComponent(title) : null;

    case "장인가구":
      // title 기반
      return title ? encodeURIComponent(title) : null;

    case "에넥스":
      // URL에서 ID 추출 또는 title 기반
      if (productUrl) {
        const match = productUrl.match(/product_no=(\d+)/);
        if (match) return match[1];
      }
      return title ? encodeURIComponent(title) : null;

    default:
      return null;
  }
}

/**
 * 브랜드별 상세 페이지 URL 생성
 */
export function getBrandDetailUrl(product: CrawledProduct): string | null {
  const brand = product.origin?.group;
  const productId = extractProductId(product);

  if (!brand || !productId) return null;

  switch (brand) {
    case "알로소":
      return `/alloso-detail/${productId}`;

    case "플랫포인트":
      return `/flatpoint-detail/${productId}`;

    case "일룸":
      return `/iloom-detail/${productId}`;

    case "한샘":
      return `/hanssem-detail/${productId}`;

    case "우아미":
      return `/wooami-detail/${productId}`;

    case "에몬스":
      return `/emons-detail/${productId}`;

    case "인아트":
      return `/inart-detail/${productId}`;

    case "장인가구":
      return `/jangin-detail/${productId}`;

    case "에넥스":
      return `/enex-detail/${productId}`;

    default:
      return null;
  }
}
