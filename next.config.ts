import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',  // 모든 외부 이미지 허용
      },
    ],
    unoptimized: true,  // 외부 이미지 최적화 비활성화
  },
};

export default nextConfig;
