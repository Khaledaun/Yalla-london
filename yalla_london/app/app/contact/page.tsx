import { headers } from "next/headers";
import { getDefaultSiteId, isYachtSite, isParentBrandSite } from "@/config/sites";
import YallaContactPage from "./yalla-contact";
import ZenithaContactPage from "@/components/zenitha/zenitha-contact";
import { ZenithaLuxuryContact } from "@/components/zenitha-luxury/zenitha-luxury-contact";

export default async function ContactPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const locale = (headersList.get("x-locale") || "en") as "en" | "ar";

  if (isParentBrandSite(siteId)) {
    return <ZenithaLuxuryContact />;
  }

  if (isYachtSite(siteId)) {
    return <ZenithaContactPage siteId={siteId} />;
  }

  return <YallaContactPage serverLocale={locale} />;
}
