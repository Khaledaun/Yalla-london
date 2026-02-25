import { headers } from "next/headers";
import { getDefaultSiteId, isYachtSite } from "@/config/sites";
import AboutYallaLondon from "./about-yalla-london";
import AboutZenithaYachts from "./about-zenitha-yachts";

export default async function AboutPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();

  if (isYachtSite(siteId)) {
    return <AboutZenithaYachts />;
  }

  return <AboutYallaLondon />;
}
