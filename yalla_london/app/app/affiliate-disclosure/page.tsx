import { headers } from "next/headers";
import { getDefaultSiteId, isParentBrandSite } from "@/config/sites";
import { ZenithaLuxuryAffiliateDisclosure } from "@/components/zenitha-luxury/zenitha-luxury-affiliate-disclosure";
import AffiliateDisclosureContent from "./affiliate-disclosure-content";

export default async function AffiliateDisclosurePage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();

  if (isParentBrandSite(siteId)) {
    return <ZenithaLuxuryAffiliateDisclosure />;
  }

  return <AffiliateDisclosureContent />;
}
