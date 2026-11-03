import CourseLoadingScreen from "@/components/CourseLoadingScreen";
import { serverDictionary } from "@/lib/i18n/server";

export default async function Loading() {
  const { loading } = await serverDictionary();

  return (
    <CourseLoadingScreen
      title={loading.preset}
      description={loading.presetBody}
    />
  );
}
