import type { Metadata, Viewport } from "next";
import { Jua, Noto_Sans_KR } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { THEME_INIT_SCRIPT } from "@/components/ThemeToggle";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import "./globals.css";

// welflows.com과 같은 글꼴 조합 — 제목은 둥근 Jua, 본문은 Noto Sans KR.
// subsets는 미리 불러올(preload) 묶음만 고르는 값이라 한글 글리프는 그대로 담긴다
// (node_modules/next/dist/compiled/@next/font/dist/google/find-font-files-in-css.js).
// 한글은 쪽이 많아 preload까지 하면 접속할 때마다 쓰지도 않을 파일을 받는다.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const jua = Jua({
  variable: "--font-jua",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const DESCRIPTION =
  "MBTI 성향별·반려동물 동반까지, AI가 영업시간과 동선을 확인해 짜주는 양평 여행 코스";

export const metadata: Metadata = {
  // 상대 경로로 적은 공유 이미지 주소를 절대 주소로 바꿀 때 쓴다 — 없으면 빌드가 막힌다.
  metadataBase: new URL("https://aiyptrip.web.app"),
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
    { media: "(prefers-color-scheme: light)", color: "#fbf7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a1d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${jua.variable} h-full antialiased`}
      // 아래 스크립트가 data-theme을 붙이므로, 서버가 그린 <html>과 달라도 괜찮다.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* 저장해 둔 화면 밝기를 첫 그림 전에 적용한다 — 없으면 어둡게 쓰는 사람에게
            흰 화면이 한 번 번쩍인다. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* 로그인 상태와 찜 동기화는 클라이언트에서만 다룬다 — Provider를 body 안쪽에 둬
            서버 컴포넌트의 정적 부분을 최대한 유지한다. */}
        <AuthProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          {/* 하단 내비에 가려지는 만큼 푸터 아래를 비워 둔다. */}
          <div className="h-16" aria-hidden />
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
