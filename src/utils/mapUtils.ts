// 지도 관련 유틸리티 함수들

/**
 * 위도/경도를 기준으로 미터 단위로 사각형 좌표를 계산하는 함수
 * @param centerLat 중심점 위도
 * @param centerLng 중심점 경도
 * @param widthMeters 가로 크기 (미터)
 * @param heightMeters 세로 크기 (미터)
 * @returns 사각형의 네 꼭짓점 좌표 배열
 */
export function createRectangleFromCenter(
  centerLat: number,
  centerLng: number,
  widthMeters: number,
  heightMeters: number
): { lat: number; lng: number }[] {
  // 위도 1도 ≈ 111,320m (고정값)
  // 경도 1도 ≈ 111,320m × cos(위도) (위도에 따라 변함)
  
  const latDegreeInMeters = 111320;
  const lngDegreeInMeters = 111320 * Math.cos(centerLat * Math.PI / 180);
  
  // 미터를 도 단위로 변환
  const halfWidthDeg = (widthMeters / 2) / lngDegreeInMeters;
  const halfHeightDeg = (heightMeters / 2) / latDegreeInMeters;
  
  // 사각형의 네 꼭짓점 계산 (시계방향)
  return [
    { lat: centerLat + halfHeightDeg, lng: centerLng - halfWidthDeg }, // 왼쪽 위
    { lat: centerLat + halfHeightDeg, lng: centerLng + halfWidthDeg }, // 오른쪽 위
    { lat: centerLat - halfHeightDeg, lng: centerLng + halfWidthDeg }, // 오른쪽 아래
    { lat: centerLat - halfHeightDeg, lng: centerLng - halfWidthDeg }  // 왼쪽 아래
  ];
}

/**
 * 중심점과 반지름으로 원형 좌표를 계산하는 함수
 * @param centerLat 중심점 위도
 * @param centerLng 중심점 경도
 * @param radiusMeters 반지름 (미터)
 * @param points 원을 구성할 점의 개수 (기본 16개)
 * @returns 원의 둘레 좌표 배열
 */
export function createCircleFromCenter(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  points: number = 16
): { lat: number; lng: number }[] {
  const latDegreeInMeters = 111320;
  const lngDegreeInMeters = 111320 * Math.cos(centerLat * Math.PI / 180);
  
  const radiusLatDeg = radiusMeters / latDegreeInMeters;
  const radiusLngDeg = radiusMeters / lngDegreeInMeters;
  
  const coordinates = [];
  for (let i = 0; i < points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const lat = centerLat + radiusLatDeg * Math.cos(angle);
    const lng = centerLng + radiusLngDeg * Math.sin(angle);
    coordinates.push({ lat, lng });
  }
  
  return coordinates;
}

/**
 * 두 지점 간의 거리를 계산하는 함수 (Haversine formula)
 * @param lat1 첫 번째 지점의 위도
 * @param lng1 첫 번째 지점의 경도
 * @param lat2 두 번째 지점의 위도
 * @param lng2 두 번째 지점의 경도
 * @returns 거리 (미터)
 */
export function calculateDistanceInMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * 좌표에서 방향과 거리로 새로운 좌표를 계산하는 함수
 * @param lat 시작점 위도
 * @param lng 시작점 경도
 * @param bearing 방향 (도, 북쪽이 0도)
 * @param distanceMeters 거리 (미터)
 * @returns 새로운 좌표
 */
export function getDestinationPoint(
  lat: number,
  lng: number,
  bearing: number,
  distanceMeters: number
): { lat: number; lng: number } {
  const R = 6371000; // 지구 반지름 (미터)
  const δ = distanceMeters / R; // 각거리
  const φ1 = lat * Math.PI / 180; // 위도를 라디안으로
  const λ1 = lng * Math.PI / 180; // 경도를 라디안으로
  const θ = bearing * Math.PI / 180; // 방향을 라디안으로

  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));

  return {
    lat: φ2 * 180 / Math.PI,
    lng: λ2 * 180 / Math.PI
  };
}

