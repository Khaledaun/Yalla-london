import { headers } from "next/headers";
import { getDefaultSiteId, isParentBrandSite } from "@/config/sites";
import TermsOfUse from "./terms-content";
import { ZenithaLuxuryTerms } from "@/components/zenitha-luxury/zenitha-luxury-terms";

export default async function TermsPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();

  if (isParentBrandSite(siteId)) {
    return <ZenithaLuxuryTerms />;
  }

  return <TermsOfUse siteId={siteId} />;
}
