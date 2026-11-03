import LocaleLink from "@/components/LocaleLink";
import { serverDictionary } from "@/lib/i18n/server";
import MascotSpot from "@/components/MascotSpot";

// 어느 경로에도 걸리지 않은 주소와, 코드에서 부른 notFound()가 여기로 온다.
// 루트 레이아웃 안에서 열리므로 하단 내비는 그대로 보인다.
export default async function NotFound() {
  const { notFound } = await serverDictionary();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <MascotSpot expression="wow" size={72} className="mb-4" />
      <h1 className="mb-2 text-xl font-bold">{notFound.title}</h1>
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        {notFound.body}
      </p>
      <LocaleLink
        href="/"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-primary)] px-6 text-sm font-semibold text-[var(--color-on-primary)]"
      >
        {notFound.action}
      </LocaleLink>
    </div>
  );
}
