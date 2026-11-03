import type { Metadata, Viewport } from "next";
import { Jua, Noto_Sans_KR } from "next/font/google";
import { notFound } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { THEME_INIT_SCRIPT } from "@/components/ThemeToggle";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { HTML_LANG, LOCALES, OG_LOCALE, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import "../globals.css";

// welflows.com과 같은 글꼴 조합 — 제목은 둥근 Jua, 본문은 Noto Sans KR.
// subsets는 미리 불러올(preload) 묶음만 고르는 값이라 한글 글리프는 그대로 담긴다
// (node_modules/next/dist/compiled/@next/font/dist/google/find-font-files-in-css.js).
// 한글은 쪽이 많아 preload까지 하면 접속할 때마다 쓰지도 않을 파일을 받는다.
//
// 영어는 두 글꼴 모두 Latin을 담고 있어 글꼴을 더 올리지 않아도 된다. 중국어·일본어를
// 붙일 때는 이야기가 다르다 — Noto Sans KR의 한자는 한국 한자 집합이라 '国'·'駅'조차
// 없고 간체 전용 글자는 0자, Jua는 한자가 349자뿐이다. 그때 Noto Sans SC/JP를 함께
// 올리고 제목 글꼴도 바꿔야 한다.
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

// 언어마다 제목·설명이 다르므로 metadata 대신 generateMetadata를 쓴다
// (한 파일에서 둘을 같이 내보낼 수는 없다).
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : null;
  if (!locale) return {};
  const { site } = getDictionary(locale);

  return {
    // 상대 경로로 적은 공유 이미지 주소를 절대 주소로 바꿀 때 쓴다 — 없으면 빌드가 막힌다.
    metadataBase: new URL("https://aiyptrip.web.app"),
    title: site.title,
    description: site.description,
    // 같은 내용의 다른 언어판을 검색엔진에 알려 준다. x-default는 언어를 못 가릴 때
    // 보낼 곳이라 기본 언어를 적는다.
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
        "x-default": "/ko",
      },
    },
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      siteName: site.title,
      title: site.ogTitle,
      description: site.description,
    },
    // icons는 적지 않는다 — icon.tsx / apple-icon.tsx 파일 규약이 link 태그를 알아서 넣는다.
    // 그 세 파일은 src/app/에 그대로 두었다. 여기(=[lang] 아래)로 일부만 내리면 물려받던
    // <link rel="icon">이 조용히 사라진다.
  };
}

// themeColor는 metadata에서 빠졌다(Next 14~) — 별도 viewport export로 둔다.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a1d" },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  // 모르는 언어(/garbage)는 여기서 404로 보낸다. generateStaticParams를 두지 않아
  // 어떤 값이든 이 레이아웃까지 들어오기 때문이다.
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <html
      lang={HTML_LANG[lang]}
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
        <I18nProvider lang={lang} dict={dict}>
          <AuthProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            {/* 하단 내비에 가려지는 만큼 푸터 아래를 비워 둔다. */}
            <div className="h-16" aria-hidden />
            <BottomNav />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
