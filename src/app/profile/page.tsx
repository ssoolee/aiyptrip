import { notFound } from "next/navigation";
import ProfileScreen from "@/components/ProfileScreen";
import { LOGIN_ENABLED } from "@/lib/featureFlags";

// docs/prd/06-infra-deployment-prd.md §2~3 — 로그인 상태와 찜 동기화 안내.
export default function ProfilePage() {
  // 로그인 보류 중 — featureFlags.ts 참조.
  if (!LOGIN_ENABLED) notFound();

  return <ProfileScreen />;
}
