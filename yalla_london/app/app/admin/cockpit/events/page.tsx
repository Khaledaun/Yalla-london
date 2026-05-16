"use client";

/**
 * Events Admin — manual triggers for the events catalog.
 *
 * Khaled's iPhone-first cockpit surface for the events page launch
 * shipped in Commit c4690a8. Two buttons drive the work:
 *
 *   • "🔄 Add up to 50 More" — POST /api/admin/events-seed { target: 50, replace: false }
 *     Calls the Ticketmaster → SportsEvents365 seeder additively.
 *   • "♻️ Replace All (Reseed)" — POST { target: 50, replace: true }
 *     Archives prior TM-seeded events, then fetches fresh 50. Destructive,
 *     gated by useConfirm modal (CLAUDE.md rule #239).
 *
 * Lists current published events below the buttons so Khaled can verify
 * the catalog visually after a seed run.
 */

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useConfirm } from "@/components/admin/admin-ui";

type EventRow = {
  id: string;
  title: { en: string; ar: string };
  date: string;
  time: string;
  venue: string;
  category: string;
  price: string;
  image?: string;
  bookingUrl: string;
  affiliateTag?: string | null;
  ticketProvider?: string | null;
  vipAvailable?: boolean;
  soldOut?: boolean;
};

type SeedResult = {
  success: boolean;
  archived?: number;
  created?: number;
  updated?: number;
  failed?: number;
  totalPublished?: number;
  durationMs?: number;
  sample?: Array<{ title: string; date: string; category: string; bookingUrl: string }>;
  errorSamples?: Array<{ title: string; error: string }>;
  error?: string;
};

const CATEGORY_EMOJI: Record<string, string> = {
  Football: "⚽",
  Concerts: "🎤",
  Theatre: "🎭",
  Comedy: "🎙️",
  Family: "👨‍👩‍👧",
  Experience: "✨",
};

