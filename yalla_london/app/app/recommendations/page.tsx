import { headers } from "next/headers";
import RecommendationsPage from "./recommendations-content";

export default async function RecommendationsServerPage() {
  const headersList = await headers();
  const locale = (headersList.get("x-locale") || "en") as "en" | "ar";

  return <RecommendationsPage serverLocale={locale} />;
}
