"use client";

import { getSiteConfig, getSiteDomain } from "@/config/sites";

export default function EditorialPolicyContent({ siteId }: { siteId: string }) {
  const site = getSiteConfig(siteId);
  const siteName = site?.name || "Zenitha";
  const destination = site?.destination || "luxury travel";
  const domain = site?.domain || "zenitha.luxury";
  const email = `hello@${domain}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Editorial Policy</h1>
      <p className="mb-6 text-sm text-gray-500">
        Last updated: March 2026
      </p>

      <section className="space-y-6 leading-relaxed text-gray-700">
        <div>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Our Commitment</h2>
          <p>
            {siteName} is committed to publishing accurate, trustworthy, and genuinely
            helpful content for travellers exploring {destination}. Every article
            reflects real experience, thorough research, and editorial integrity.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Content Creation Process</h2>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              <strong>Research:</strong> Our writers research each topic using first-hand
              visits, local expert interviews, official sources, and verified user reviews.
              We prioritise original, on-the-ground insight over second-hand summaries.
            </li>
            <li>
              <strong>Writing:</strong> All content is written by named authors with
              demonstrated expertise in {destination} travel. Each author has a public
              profile page with their credentials and social media presence.
            </li>
            <li>
              <strong>Editorial Review:</strong> Every article passes a multi-point quality
              gate before publication, including readability scoring, heading hierarchy
              validation, internal link checks, and factual accuracy review.
            </li>
            <li>
              <strong>Authenticity Verification:</strong> We verify first-hand experience
              signals in every piece — sensory details, insider tips, honest limitations,
              and personal observations. Generic or AI-sounding language is flagged and revised.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Fact-Checking Standards</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Prices, opening hours, and contact details are verified against official
              sources at the time of publication.
            </li>
            <li>
              Claims about awards, ratings, and rankings cite the awarding body and year.
            </li>
            <li>
              Statistical claims include the source and date of the data.
            </li>
            <li>
              When information cannot be independently verified, we note it as
              &ldquo;reported&rdquo; or &ldquo;according to&rdquo; with attribution.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Use of AI Tools</h2>
          <p>
            We use AI tools to assist with research, drafting, and translation.
            However, every piece of content is reviewed, fact-checked, and refined
            by human editors before publication. AI-generated content is never
            published without human oversight. Our editorial team adds personal
            experience, local knowledge, and authenticity signals that AI cannot provide.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Affiliate Links & Monetisation</h2>
          <p>
            {siteName} earns commissions from affiliate links to booking platforms,
            hotels, and experience providers. This is clearly disclosed in our content.
            Affiliate relationships never influence our editorial recommendations —
            we only recommend places and services we genuinely believe deliver value
            to our readers. Our editorial team selects recommendations independently
            of commercial relationships.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Corrections & Updates</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              When we discover an error, we correct it promptly and note the
              correction at the bottom of the article with the date.
            </li>
            <li>
              Articles are reviewed periodically and updated when information
              changes (pricing, hours, availability, closures).
            </li>
            <li>
              If you spot an inaccuracy, please email us at{" "}
              <a href={`mailto:${email}`} className="text-blue-600 underline">
                {email}
              </a>{" "}
              and we will investigate and correct within 48 hours.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Quality Standards</h2>
          <p>Every published article on {siteName} meets these minimum standards:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Minimum 1,000 words for blog articles (150 for news, 300 for information pages)</li>
            <li>Proper heading hierarchy (one H1, multiple H2/H3 sections)</li>
            <li>3 or more internal links to related content</li>
            <li>Named author with public profile</li>
            <li>3 or more first-hand experience signals</li>
            <li>Readability at high-school level or below (Flesch-Kincaid grade ≤ 12)</li>
            <li>Bilingual availability (English and Arabic)</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Editorial Independence</h2>
          <p>
            {siteName} is owned by Zenitha.Luxury LLC. Our editorial decisions are made
            independently of advertising and partnership revenue. Sponsored content,
            when published, is clearly labelled as such and follows the same quality
            standards as all other content.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Contact Us</h2>
          <p>
            Questions about our editorial policy? Contact us at{" "}
            <a href={`mailto:${email}`} className="text-blue-600 underline">
              {email}
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
