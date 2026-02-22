import { headers } from 'next/headers';
import { getDefaultSiteId, isYachtSite } from '@/config/sites';
import { YallaHomepage } from '@/components/home/yalla-homepage';
import { ZenithaHomepage } from '@/components/zenitha/zenitha-homepage';

export default async function Home() {
  const headersList = await headers();
  const siteId = headersList.get('x-site-id') || getDefaultSiteId();
  const locale = (headersList.get('x-locale') || 'en') as 'en' | 'ar';

  if (isYachtSite(siteId)) {
    return <ZenithaHomepage locale={locale} />;
  }

  return <YallaHomepage locale={locale} />;
}
