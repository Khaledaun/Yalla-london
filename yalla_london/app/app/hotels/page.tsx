import { headers } from "next/headers";
import HotelsPage from "./hotels-content";

export default async function HotelsServerPage() {
  const headersList = await headers();
  const locale = (headersList.get("x-locale") || "en") as "en" | "ar";

  return <HotelsPage serverLocale={locale} />;
}