/**
 * 좌표를 중심점 기준으로 회전시키는 함수
 * @param coordinates 회전할 좌표 배열
 * @param centerLat 중심점 위도
 * @param centerLng 중심점 경도
 * @param rotationDegrees 회전 각도 (도 단위)
 * @returns 회전된 좌표 배열
 */
export function rotateCoordinates(
  coordinates: { lat: number; lng: number }[],
  centerLat: number,
  centerLng: number,
  rotationDegrees: number
): { lat: number; lng: number }[] {
  if (rotationDegrees === 0) return coordinates;
  
  const rotationRadians = rotationDegrees * Math.PI / 180;
  const cosAngle = Math.cos(rotationRadians);
  const sinAngle = Math.sin(rotationRadians);
  
  return coordinates.map(coord => {
    // 중심점을 원점으로 이동
    const deltaLat = coord.lat - centerLat;
    const deltaLng = coord.lng - centerLng;
    
    // 회전 변환
    const rotatedLat = deltaLat * cosAngle - deltaLng * sinAngle;
    const rotatedLng = deltaLat * sinAngle + deltaLng * cosAngle;
    
    // 다시 원래 위치로 이동
    return {
      lat: centerLat + rotatedLat,
      lng: centerLng + rotatedLng
    };
  });
}

/**
 * 부스 생성 헬퍼 함수 - 실제 크기와 위치로 부스 생성 (회전 지원)
 * @param centerLat 중심점 위도
 * @param centerLng 중심점 경도
 * @param widthMeters 가로 크기 (미터)
 * @param heightMeters 세로 크기 (미터)
 * @param type 부스 타입 ('rectangle' | 'circle')
 * @param rotationDegrees 회전 각도 (도 단위, 기본값 0)
 * @returns FestivalBooth의 shape 객체
 */
export function createBoothShape(
  centerLat: number,
  centerLng: number,
  widthMeters: number,
  heightMeters: number,
  type: 'rectangle' | 'circle' = 'rectangle',
  rotationDegrees: number = 0
) {
  if (type === 'circle') {
    const radius = Math.max(widthMeters, heightMeters) / 2;
    let coordinates = createCircleFromCenter(centerLat, centerLng, radius);
    
    // 원형도 회전 가능 (시각적 표시를 위해)
    if (rotationDegrees !== 0) {
      coordinates = rotateCoordinates(coordinates, centerLat, centerLng, rotationDegrees);
    }
    
    return {
      type: 'circle' as const,
      coordinates: coordinates,
      radius: radius,
      rotation: rotationDegrees
    };
  } else {
    let coordinates = createRectangleFromCenter(centerLat, centerLng, widthMeters, heightMeters);
    
    // 사각형 회전
    if (rotationDegrees !== 0) {
      coordinates = rotateCoordinates(coordinates, centerLat, centerLng, rotationDegrees);
    }
    
    return {
      type: 'rectangle' as const,
      coordinates: coordinates,
      width: widthMeters,
      height: heightMeters,
      rotation: rotationDegrees
    };
  }
}

// 실제 축제장 좌표 예시들
export const festivalLocations = {
  // 서울 주요 축제장 좌표
  seoul: {
    hangang: { lat: 37.5326, lng: 126.9652, name: "한강공원" },
    yeouido: { lat: 37.5285, lng: 126.9242, name: "여의도공원" },
    seoulforest: { lat: 37.5447, lng: 127.0357, name: "서울숲" },
    namsan: { lat: 37.5507, lng: 126.9910, name: "남산공원" },
    olympic: { lat: 37.5145, lng: 127.1029, name: "올림픽공원" }
  },
  // 대학교 축제장 좌표
  universities: {
    hongik: { lat: 37.5511, lng: 126.9240, name: "홍익대학교" },
    yonsei: { lat: 37.5665, lng: 126.9387, name: "연세대학교" },
    korea: { lat: 37.5893, lng: 127.0322, name: "고려대학교" },
    snu: { lat: 37.4601, lng: 126.9507, name: "서울대학교" }
  }
};
