"use client";

import { useEffect, useRef, useState } from "react";
import { furnitureStores, getNearbyStores, type FurnitureStore } from "@/data/stores";
import BottomNavigation from "@/components/BottomNavigation";

declare global {
  interface Window {
    kakao: any;
  }
}

interface MapViewProps {
  onBackToMain: () => void;
  onSearchClick?: () => void;
  onCartClick?: () => void;
}

export default function MapView({ onBackToMain, onSearchClick, onCartClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyStores, setNearbyStores] = useState<FurnitureStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<FurnitureStore | null>(null);

  // 카카오 지도 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&autoload=false`;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        initializeMap();
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // 지도 초기화
  const initializeMap = () => {
    if (!mapContainer.current) return;

    // 기본 위치 (서울 시청)
    const defaultLocation = { lat: 37.5665, lng: 126.9780 };
    
    const options = {
      center: new window.kakao.maps.LatLng(defaultLocation.lat, defaultLocation.lng),
      level: 5
    };

    const kakaoMap = new window.kakao.maps.Map(mapContainer.current, options);
    setMap(kakaoMap);

    // 사용자 위치 가져오기
    getCurrentLocation(kakaoMap);
  };

  // 현재 위치 가져오기
  const getCurrentLocation = (kakaoMap: any) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setUserLocation({ lat, lng });
          
          // 지도 중심을 현재 위치로 이동
          const moveLatLng = new window.kakao.maps.LatLng(lat, lng);
          kakaoMap.setCenter(moveLatLng);
          
          // 현재 위치 마커 표시
          const userMarker = new window.kakao.maps.Marker({
            position: moveLatLng,
            map: kakaoMap
          });

          // 근처 가구점 찾기
          const nearby = getNearbyStores(lat, lng, 20);
          setNearbyStores(nearby);
          
          // 가구점 마커들 표시
          displayStoreMarkers(kakaoMap, nearby);
        },
        (error) => {
          console.error("위치 정보를 가져올 수 없습니다:", error);
          // 기본 위치에서 모든 가구점 표시
          setNearbyStores(furnitureStores);
          displayStoreMarkers(kakaoMap, furnitureStores);
        }
      );
    } else {
      // 위치 서비스를 지원하지 않는 경우
      setNearbyStores(furnitureStores);
      displayStoreMarkers(kakaoMap, furnitureStores);
    }
  };

  // 가구점 마커들 표시
  const displayStoreMarkers = (kakaoMap: any, stores: FurnitureStore[]) => {
    stores.forEach((store) => {
      const markerPosition = new window.kakao.maps.LatLng(store.lat, store.lng);
      
      // 커스텀 마커 이미지 (가구점 아이콘)
      const imageSrc = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#1F2937" stroke="white" stroke-width="3"/>
          <path d="M10 24h20v2H10v-2zm0-6h20v4H10v-4zm0-6h20v4H10V12z" fill="white"/>
          <circle cx="32" cy="8" r="6" fill="#EF4444" stroke="white" stroke-width="2"/>
        </svg>
      `);
      
      const imageSize = new window.kakao.maps.Size(40, 40);
      const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize);
      
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        image: markerImage,
        map: kakaoMap
      });

      // InfoWindow 생성
      const infoWindowContent = `
        <div style="padding: 10px; min-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #1F2937;">${store.name}</div>
          <div style="font-size: 12px; color: #6B7280; margin-bottom: 6px;">${store.category}</div>
          <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 8px;">${store.address}</div>
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="color: #F59E0B; margin-right: 4px;">★</span>
            <span style="font-size: 12px; font-weight: 500;">${store.rating}</span>
            <span style="font-size: 11px; color: #9CA3AF; margin-left: 4px;">(${store.reviewCount})</span>
          </div>
          <div style="display: flex; gap: 6px;">
            ${store.placeId ? `
              <button onclick="window.open('https://place.map.kakao.com/${store.placeId}', '_blank')" 
                      style="padding: 4px 8px; background: #1F2937; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer;">
                카카오맵에서 보기
              </button>
            ` : ''}
            ${store.website ? `
              <button onclick="window.open('${store.website}', '_blank')" 
                      style="padding: 4px 8px; background: #EF4444; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer;">
                홈페이지
              </button>
            ` : ''}
          </div>
        </div>
      `;

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: infoWindowContent,
        removable: true
      });

      // 마커 클릭 이벤트 - InfoWindow 표시
      window.kakao.maps.event.addListener(marker, 'click', () => {
        // 다른 InfoWindow들 닫기
        stores.forEach(() => {
          infoWindow.close();
        });
        
        // 현재 InfoWindow 열기
        infoWindow.open(kakaoMap, marker);
        
        // 선택된 가구점도 업데이트 (하단 카드용)
        setSelectedStore(store);
      });

      // 마커 호버 효과
      window.kakao.maps.event.addListener(marker, 'mouseover', () => {
        marker.setZIndex(1000);
      });

      window.kakao.maps.event.addListener(marker, 'mouseout', () => {
        marker.setZIndex(1);
      });
    });
  };

  return (
    <div className="min-h-screen bg-white relative">
      {/* Header */}
      <header className="px-4 lg:px-8 pt-6 lg:pt-24 pb-4 lg:pb-6 bg-white relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-wide">근처 가구점</h1>
            <p className="text-gray-600 text-sm lg:text-base mt-1">
              {nearbyStores.length}개의 가구점을 찾았어요
            </p>
          </div>
          <button
            onClick={onBackToMain}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapContainer}
          className="w-full h-[calc(100vh-200px)] lg:h-[calc(100vh-160px)]"
        />
        
        {/* 현재 위치 버튼 */}
        <button
          onClick={() => getCurrentLocation(map)}
          className="absolute top-4 right-4 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow z-10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
          </svg>
        </button>
      </div>

      {/* 선택된 가구점 정보 */}
      {selectedStore && (
        <div className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl shadow-xl p-4 z-20 lg:bottom-8 lg:left-8 lg:right-8 lg:max-w-md">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-lg">{selectedStore.name}</h3>
              <p className="text-sm text-gray-500">{selectedStore.category}</p>
            </div>
            <button
              onClick={() => setSelectedStore(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {selectedStore.address}
            </div>
            
            <div className="flex items-center text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              {selectedStore.phone}
            </div>
            
            <div className="flex items-center text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              {selectedStore.openHours}
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center mr-2">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill={i < Math.floor(selectedStore.rating) ? "#FCD34D" : "none"}
                    stroke="#FCD34D"
                    strokeWidth="1"
                  >
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                  </svg>
                ))}
              </div>
              <span className="text-sm font-medium">{selectedStore.rating}</span>
              <span className="text-xs text-gray-500 ml-1">({selectedStore.reviewCount})</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mt-3 mb-4">{selectedStore.description}</p>
          
          {/* 액션 버튼들 */}
          <div className="flex gap-2">
            {selectedStore.website && (
              <button
                onClick={() => window.open(selectedStore.website, '_blank')}
                className="flex-1 py-2 px-3 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                홈페이지
              </button>
            )}
            <button
              onClick={() => window.open(`tel:${selectedStore.phone}`, '_self')}
              className="py-2 px-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center justify-center"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentView="map"
        onSearchClick={onSearchClick}
        onCartClick={onCartClick}
      />
    </div>
  );
}
