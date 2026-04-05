import { headers } from "next/headers";
import ExperiencesPage from "./experiences-content";

export default async function ExperiencesServerPage() {
  const headersList = await headers();
  const locale = (headersList.get("x-locale") || "en") as "en" | "ar";

  return <ExperiencesPage serverLocale={locale} />;
}
