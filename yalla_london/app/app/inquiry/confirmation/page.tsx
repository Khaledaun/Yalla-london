export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig } from "@/config/sites";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Zenitha Yachts";

  return {
    title: `Deposit Confirmed | ${siteName}`,
    description: "Your charter deposit has been received. Our team will be in touch within 24 hours.",
    robots: { index: false, follow: false },
  };
}

async function getSessionDetails(sessionId: string) {
  try {
    const { isStripeConfigured, getStripe } = await import("@/lib/billing/stripe");
    if (!isStripeConfigured()) return null;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      referenceNumber: session.metadata?.reference_number || session.id.slice(0, 12),
      amount: session.amount_total ? (session.amount_total / 100).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00",
      currency: (session.currency || "eur").toUpperCase(),
      customerEmail: session.customer_email || session.metadata?.customer_name || "",
      customerName: session.metadata?.customer_name || "",
      yachtName: session.metadata?.yacht_name || "",
      charterDates: session.metadata?.charter_dates || "",
      destination: "",
      paymentStatus: session.payment_status,
    };
  } catch (err) {
    console.error("[confirmation] Failed to retrieve session:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;

  if (!sessionId) {
    redirect("/inquiry");
  }

  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const baseUrl = await getBaseUrl();
  const session = await getSessionDetails(sessionId);

  if (!session || session.paymentStatus !== "paid") {
    return (
      <main className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Pending</h1>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t confirm your payment yet. If you completed the checkout, please allow a few moments and refresh this page.
          </p>
          <a
            href="/inquiry"
            className="inline-block px-6 py-3 bg-[#0A1628] text-white rounded-lg hover:bg-[#0A1628]/90 transition-colors"
          >
            Back to Inquiry
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A1628] py-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Deposit Confirmed</h1>
          <p className="text-[#C8A951] text-lg">Your yacht charter journey begins</p>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
          {/* Gold accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-[#C8A951] via-[#E8D48B] to-[#C8A951]" />

          <div className="p-8">
            <div className="space-y-4">
              <DetailRow label="Reference" value={session.referenceNumber} highlight />
              {session.customerName && (
                <DetailRow label="Name" value={session.customerName} />
              )}
              <DetailRow
                label="Deposit Amount"
                value={`${session.currency} ${session.amount}`}
                highlight
              />
              {session.yachtName && (
                <DetailRow label="Yacht" value={session.yachtName} />
              )}
              {session.charterDates && (
                <DetailRow label="Charter Dates" value={session.charterDates} />
              )}
              {session.customerEmail && (
                <DetailRow label="Confirmation Sent To" value={session.customerEmail} />
              )}
            </div>

            {/* Next Steps */}
            <div className="mt-8 p-6 bg-[#F8F6F1] rounded-xl">
              <h2 className="text-lg font-semibold text-[#0A1628] mb-4">What Happens Next</h2>
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#C8A951] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>A confirmation email has been sent to your inbox with full payment details.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#C8A951] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Our charter specialist will contact you within 24 hours to finalise your itinerary.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#C8A951] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>You&apos;ll receive the formal charter agreement for e-signature within 48 hours.</span>
                </li>
              </ol>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={`${baseUrl}/yachts`}
                className="flex-1 text-center px-6 py-3 bg-[#0A1628] text-white rounded-lg hover:bg-[#0A1628]/90 transition-colors font-medium"
              >
                Browse More Yachts
              </a>
              <a
                href={`${baseUrl}/`}
                className="flex-1 text-center px-6 py-3 border-2 border-[#C8A951] text-[#C8A951] rounded-lg hover:bg-[#C8A951]/10 transition-colors font-medium"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-white/40 text-xs mt-8">
          Reference: {session.referenceNumber} &middot; {siteConfig?.name || "Zenitha Yachts"}
        </p>
      </div>
    </main>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${highlight ? "text-[#0A1628] font-bold" : "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}
