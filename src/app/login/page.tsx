import { notFound } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import PageHeader from "@/components/PageHeader";
import { LOGIN_ENABLED } from "@/lib/featureFlags";

// docs/prd/06-infra-deployment-prd.md §2 — 이메일/구글 로그인.
// 카카오 로그인은 Custom Token 백엔드가 필요해 다음 단계로 분리했다.
export const metadata = {
  title: "로그인 · 양평 여행 코스 추천",
};

export default function LoginPage() {
  // 로그인 보류 중 — featureFlags.ts 참조.
  if (!LOGIN_ENABLED) notFound();

  return (
    <div className="mx-auto max-w-sm px-4 pb-6 pt-8">
      <PageHeader
        className="mb-6"
        backHref="/"
        backLabel="처음으로"
        title="로그인"
        description="로그인하면 찜한 코스를 여러 기기에서 그대로 볼 수 있어요."
        expression="wink"
      />
      <LoginForm />
    </div>
  );
}
