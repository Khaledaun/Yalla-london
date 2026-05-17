import { headers } from "next/headers";
import EventsPage from "./events-content";

export default async function EventsServerPage() {
  const headersList = await headers();
  const locale = (headersList.get("x-locale") || "en") as "en" | "ar";

  return <EventsPage serverLocale={locale} />;
}
