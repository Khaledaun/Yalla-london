import { headers } from "next/headers";
import { getDefaultSiteId, isYachtSite } from "@/config/sites";
import YallaContactPage from "./yalla-contact";
import ZenithaContactPage from "@/components/zenitha/zenitha-contact";

export default async function ContactPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();

  if (isYachtSite(siteId)) {
    return <ZenithaContactPage />;
  }

  return <YallaContactPage />;
}
