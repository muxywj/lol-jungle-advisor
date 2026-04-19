import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "정글 동선 추천 — LoL Jungle Advisor",
  description: "정글 유저를 위한 실시간 인게임 정보 조회 및 동선 추천 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
