import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "MBTI 성향별·반려동물 동반까지, AI가 영업시간과 동선을 확인해 짜주는 양평 여행 코스";

export const metadata: Metadata = {
  // 상대 경로로 적은 공유 이미지 주소를 절대 주소로 바꿀 때 쓴다 — 없으면 빌드가 막힌다.
  metadataBase: new URL("https://aiyptrip--aiyptrip.asia-east1.hosted.app"),
  title: "양평 여행 코스 추천",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "양평 여행 코스 추천",
    title: "평안이와 떠나는 양평 한 바퀴",
    description: DESCRIPTION,
  },
  // icons는 적지 않는다 — icon.tsx / apple-icon.tsx 파일 규약이 link 태그를 알아서 넣는다.
};

// themeColor는 metadata에서 빠졌다(Next 14~) — 별도 viewport export로 둔다.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#14181a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 로그인 상태와 찜 동기화는 클라이언트에서만 다룬다 — Provider를 body 안쪽에 둬
            서버 컴포넌트의 정적 부분을 최대한 유지한다. */}
        <AuthProvider>
          <main className="flex-1 pb-16">{children}</main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
