import { headers } from "next/headers";
import { getDefaultSiteId, isYachtSite, isParentBrandSite } from "@/config/sites";
import AboutYallaLondon from "./about-yalla-london";
import AboutZenithaYachts from "./about-zenitha-yachts";
import { ZenithaLuxuryAbout } from "@/components/zenitha-luxury/zenitha-luxury-about";

export default async function AboutPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const locale = (headersList.get("x-locale") || "en") as "en" | "ar";

  if (isParentBrandSite(siteId)) {
    return <ZenithaLuxuryAbout />;
  }

  if (isYachtSite(siteId)) {
    return <AboutZenithaYachts />;
  }

  return <AboutYallaLondon serverLocale={locale} />;
}
