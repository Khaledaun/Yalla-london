import { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDefaultSiteId, getSiteDomain } from "@/config/sites";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const member = await prisma.teamMember.findUnique({ where: { slug } });
  if (!member) return { title: "Author Not Found" };

  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = getSiteDomain(siteId);

  const title = `${member.name_en} — ${member.title_en}`;
  const description = member.bio_en.slice(0, 155);

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/team/${slug}`,
      languages: {
        "en-GB": `${baseUrl}/team/${slug}`,
        "x-default": `${baseUrl}/team/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/team/${slug}`,
      type: "profile",
      ...(member.avatar_url ? { images: [{ url: member.avatar_url }] } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function AuthorPage({ params }: PageProps) {
  const { slug } = await params;
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = getSiteDomain(siteId);

  const member = await prisma.teamMember.findUnique({
    where: { slug },
    include: {
      content_credits: {
        where: { content_type: "blog_post" },
        orderBy: { created_at: "desc" },
        take: 20,
      },
    },
  });

  if (!member) notFound();

  // Fetch published blog posts for this author
  const postIds = member.content_credits.map((c) => c.content_id);
  const posts = postIds.length > 0
    ? await prisma.blogPost.findMany({
        where: { id: { in: postIds }, published: true, deletedAt: null },
        select: { id: true, slug: true, title_en: true, excerpt_en: true, created_at: true, featured_image: true },
        orderBy: { created_at: "desc" },
      })
    : [];

  // Build sameAs links
  const sameAs: string[] = [];
  if (member.linkedin_url) sameAs.push(member.linkedin_url);
  if (member.twitter_url) sameAs.push(member.twitter_url);
  if (member.instagram_url) sameAs.push(member.instagram_url);
  if (member.website_url) sameAs.push(member.website_url);

  // Person JSON-LD
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: member.name_en,
    url: `${baseUrl}/team/${slug}`,
    jobTitle: member.title_en,
    description: member.bio_en.slice(0, 300),
    ...(member.avatar_url ? { image: member.avatar_url } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    worksFor: {
      "@type": "Organization",
      name: "Zenitha.Luxury LLC",
      url: baseUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Author Header */}
        <div className="flex items-start gap-6 mb-8">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.name_en}
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {member.name_en.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{member.name_en}</h1>
            {member.name_ar && (
              <p className="text-lg text-gray-500 mt-1" dir="rtl">{member.name_ar}</p>
            )}
            <p className="text-indigo-600 font-medium mt-1">{member.title_en}</p>
            {/* Social Links */}
            {sameAs.length > 0 && (
              <div className="flex gap-3 mt-3">
                {member.linkedin_url && (
                  <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors">
                    LinkedIn
                  </a>
                )}
                {member.twitter_url && (
                  <a href={member.twitter_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-sky-500 transition-colors">
                    X/Twitter
                  </a>
                )}
                {member.instagram_url && (
                  <a href={member.instagram_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors">
                    Instagram
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">About</h2>
          <p className="text-gray-600 leading-relaxed">{member.bio_en}</p>
          {member.bio_ar && (
            <p className="text-gray-500 leading-relaxed mt-4" dir="rtl">{member.bio_ar}</p>
          )}
        </section>

        {/* Published Articles */}
        {posts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Articles by {member.name_en} ({posts.length})
            </h2>
            <div className="space-y-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="block p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <h3 className="font-medium text-gray-900">{post.title_en}</h3>
                  {post.excerpt_en && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.excerpt_en}</p>
                  )}
                  <time className="text-xs text-gray-400 mt-2 block">
                    {new Date(post.created_at).toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
