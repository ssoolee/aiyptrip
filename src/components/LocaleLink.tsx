"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

// 앱 안을 오가는 링크. href에 지금 언어를 붙여 준다.
//
// next/link를 그대로 쓰면 "/map"이 언어 없는 주소가 되어 영어 화면에서 한국어로
// 튄다. typedRoutes가 꺼져 있어 타입 오류도 안 난다 — 그래서 눈에 안 보이는 실수다.
//
// 클라이언트 컴포넌트로 둔 이유: 같은 컴포넌트가 서버 트리와 클라이언트 트리
// 양쪽에서 쓰인다(PageHeader는 서버 페이지에서도, "use client"인 PetPlacesScreen에서도
// 불린다). next/root-params는 서버에서만 되므로 양쪽을 다 받으려면 이쪽이어야 한다.
//
// 바깥으로 나가는 링크(https://…)에는 쓰지 않는다 — withLang이 그대로 돌려주지만,
// 뜻이 다르니 그런 링크는 평범한 <a>로 둔다.
export default function LocaleLink({ href, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const { href: localize } = useI18n();
  return <Link href={localize(href)} {...rest} />;
}
