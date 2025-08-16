// 가구점 타입 정의
export interface FurnitureStore {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  category: string;
  lat: number;
  lng: number;
  openHours: string;
  description: string;
  placeId?: string; // 카카오맵 플레이스 ID
  website?: string; // 웹사이트 URL
}

// 서울 지역 가구점 더미 데이터
export const furnitureStores: FurnitureStore[] = [
  {
    id: "store-001",
    name: "이케아 고양점",
    address: "경기도 고양시 덕양구 고양대로 1955",
    phone: "1670-4532",
    rating: 4.2,
    reviewCount: 2847,
    category: "대형 가구점",
    lat: 37.6358,
    lng: 126.8958,
    openHours: "10:00 - 22:00",
    description: "스웨덴 가구 브랜드, 다양한 생활용품과 가구",
    placeId: "26338954",
    website: "https://www.ikea.com/kr/ko/"
  },
  {
    id: "store-002", 
    name: "한샘 강남점",
    address: "서울특별시 강남구 테헤란로 152",
    phone: "02-555-1234",
    rating: 4.5,
    reviewCount: 1523,
    category: "프리미엄 가구점",
    lat: 37.5012,
    lng: 127.0396,
    openHours: "10:30 - 20:00",
    description: "한국 대표 가구 브랜드, 맞춤 가구 전문",
    placeId: "8394782",
    website: "https://www.hanssem.com/"
  },
  {
    id: "store-003",
    name: "리바트 홍대점", 
    address: "서울특별시 마포구 양화로 188",
    phone: "02-333-5678",
    rating: 4.1,
    reviewCount: 892,
    category: "모던 가구점",
    lat: 37.5563,
    lng: 126.9236,
    openHours: "11:00 - 21:00",
    description: "모던하고 세련된 디자인의 가구 전문점",
    placeId: "12345678",
    website: "https://www.livart.co.kr/"
  },
  {
    id: "store-004",
    name: "까사미아 잠실점",
    address: "서울특별시 송파구 올림픽로 240",
    phone: "02-777-9999",
    rating: 4.3,
    reviewCount: 1247,
    category: "디자인 가구점",
    lat: 37.5145,
    lng: 127.1029,
    openHours: "10:00 - 21:30",
    description: "이탈리아 감성의 프리미엄 디자인 가구"
  },
  {
    id: "store-005",
    name: "무인양품 명동점",
    address: "서울특별시 중구 명동길 52",
    phone: "02-123-4567",
    rating: 4.4,
    reviewCount: 1876,
    category: "라이프스타일",
    lat: 37.5636,
    lng: 126.9834,
    openHours: "10:00 - 22:00",
    description: "심플하고 기능적인 일본 라이프스타일 브랜드"
  },
  {
    id: "store-006",
    name: "서울가구 동대문점",
    address: "서울특별시 동대문구 천호대로 413",
    phone: "02-456-7890",
    rating: 3.9,
    reviewCount: 634,
    category: "전통 가구점",
    lat: 37.5744,
    lng: 127.0089,
    openHours: "09:00 - 19:00",
    description: "합리적인 가격의 다양한 가구와 생활용품"
  },
  {
    id: "store-007",
    name: "퍼시스 가구 성수점",
    address: "서울특별시 성동구 뚝섬로 273",
    phone: "02-789-0123",
    rating: 4.0,
    reviewCount: 445,
    category: "오피스 가구점",
    lat: 37.5447,
    lng: 127.0557,
    openHours: "09:30 - 18:30",
    description: "사무용 가구 전문, 인체공학적 의자와 책상"
  },
  {
    id: "store-008",
    name: "현대리바트 용산점",
    address: "서울특별시 용산구 한강대로 405",
    phone: "02-234-5678",
    rating: 4.2,
    reviewCount: 1089,
    category: "종합 가구점",
    lat: 37.5311,
    lng: 126.9658,
    openHours: "10:00 - 20:30",
    description: "현대적이고 실용적인 가구 종합 매장",
    placeId: "17832945",
    website: "https://www.livart.co.kr/"
  },
  {
    id: "store-009",
    name: "자이니치 강남점",
    address: "서울특별시 강남구 논현로 38길 12",
    phone: "02-3445-2100",
    rating: 4.6,
    reviewCount: 892,
    category: "프리미엄 가구점",
    lat: 37.5172,
    lng: 127.0286,
    openHours: "10:30 - 19:30",
    description: "이탈리아 럭셔리 가구 브랜드",
    placeId: "11234567",
    website: "https://www.zanichelli.co.kr/"
  },
  {
    id: "store-010",
    name: "대우가구 이태원점",
    address: "서울특별시 용산구 이태원로 55길 5",
    phone: "02-2203-8800",
    rating: 4.1,
    reviewCount: 1456,
    category: "전통 가구점",
    lat: 37.5048,
    lng: 127.0561,
    openHours: "10:00 - 20:00",
    description: "전통과 모던이 조화로운 가구 전문점",
    placeId: "15678901",
    website: "https://www.daewoo.co.kr/"
  },
  {
    id: "store-011",
    name: "에이스침대 역삼점",
    address: "서울특별시 강남구 역삼로 166",
    phone: "02-538-1004",
    rating: 4.4,
    reviewCount: 723,
    category: "침실가구 전문점",
    lat: 37.4999,
    lng: 127.0374,
    openHours: "10:00 - 21:00",
    description: "침대와 매트리스 전문 브랜드",
    placeId: "23456789",
    website: "https://www.acebed.co.kr/"
  },
  {
    id: "store-012",
    name: "로엠가구 홍대점",
    address: "서울특별시 마포구 연남로 239",
    phone: "02-325-7788",
    rating: 4.0,
    reviewCount: 567,
    category: "유럽풍 가구점",
    lat: 37.5547,
    lng: 126.9224,
    openHours: "11:00 - 21:30",
    description: "유럽 스타일의 우아한 가구들",
    placeId: "34567890",
    website: "https://www.roem.co.kr/"
  }
];

// 현재 위치 기준 거리 계산 함수 (Haversine formula)
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 거리순으로 정렬된 가구점 목록 반환
export function getNearbyStores(userLat: number, userLng: number, maxDistance: number = 20): FurnitureStore[] {
  return furnitureStores
    .map(store => ({
      ...store,
      distance: calculateDistance(userLat, userLng, store.lat, store.lng)
    }))
    .filter(store => store.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);
}
