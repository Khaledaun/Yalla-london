import { headers } from "next/headers";
import { getDefaultSiteId } from "@/config/sites";
import TermsOfUse from "./terms-content";

export default async function TermsPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();

  return <TermsOfUse siteId={siteId} />;
}
