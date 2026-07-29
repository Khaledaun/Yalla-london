import { headers } from "next/headers";
import { getDefaultSiteId } from "@/config/sites";
import EditorialPolicyContent from "./editorial-policy-content";

export default async function EditorialPolicyPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();

  return <EditorialPolicyContent siteId={siteId} />;
}
