/**
 * Zenitha Yachts Diagnostics
 *
 * Tests: yacht public APIs, admin APIs, database models, fleet data.
 */

import type { DiagnosticResult } from "../types";

const SECTION = "yachts";

function pass(id: string, name: string, detail: string, explanation: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "pass", detail, explanation };
}
function warn(id: string, name: string, detail: string, explanation: string, diagnosis?: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "warn", detail, explanation, diagnosis };
}
function fail(id: string, name: string, detail: string, explanation: string, diagnosis?: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "fail", detail, explanation, diagnosis };
}

const yachtsSection = async (
  _siteId: string,
  _budgetMs: number,
  _startTime: number,
): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  try {
    const { prisma } = await import("@/lib/db");

    // ── 1. Yacht Table Exists ────────────────────────────────────────
    try {
      const yachtCount = await prisma.yacht.count();
      results.push(pass("table", "Yacht Table", `${yachtCount} yacht(s) in database`, "The Yacht table stores your fleet inventory. Each yacht has specs, pricing, images, and availability data."));

      if (yachtCount === 0) {
        results.push(warn("fleet-empty", "Fleet Inventory", "No yachts in database", "Your fleet is empty. Add yachts via the admin dashboard or sync from a broker feed.", "Navigate to /admin/yachts/new to add your first yacht."));
      } else {
        // Check for published/active yachts
        const activeYachts = await prisma.yacht.count({ where: { status: "active" } });
        if (activeYachts > 0) {
          results.push(pass("fleet-active", "Active Yachts", `${activeYachts} yacht(s) publicly visible`, "Active yachts appear on the public website in search results and destination pages."));
        } else {
          results.push(warn("fleet-active", "Active Yachts", "No active yachts — website shows empty fleet", "Active yachts appear on the public website.", "All yachts may be in draft status. Activate them in /admin/yachts."));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("P2021") || msg.includes("does not exist")) {
        results.push(fail("table", "Yacht Table", "Table missing — run prisma db push", "The Yacht table needs to be created in the database.", "The yacht database schema hasn't been applied yet."));
      } else {
        results.push(fail("table", "Yacht Table", `Error: ${msg}`, "Could not access the Yacht table."));
      }
    }

    // ── 2. Destinations ──────────────────────────────────────────────
    try {
      const destCount = await prisma.yachtDestination.count();
      if (destCount > 0) {
        results.push(pass("destinations", "Yacht Destinations", `${destCount} destination(s) configured`, "Destinations define sailing regions (Mediterranean, Greek Islands, etc.). They organize yachts by location and drive SEO pages."));
      } else {
        results.push(warn("destinations", "Yacht Destinations", "No destinations configured", "Destinations organize yachts by sailing region.", "Add destinations via /admin/yachts/destinations to enable location-based search."));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("P2021") || msg.includes("does not exist")) {
        results.push(warn("destinations", "Yacht Destinations", "Table missing", "The YachtDestination table stores sailing regions."));
      } else {
        results.push(warn("destinations", "Yacht Destinations", `Error: ${msg}`, "Checks yacht destination data."));
      }
    }

    // ── 3. Charter Itineraries ───────────────────────────────────────
    try {
      const itinCount = await prisma.charterItinerary.count();
      if (itinCount > 0) {
        results.push(pass("itineraries", "Charter Itineraries", `${itinCount} itinerary/itineraries available`, "Itineraries are pre-planned sailing routes that help customers plan their charter. They drive SEO pages with structured Trip schema."));
      } else {
        results.push(warn("itineraries", "Charter Itineraries", "No itineraries yet", "Charter itineraries are pre-planned sailing routes.", "Create itineraries at /admin/yachts/itineraries to attract planners."));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("P2021") || msg.includes("does not exist")) {
        results.push(warn("itineraries", "Charter Itineraries", "Table missing", "The CharterItinerary table stores sailing routes."));
      } else {
        results.push(warn("itineraries", "Charter Itineraries", `Error: ${msg}`, "Checks itinerary data."));
      }
    }

    // ── 4. Charter Inquiries ─────────────────────────────────────────
    try {
      const [totalInquiries, newInquiries] = await Promise.all([
        prisma.charterInquiry.count(),
        prisma.charterInquiry.count({ where: { status: "NEW" } }),
      ]);

      if (totalInquiries > 0) {
        results.push(pass("inquiries", "Charter Inquiries", `${totalInquiries} total — ${newInquiries} new`, "Charter inquiries are leads from potential customers. Each inquiry needs to be reviewed and responded to promptly."));
        if (newInquiries > 5) {
          results.push(warn("inquiries-backlog", "Inquiry Backlog", `${newInquiries} unreviewed inquiries`, "New inquiries should be reviewed within 24 hours for best conversion.", "Review and respond to pending inquiries at /admin/yachts/inquiries."));
        }
      } else {
        results.push(pass("inquiries", "Charter Inquiries", "No inquiries yet (normal for new sites)", "Charter inquiries track customer interest. They'll appear once the site starts receiving traffic."));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("P2021") || msg.includes("does not exist")) {
        results.push(warn("inquiries", "Charter Inquiries", "Table missing", "The CharterInquiry table stores customer leads."));
      } else {
        results.push(warn("inquiries", "Charter Inquiries", `Error: ${msg}`, "Checks inquiry data."));
      }
    }

    // ── 5. Broker Partners ───────────────────────────────────────────
    try {
      const brokerCount = await prisma.brokerPartner.count();
      if (brokerCount > 0) {
        results.push(pass("brokers", "Broker Partners", `${brokerCount} broker(s) configured`, "Broker partners supply yacht inventory and handle bookings. More brokers = larger fleet variety for customers."));
      } else {
        results.push(warn("brokers", "Broker Partners", "No broker partners", "Broker partners supply yacht inventory.", "Add broker partners at /admin/yachts/brokers for referral commissions."));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("P2021") || msg.includes("does not exist")) {
        results.push(warn("brokers", "Broker Partners", "Table missing", "The BrokerPartner table stores charter broker relationships."));
      } else {
        results.push(warn("brokers", "Broker Partners", `Error: ${msg}`, "Checks broker data."));
      }
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push(fail("yacht-db", "Yacht Database", `Error: ${msg}`, "Yacht diagnostics require database access for fleet data."));
  }

  return results;
};

export default yachtsSection;
