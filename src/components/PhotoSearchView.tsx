"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import BottomNavigation from "@/components/BottomNavigation";

interface PhotoSearchViewProps {
  onBackToMain: () => void;
  onPhotoSelected: (file: File) => void;
  onMapClick?: () => void;
}

export default function PhotoSearchView({ onBackToMain, onPhotoSelected, onMapClick }: PhotoSearchViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmPhoto = () => {
    if (selectedFile) {
      onPhotoSelected(selectedFile);
    }
  };

  const handleRetakePhoto = () => {
    setPreviewImage(null);
    setSelectedFile(null);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - PC에서는 상단 네비게이션 고려한 여백 */}
      <header className="px-4 lg:px-8 pt-6 lg:pt-24 pb-4 lg:pb-6">
        <div className="text-center mb-6 lg:mb-8">
          <h1 className="text-3xl lg:text-5xl font-normal tracking-[0.15em] mb-2 lg:mb-4">LUNUS</h1>
          <p className="text-gray-600 text-sm lg:text-lg">비슷한 제품을 찾아드려요</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 lg:px-8 pb-20 lg:pb-8">
        <div className="max-w-2xl mx-auto text-center">
          {!previewImage ? (
            <>
              {/* 메인 질문 */}
              <div className="mb-12 lg:mb-16">
                <h2 className="text-2xl lg:text-4xl font-bold mb-6 lg:mb-8 text-gray-800">
                  마음에 드는 가구가 있나요?
                </h2>
                <p className="text-lg lg:text-xl text-gray-600 leading-relaxed">
                  사진을 올리면 유사한<br />
                  제품을 찾아드려요
                </p>
              </div>

              {/* 제품 이미지 플레이스홀더 */}
              <div className="mb-12 lg:mb-16">
                <div className="relative w-64 h-64 lg:w-80 lg:h-80 mx-auto bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
                  {/* 의자 실루엣 또는 플레이스홀더 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 lg:w-40 lg:h-40 bg-gray-300 rounded-full opacity-50"></div>
                  </div>
                  {/* 그라데이션 오버레이 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200/50 to-gray-400/50"></div>
                </div>
              </div>

              {/* 액션 버튼들 */}
              <div className="space-y-4 lg:space-y-6 max-w-sm mx-auto">
                {/* 사진 촬영하기 버튼 */}
                <button
                  onClick={handleCameraCapture}
                  className="w-full py-4 lg:py-5 px-6 bg-white border-2 border-gray-300 rounded-full text-lg lg:text-xl font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm"
                >
                  사진 촬영하기
                </button>

                {/* 사진 올리기 버튼 */}
                <button
                  onClick={handleFileUpload}
                  className="w-full py-4 lg:py-5 px-6 bg-gray-800 rounded-full text-lg lg:text-xl font-medium text-white hover:bg-gray-900 transition-all duration-200 shadow-lg"
                >
                  사진 올리기
                </button>
              </div>
            </>
          ) : (
            <>
              {/* 이미지 미리보기 */}
              <div className="mb-8 lg:mb-12">
                <h2 className="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8 text-gray-800">
                  이 사진으로 검색할까요?
                </h2>
                <div className="relative w-80 h-80 lg:w-96 lg:h-96 mx-auto rounded-2xl overflow-hidden shadow-xl">
                  <Image
                    src={previewImage}
                    alt="선택한 이미지"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 320px, 384px"
                  />
                </div>
              </div>

              {/* 확인/재촬영 버튼들 */}
              <div className="space-y-4 lg:space-y-6 max-w-sm mx-auto">
                {/* 이 사진으로 검색하기 버튼 */}
                <button
                  onClick={handleConfirmPhoto}
                  className="w-full py-4 lg:py-5 px-6 bg-gray-800 rounded-full text-lg lg:text-xl font-medium text-white hover:bg-gray-900 transition-all duration-200 shadow-lg"
                >
                  이 사진으로 검색하기
                </button>

                {/* 다시 선택하기 버튼 */}
                <button
                  onClick={handleRetakePhoto}
                  className="w-full py-4 lg:py-5 px-6 bg-white border-2 border-gray-300 rounded-full text-lg lg:text-xl font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm"
                >
                  다시 선택하기
                </button>
              </div>
            </>
          )}

          {/* 숨겨진 파일 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* 뒤로가기 버튼 */}
          <div className="mt-12 lg:mt-16">
            <button
              onClick={onBackToMain}
              className="text-gray-500 hover:text-gray-700 transition-colors text-sm lg:text-base"
            >
              ← 메인으로 돌아가기
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentView="photo-search"
        onSearchClick={() => {}} // 이미 사진 검색 페이지이므로 빈 함수
        onMapClick={onMapClick}
      />
    </div>
  );
}