export default function EventsAdminPage() {
  const searchParams = useSearchParams();
  const [siteId, setSiteId] = useState(searchParams.get("siteId") || "yalla-london");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [lastSeedResult, setLastSeedResult] = useState<SeedResult | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const { confirm, ConfirmDialog } = useConfirm();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/events?siteId=${encodeURIComponent(siteId)}`);
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const json = await res.json();
      setEvents(Array.isArray(json.events) ? json.events : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  async function runSeed(replace: boolean) {
    if (replace) {
      const ok = await confirm({
        title: "Replace All Events?",
        message: `This archives every existing Ticketmaster-seeded event for ${siteId} and pulls a fresh 50 from Ticketmaster. Used when you want a clean catalog. Continue?`,
        confirmLabel: "Yes, reseed",
        variant: "danger",
      });
      if (!ok) return;
    }

    const key = replace ? "reseed" : "add";
    setBusyKey(key);
    setLastSeedResult(null);

    try {
      const res = await fetch("/api/admin/events-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, target: 50, replace }),
      });
      let json: SeedResult;
      try {
        json = (await res.json()) as SeedResult;
      } catch {
        json = { success: false, error: `HTTP ${res.status} (non-JSON response)` };
      }
      setLastSeedResult(json);

      if (!res.ok || !json.success) {
        const reason = json.error || `HTTP ${res.status}`;
        setToast({ text: `Seed failed: ${reason}`, ok: false });
      } else {
        const summary = `${json.created || 0} new, ${json.updated || 0} updated${
          json.archived ? `, ${json.archived} archived` : ""
        }${json.failed ? `, ${json.failed} failed` : ""}`;
        setToast({ text: `✅ ${summary}`, ok: true });
        // Reload list so the new events show up
        setTimeout(() => loadEvents(), 1500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastSeedResult({ success: false, error: msg });
      setToast({ text: `Seed failed: ${msg}`, ok: false });
    } finally {
      setBusyKey(null);
    }
  }

  async function runDryRun() {
    setBusyKey("dryrun");
    try {
      const res = await fetch(`/api/admin/events-seed?siteId=${encodeURIComponent(siteId)}&target=50&dryRun=true`);
      if (!res.ok) {
        setToast({ text: `Preview failed: HTTP ${res.status}`, ok: false });
        return;
      }
      const json = await res.json();
      const breakdown = Object.entries(json.categoryBreakdown || {})
        .map(([cat, n]) => `${cat}:${n}`)
        .join(" ");
      setToast({
        text: `Preview: ${json.ticketmasterReturned || 0} events from TM, AID ${json.aidPresent ? "✓" : "✗"}. ${breakdown}`,
        ok: true,
      });
    } catch (err) {
      setToast({ text: `Preview failed: ${err instanceof Error ? err.message : String(err)}`, ok: false });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <ConfirmDialog />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link href="/admin/cockpit" className="text-zinc-500 hover:text-zinc-300 text-sm">
              ← Cockpit
            </Link>
            <h1 className="text-lg font-bold">Events</h1>
          </div>
          <button
            onClick={loadEvents}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
          >
            <option value="yalla-london">Yalla London</option>
            <option value="istanbul">Yalla Istanbul</option>
          </select>
          <a
            href={`/events`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300"
          >
            View public /events ↗
          </a>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-3 pb-24">
        {/* Action card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-[10px] uppercase text-zinc-500 mb-2 tracking-wide">
            Seed the catalog from Ticketmaster
          </div>
          <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
            Each event gets a SportsEvents365 affiliate URL by category (football → /football/england/premier-league,
            concerts → /concerts/london, etc). Auto-erases 15min before start time.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => runSeed(false)}
              disabled={busyKey !== null}
              className="flex-1 min-w-[160px] px-3 py-2.5 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-600 text-emerald-50 border border-emerald-600 disabled:opacity-60"
            >
              {busyKey === "add" ? "Adding…" : "🔄 Add up to 50 More"}
            </button>
            <button
              onClick={() => runSeed(true)}
              disabled={busyKey !== null}
              className="flex-1 min-w-[160px] px-3 py-2.5 text-xs font-semibold rounded bg-red-900/70 hover:bg-red-900 text-red-100 border border-red-700/70 disabled:opacity-60"
            >
              {busyKey === "reseed" ? "Reseeding…" : "♻️ Replace All (Reseed 50)"}
            </button>
            <button
              onClick={runDryRun}
              disabled={busyKey !== null}
              className="px-3 py-2.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 disabled:opacity-60"
            >
              {busyKey === "dryrun" ? "Loading…" : "👁 Preview"}
            </button>
          </div>

          {lastSeedResult && (
            <div className="mt-3 space-y-2">
              <div
                className={`rounded p-2 text-[11px] leading-relaxed ${
                  (lastSeedResult.created || 0) + (lastSeedResult.updated || 0) > 0
                    ? "bg-emerald-950/40 border border-emerald-800/50 text-emerald-200"
                    : "bg-red-950/40 border border-red-800/50 text-red-200"
                }`}
              >
                <div className="font-semibold mb-1">Last run:</div>
                Created {lastSeedResult.created || 0} · Updated {lastSeedResult.updated || 0}
                {lastSeedResult.archived ? ` · Archived ${lastSeedResult.archived}` : ""}
                {lastSeedResult.failed ? ` · Failed ${lastSeedResult.failed}` : ""} ·{" "}
                {Math.round((lastSeedResult.durationMs || 0) / 1000)}s
                {lastSeedResult.error && <div className="mt-1 opacity-90">Error: {lastSeedResult.error}</div>}
              </div>

              {/* Per-event error samples — surfaced when failed > 0 so Khaled */}
              {/* can diagnose without checking server logs. */}
              {lastSeedResult.errorSamples && lastSeedResult.errorSamples.length > 0 && (
                <div className="rounded p-2 text-[11px] leading-relaxed bg-amber-950/40 border border-amber-800/50 text-amber-200">
                  <div className="font-semibold mb-1">
                    Why writes failed (first {lastSeedResult.errorSamples.length}):
                  </div>
                  <ul className="space-y-1.5">
                    {lastSeedResult.errorSamples.map((s, i) => (
                      <li key={i} className="leading-snug">
                        <span className="font-medium">{s.title}</span>
                        <span className="block text-amber-300/70 mt-0.5 break-words">→ {s.error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-400">{events.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Live now</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-300">
                {events.filter((e) => e.ticketProvider === "SportsEvents365").length}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">SE365-tagged</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-100">
                {[...new Set(events.map((e) => e.category))].length}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Categories</div>
            </div>
          </div>
          {events.length === 0 && !loading && (
            <div className="mt-3 rounded border border-amber-800/50 bg-amber-950/30 p-2 text-[11px] text-amber-300 leading-relaxed">
              No events in the catalog yet. Tap <span className="font-semibold">🔄 Add up to 50 More</span> above to
              pull fresh events from Ticketmaster.
            </div>
          )}
        </div>

        {/* Events list */}
        {error && (
          <div className="rounded-lg border border-red-800/50 bg-red-950/40 text-red-300 p-3 text-sm">{error}</div>
        )}

        {events.length > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-800 text-[10px] uppercase text-zinc-500">
              Catalog ({events.length})
            </div>
            <ul className="divide-y divide-zinc-800">
              {events.map((ev) => (
                <li key={ev.id} className="px-3 py-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0 mt-0.5">{CATEGORY_EMOJI[ev.category] || "📅"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-100 line-clamp-2">{ev.title.en}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {ev.date} · {ev.time} · {ev.venue}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {ev.category}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800/50">
                          {ev.ticketProvider || "Unknown"}
                        </span>
                        {ev.price && <span className="text-[10px] text-emerald-400 font-medium">{ev.price}</span>}
                      </div>
                    </div>
                    <a
                      href={ev.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 flex-shrink-0"
                    >
                      Link ↗
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-4 right-4 z-50 rounded-lg p-3 text-xs font-medium shadow-xl ${
            toast.ok
              ? "bg-emerald-900 text-emerald-100 border border-emerald-700"
              : "bg-red-900 text-red-100 border border-red-700"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
