import { headers } from "next/headers";
import { getDefaultSiteId } from "@/config/sites";
import YallaContactPage from "./yalla-contact";
import ZenithaContactPage from "@/components/zenitha/zenitha-contact";

export default async function ContactPage() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();

  if (siteId === "zenitha-yachts-med") {
    return <ZenithaContactPage />;
  }

  return <YallaContactPage />;
}
