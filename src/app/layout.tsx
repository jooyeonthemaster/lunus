import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LUNUS - 취향에 딱 맞는 제품을 찾아드려요",
  description: "당신의 취향에 맞는 가구를 찾아드리는 LUNUS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} font-sans bg-gray-50`}>
        <div className="min-h-screen bg-white relative">
          {children}
        </div>
      </body>
    </html>
  );
}
