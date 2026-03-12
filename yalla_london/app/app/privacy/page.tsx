import { headers } from "next/headers";
import { getDefaultSiteId, isParentBrandSite } from "@/config/sites";
import PrivacyPolicy from "./privacy-content";
import { ZenithaLuxuryPrivacy } from "@/components/zenitha-luxury/zenitha-luxury-privacy";

export default async function PrivacyPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();

  if (isParentBrandSite(siteId)) {
    return <ZenithaLuxuryPrivacy />;
  }

  return <PrivacyPolicy siteId={siteId} />;
}
