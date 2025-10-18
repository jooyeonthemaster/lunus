"use client";

import { useState } from "react";

// 아이콘 컴포넌트들
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={active ? "#000" : "#9CA3AF"} 
    strokeWidth="2"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

const SearchIcon = ({ active }: { active: boolean }) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={active ? "#000" : "#9CA3AF"} 
    strokeWidth="2"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const MapIcon = ({ active }: { active: boolean }) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={active ? "#000" : "#9CA3AF"} 
    strokeWidth="2"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" x2="9" y1="3" y2="18"/>
    <line x1="15" x2="15" y1="6" y2="21"/>
  </svg>
);

const HeartIcon = ({ active }: { active: boolean }) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill={active ? "#000" : "none"} 
    stroke={active ? "#000" : "#9CA3AF"} 
    strokeWidth="2"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const ShoppingBagIcon = ({ active }: { active: boolean }) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={active ? "#000" : "#9CA3AF"} 
    strokeWidth="2"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" x2="21" y1="6" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

interface TabItem {
  id: string;
  icon: ({ active }: { active: boolean }) => React.JSX.Element;
  label: string;
}

const tabs: TabItem[] = [
  { id: "home", icon: HomeIcon, label: "홈" },
  { id: "search", icon: SearchIcon, label: "검색" },
  { id: "map", icon: MapIcon, label: "지도" },
  { id: "wishlist", icon: HeartIcon, label: "찜" },
  { id: "cart", icon: ShoppingBagIcon, label: "장바구니" },
];

interface BottomNavigationProps {
  onSearchClick?: () => void;
  onMapClick?: () => void;
  onCartClick?: () => void;
  currentView?: "main" | "similar" | "photo-search" | "map" | "all-products" | "product-detail";
}

export default function BottomNavigation({ onSearchClick, onMapClick, onCartClick, currentView }: BottomNavigationProps) {
  // currentView에 따라 activeTab 결정
  const getActiveTab = () => {
    switch (currentView) {
      case "photo-search":
        return "search";
      case "map":
        return "map";
      case "all-products":
        return "cart";
      case "main":
      case "similar":
      case "product-detail":
      default:
        return "home";
    }
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tabId: string) => {
    if (tabId === "search" && onSearchClick) {
      onSearchClick();
    } else if (tabId === "map" && onMapClick) {
      onMapClick();
    } else if (tabId === "cart" && onCartClick) {
      onCartClick();
    }
    // activeTab은 currentView prop에 의해 결정되므로 setActiveTab 제거
  };

  return (
    <>
      {/* 모바일 하단 네비게이션 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16 px-2 relative">
          {tabs.map((tab, index) => {
            const isSearchButton = tab.id === "search";
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  flex items-center justify-center transition-colors relative
                  ${isSearchButton 
                    ? 'flex-1 py-3' 
                    : 'flex-1 py-3'
                  }
                `}
              >
                <tab.icon active={isSearchButton ? true : isActive} />
              </button>
            );
          })}
        </div>
      </div>

      {/* PC 상단 네비게이션 */}
      <div className="hidden lg:block fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-center h-16">
            {/* 로고 */}
            <div className="flex items-center">
              <h1 className="text-xl font-semibold tracking-wide">LUNUS</h1>
            </div>
            
            {/* 네비게이션 메뉴 */}
            <nav className="flex items-center space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon active={activeTab === tab.id} />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
              
              {/* 크롤링 완성 모음 드롭다운 */}
              <div className="relative group">
                <button className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                    <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/>
                    <path d="M12 3v6"/>
                  </svg>
                  <span className="text-sm font-medium">크롤링 모음</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6l4 4 4-4"/>
                  </svg>
                </button>
                
                {/* 드롭다운 메뉴 */}
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-2">
                    <a
                      href="/iloom-products"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className="mr-3">🛋️</span>
                      <span>일룸 (500개)</span>
                    </a>
                    <a
                      href="/flatpoint-products"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className="mr-3">🪑</span>
                      <span>플랫포인트 (270개)</span>
                    </a>
                    <a
                      href="/jangin-products"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className="mr-3">🪵</span>
                      <span>장인가구 (174개)</span>
                    </a>
                    <a
                      href="/hanssem-products"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className="mr-3">🏠</span>
                      <span>한샘 (297개)</span>
                    </a>
                    <a
                      href="/inart-products"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className="mr-3">🌿</span>
                      <span>인아트 (332개)</span>
                    </a>
                    <a
                      href="/emons-products"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className="mr-3">🪑</span>
                      <span>에몬스 (60개)</span>
                    </a>
                    <a
                      href="/enex-products"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className="mr-3">🏠</span>
                      <span>에넥스 (NEW)</span>
                    </a>
                    <a
                      href="/wooami-products"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className="mr-3">🌸</span>
                      <span>우아미 (100개)</span>
                    </a>
                    <a
                      href="/alloso-products"
                      className="flex items-center px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors font-medium"
                    >
                      <span className="mr-3">🛋️</span>
                      <span>알로소 (45개) ✨</span>
                    </a>
                  </div>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
