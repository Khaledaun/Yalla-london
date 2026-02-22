import { headers } from "next/headers";
import { getDefaultSiteId } from "@/config/sites";
import PrivacyPolicy from "./privacy-content";

export default async function PrivacyPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();

  return <PrivacyPolicy siteId={siteId} />;
}
