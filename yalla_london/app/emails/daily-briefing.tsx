/**
 * Daily Briefing Email — React Email template
 *
 * Sent at 05:00 UTC daily (08:00 IDT / 07:00 IST). Renders the full
 * 19-section briefing payload built by lib/briefing/builder.ts.
 *
 * Email-safe: table layout, inline styles, Unicode block chars for charts
 * (renders reliably across Gmail, Outlook, iOS Mail). No SVG.
 *
 * Spec: docs/briefing/CEO-DAILY-BRIEFING.md
 */

import * as React from "react";
import type { DailyBriefingData, SectionResult } from "@/lib/briefing/types";

// ───────────────────────────────────────────────────────────────────────────
// Brand
// ───────────────────────────────────────────────────────────────────────────

const BRAND = {
  red: "#C8322B",
  gold: "#C49A2A",
  blue: "#3B7EA1",
  green: "#2D5A3D",
  navy: "#1C1917",
  cream: "#FAF8F4",
  text: "#333333",
  lightText: "#666666",
  border: "#E5E5E5",
  white: "#FFFFFF",
  // Severity badges
  critical: "#C8322B",
  high: "#E08D2C",
  medium: "#C49A2A",
  low: "#3B7EA1",
  good: "#2D5A3D",
};

const FONTS = {
  heading: "'Source Serif 4', 'Georgia', 'Times New Roman', serif",
  body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "'SF Mono', Menlo, Monaco, Consolas, 'Courier New', monospace",
};

// ───────────────────────────────────────────────────────────────────────────
// Helpers — ASCII charts + section wrappers
// ───────────────────────────────────────────────────────────────────────────

const BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

function sparkline(values: number[]): string {
  if (values.length === 0) return "(no data)";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return values
    .map((v) => {
      const idx = Math.min(7, Math.max(0, Math.round(((v - min) / range) * 7)));
      return BLOCKS[idx];
    })
    .join("");
}

function bar(value: number, max: number, width = 20): string {
  if (max === 0) return "─".repeat(width);
  const filled = Math.min(width, Math.max(0, Math.round((value / max) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function fmtNum(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function fmtSign(n: number, suffix = ""): string {
  if (n > 0) return `+${fmtNum(n)}${suffix}`;
  return `${fmtNum(n)}${suffix}`;
}

function severityBadge(sev: string): React.CSSProperties {
  const map: Record<string, string> = {
    critical: BRAND.critical,
    high: BRAND.high,
    medium: BRAND.medium,
    low: BRAND.low,
    info: BRAND.lightText,
  };
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "4px",
    backgroundColor: map[sev] || BRAND.lightText,
    color: BRAND.white,
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };
}

function gradeColor(grade: string): string {
  return grade === "A"
    ? BRAND.good
    : grade === "B"
      ? BRAND.blue
      : grade === "C"
        ? BRAND.medium
        : grade === "D"
          ? BRAND.high
          : grade === "F"
            ? BRAND.critical
            : BRAND.lightText;
}

// Section heading + render-state wrapper. Failed sections show a clean
// "unavailable" stub instead of a stack trace.
function Section<T>(props: {
  num: number;
  title: string;
  result: SectionResult<T>;
  render: (data: T) => React.ReactNode;
}): React.ReactElement {
  // Compute the body in an if/else block — Next.js's strict TypeScript
  // build does NOT narrow discriminated unions through a JSX ternary on
  // a generic, even via a local var. An if statement narrows reliably.
  const r = props.result;
  let body: React.ReactNode;
  if (r.ok) {
    body = props.render(r.data);
  } else {
    body = (
      <p style={{ fontFamily: FONTS.body, fontSize: "13px", color: BRAND.lightText, fontStyle: "italic", margin: 0 }}>
        Unavailable: {r.error}
      </p>
    );
  }
  return (
    <div style={{ marginTop: "32px", marginBottom: "24px" }}>
      <h2
        style={{
          fontFamily: FONTS.heading,
          fontSize: "18px",
          fontWeight: 600,
          color: BRAND.navy,
          margin: "0 0 12px 0",
          paddingBottom: "8px",
          borderBottom: `2px solid ${BRAND.gold}`,
        }}
      >
        §{props.num}. {props.title}
      </h2>
      {body}
    </div>
  );
}

const TBL: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: FONTS.body,
  fontSize: "13px",
};
const TH: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: `2px solid ${BRAND.border}`,
  fontWeight: 600,
  color: BRAND.navy,
  backgroundColor: BRAND.cream,
};
const TD: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: `1px solid ${BRAND.border}`,
  color: BRAND.text,
  verticalAlign: "top",
};

// ───────────────────────────────────────────────────────────────────────────
// Main template
// ───────────────────────────────────────────────────────────────────────────

interface Props {
  briefing: DailyBriefingData;
}

export default function DailyBriefingEmail({ briefing }: Props): React.ReactElement {
  const date = briefing.metadata.briefingDate;
  const sites = briefing.metadata.siteIds;
  const s = briefing.sections;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Website Management Briefing — {date}</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: BRAND.cream,
          fontFamily: FONTS.body,
          color: BRAND.text,
        }}
      >
        <table cellPadding={0} cellSpacing={0} border={0} width="100%" style={{ backgroundColor: BRAND.cream }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "24px 16px" }}>
                <table
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  width="640"
                  style={{ maxWidth: "640px", backgroundColor: BRAND.white, borderRadius: "8px", overflow: "hidden" }}
                >
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td
                        style={{
                          padding: "24px 32px",
                          backgroundColor: BRAND.navy,
                          color: BRAND.white,
                        }}
                      >
                        <p
                          style={{
                            fontFamily: FONTS.body,
                            fontSize: "12px",
                            margin: 0,
                            opacity: 0.7,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          {date} · {sites.length} site(s)
                        </p>
                        <h1
                          style={{
                            fontFamily: FONTS.heading,
                            fontSize: "24px",
                            fontWeight: 600,
                            margin: "4px 0 0 0",
                            color: BRAND.white,
                          }}
                        >
                          Website Management Briefing
                        </h1>
                      </td>
                    </tr>

                    {/* Body */}
                    <tr>
                      <td style={{ padding: "24px 32px" }}>
                        {/* §1 Executive summary */}
                        <Section
                          num={1}
                          title="Executive Summary"
                          result={s.executiveSummary}
                          render={(data) => (
                            <div>
                              <p style={{ margin: "0 0 12px 0", fontSize: "16px" }}>
                                <span
                                  style={{
                                    fontFamily: FONTS.heading,
                                    fontSize: "32px",
                                    fontWeight: 700,
                                    color: gradeColor(data.overallGrade),
                                    marginRight: "12px",
                                  }}
                                >
                                  {data.overallGrade}
                                </span>
                                <span style={{ color: BRAND.lightText }}>{fmtNum(data.overallScore)}/100</span>
                              </p>
                              <p style={{ margin: "0 0 12px 0", fontSize: "14px", lineHeight: 1.5 }}>{data.oneLine}</p>
                              {data.topThreeWins.length > 0 && (
                                <p style={{ margin: "8px 0", fontSize: "13px", color: BRAND.good }}>
                                  ✓ {data.topThreeWins.join(" · ")}
                                </p>
                              )}
                              {data.topThreeAttention.length > 0 && (
                                <p style={{ margin: "8px 0", fontSize: "13px", color: BRAND.critical }}>
                                  ⚠ {data.topThreeAttention.join(" · ")}
                                </p>
                              )}
                            </div>
                          )}
                        />

                        {/* §2 Tests run */}
                        <Section
                          num={2}
                          title="Tests Run (24h)"
                          result={s.testsRun}
                          render={(data) => (
                            <div>
                              <p style={{ margin: "0 0 12px 0", fontSize: "13px" }}>
                                <strong>{fmtNum(data.totalRuns)}</strong> total runs ·{" "}
                                <span style={{ color: BRAND.good }}>{fmtNum(data.passed)} passed</span> ·{" "}
                                <span style={{ color: BRAND.critical }}>{fmtNum(data.failed)} failed</span>
                              </p>
                              {data.byCron.length > 0 && (
                                <table style={TBL} cellPadding={0} cellSpacing={0}>
                                  <thead>
                                    <tr>
                                      <th style={TH}>Cron</th>
                                      <th style={TH}>Runs</th>
                                      <th style={TH}>Failures</th>
                                      <th style={TH}>Last duration</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {data.byCron.slice(0, 10).map((row) => (
                                      <tr key={row.jobName}>
                                        <td style={{ ...TD, fontFamily: FONTS.mono, fontSize: "12px" }}>
                                          {row.jobName}
                                        </td>
                                        <td style={TD}>{fmtNum(row.runs)}</td>
                                        <td style={{ ...TD, color: row.failures > 0 ? BRAND.critical : BRAND.text }}>
                                          {fmtNum(row.failures)}
                                        </td>
                                        <td style={{ ...TD, color: BRAND.lightText }}>
                                          {row.lastDurationMs ? `${(row.lastDurationMs / 1000).toFixed(1)}s` : "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        />

                        {/* §3 Website status */}
                        <Section
                          num={3}
                          title="Website Status"
                          result={s.siteStatus}
                          render={(rows) => (
                            <table style={TBL} cellPadding={0} cellSpacing={0}>
                              <thead>
                                <tr>
                                  <th style={TH}>Site</th>
                                  <th style={TH}>Grade</th>
                                  <th style={TH}>Score</th>
                                  <th style={TH}>Critical</th>
                                  <th style={TH}>High</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((r) => (
                                  <tr key={r.siteId}>
                                    <td style={{ ...TD, fontFamily: FONTS.mono, fontSize: "12px" }}>{r.siteId}</td>
                                    <td
                                      style={{
                                        ...TD,
                                        fontFamily: FONTS.heading,
                                        fontWeight: 700,
                                        color: gradeColor(r.publicAuditGrade),
                                      }}
                                    >
                                      {r.publicAuditGrade}
                                    </td>
                                    <td style={TD}>{fmtNum(r.publicAuditScore)}</td>
                                    <td style={{ ...TD, color: r.criticalIssues > 0 ? BRAND.critical : BRAND.text }}>
                                      {fmtNum(r.criticalIssues)}
                                    </td>
                                    <td style={{ ...TD, color: r.highIssues > 0 ? BRAND.high : BRAND.text }}>
                                      {fmtNum(r.highIssues)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        />

                        {/* §4 GSC update */}
                        <Section
                          num={4}
                          title="GSC Update"
                          result={s.gscUpdate}
                          render={(data) => (
                            <div>
                              {!data.hasData ? (
                                <p style={{ margin: 0, color: BRAND.lightText, fontStyle: "italic" }}>
                                  {data.notes?.join(" ") || "No GSC data."}
                                </p>
                              ) : (
                                <>
                                  <table style={TBL} cellPadding={0} cellSpacing={0}>
                                    <thead>
                                      <tr>
                                        <th style={TH}>Metric</th>
                                        <th style={TH}>Last 7d</th>
                                        <th style={TH}>Prior 7d</th>
                                        <th style={TH}>Δ</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td style={TD}>Clicks</td>
                                        <td style={TD}>{fmtNum(data.last7d.clicks)}</td>
                                        <td style={{ ...TD, color: BRAND.lightText }}>{fmtNum(data.prior7d.clicks)}</td>
                                        <td
                                          style={{ ...TD, color: data.delta.clicks >= 0 ? BRAND.good : BRAND.critical }}
                                        >
                                          {fmtSign(data.delta.clicks)}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style={TD}>Impressions</td>
                                        <td style={TD}>{fmtNum(data.last7d.impressions)}</td>
                                        <td style={{ ...TD, color: BRAND.lightText }}>
                                          {fmtNum(data.prior7d.impressions)}
                                        </td>
                                        <td
                                          style={{
                                            ...TD,
                                            color: data.delta.impressions >= 0 ? BRAND.good : BRAND.critical,
                                          }}
                                        >
                                          {fmtSign(data.delta.impressions)}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style={TD}>CTR</td>
                                        <td style={TD}>{fmtPct(data.last7d.avgCtr)}</td>
                                        <td style={{ ...TD, color: BRAND.lightText }}>{fmtPct(data.prior7d.avgCtr)}</td>
                                        <td
                                          style={{ ...TD, color: data.delta.ctrPp >= 0 ? BRAND.good : BRAND.critical }}
                                        >
                                          {data.delta.ctrPp >= 0 ? "+" : ""}
                                          {data.delta.ctrPp.toFixed(2)}pp
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style={TD}>Avg position</td>
                                        <td style={TD}>{data.last7d.avgPosition.toFixed(1)}</td>
                                        <td style={{ ...TD, color: BRAND.lightText }}>
                                          {data.prior7d.avgPosition.toFixed(1)}
                                        </td>
                                        <td
                                          style={{
                                            ...TD,
                                            color: data.delta.positionPlaces >= 0 ? BRAND.good : BRAND.critical,
                                          }}
                                        >
                                          {data.delta.positionPlaces >= 0 ? "↑" : "↓"}
                                          {Math.abs(data.delta.positionPlaces).toFixed(1)}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <p style={{ marginTop: "12px", fontSize: "12px", color: BRAND.lightText }}>
                                    14d clicks:{" "}
                                    <span style={{ fontFamily: FONTS.mono, fontSize: "16px", color: BRAND.navy }}>
                                      {sparkline(data.trafficSparkline)}
                                    </span>
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                        />

                        {/* §5 GA4 numbers */}
                        <Section
                          num={5}
                          title="GA4 Numbers"
                          result={s.ga4Numbers}
                          render={(data) => (
                            <div>
                              {!data.hasData ? (
                                <p style={{ margin: 0, color: BRAND.lightText, fontStyle: "italic" }}>
                                  {data.briefExplanation}
                                </p>
                              ) : (
                                <>
                                  <p style={{ margin: "0 0 12px 0", fontSize: "13px" }}>
                                    <strong>{fmtNum(data.last7d.sessions)}</strong> sessions ·{" "}
                                    <strong>{fmtNum(data.last7d.users)}</strong> users ·{" "}
                                    <strong>{fmtNum(data.last7d.pageViews)}</strong> page views
                                  </p>
                                  <p
                                    style={{
                                      margin: "0 0 12px 0",
                                      fontSize: "13px",
                                      color: BRAND.text,
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {data.briefExplanation}
                                  </p>
                                  {data.topPages.length > 0 && (
                                    <table style={TBL} cellPadding={0} cellSpacing={0}>
                                      <thead>
                                        <tr>
                                          <th style={TH}>Page</th>
                                          <th style={TH}>Views</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {data.topPages.slice(0, 5).map((p) => (
                                          <tr key={p.path}>
                                            <td style={{ ...TD, fontFamily: FONTS.mono, fontSize: "12px" }}>
                                              {p.path}
                                            </td>
                                            <td style={TD}>{fmtNum(p.views)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        />

                        {/* §6 System logs */}
                        <Section
                          num={6}
                          title="System Logs Deep Audit"
                          result={s.systemLogs}
                          render={(data) => (
                            <div>
                              <p style={{ margin: "0 0 12px 0", fontSize: "13px" }}>
                                {fmtNum(data.totalCronRuns)} runs ·{" "}
                                <span style={{ color: data.failedRuns > 0 ? BRAND.critical : BRAND.good }}>
                                  {fmtNum(data.failedRuns)} failures
                                </span>
                              </p>
                              {data.meaningfulFindings.length > 0 && (
                                <ul
                                  style={{
                                    margin: "0 0 12px 0",
                                    paddingLeft: "20px",
                                    fontSize: "13px",
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {data.meaningfulFindings.map((f, i) => (
                                    <li key={i}>{f}</li>
                                  ))}
                                </ul>
                              )}
                              {data.topFailures.length > 0 && (
                                <table style={TBL} cellPadding={0} cellSpacing={0}>
                                  <thead>
                                    <tr>
                                      <th style={TH}>Cron</th>
                                      <th style={TH}>Failures</th>
                                      <th style={TH}>Last error</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {data.topFailures.slice(0, 5).map((f) => (
                                      <tr key={f.jobName}>
                                        <td style={{ ...TD, fontFamily: FONTS.mono, fontSize: "12px" }}>{f.jobName}</td>
                                        <td style={TD}>
                                          <span style={severityBadge(f.severity)}>
                                            {f.failures}× {f.severity}
                                          </span>
                                        </td>
                                        <td
                                          style={{
                                            ...TD,
                                            fontFamily: FONTS.mono,
                                            fontSize: "11px",
                                            color: BRAND.lightText,
                                          }}
                                        >
                                          {f.lastError.slice(0, 80)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        />

                        {/* §7 EN vs AR comparison */}
                        <Section
                          num={7}
                          title="EN vs AR Comparison"
                          result={s.enArComparison}
                          render={(data) => (
                            <div>
                              <table style={TBL} cellPadding={0} cellSpacing={0}>
                                <thead>
                                  <tr>
                                    <th style={TH}>Metric</th>
                                    <th style={TH}>English</th>
                                    <th style={TH}>Arabic</th>
                                    <th style={TH}>AR/EN ratio</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td style={TD}>Publications</td>
                                    <td style={TD}>{fmtNum(data.publications.en)}</td>
                                    <td style={TD}>{fmtNum(data.publications.ar)}</td>
                                    <td style={{ ...TD, color: BRAND.lightText }}>{fmtPct(data.publications.ratio)}</td>
                                  </tr>
                                  <tr>
                                    <td style={TD}>Clicks (7d)</td>
                                    <td style={TD}>{fmtNum(data.traffic.enClicks)}</td>
                                    <td style={TD}>{fmtNum(data.traffic.arClicks)}</td>
                                    <td style={{ ...TD, color: BRAND.lightText }}>{fmtPct(data.enArTrafficRatio)}</td>
                                  </tr>
                                  <tr>
                                    <td style={TD}>Impressions (7d)</td>
                                    <td style={TD}>{fmtNum(data.traffic.enImpressions)}</td>
                                    <td style={TD}>{fmtNum(data.traffic.arImpressions)}</td>
                                    <td style={{ ...TD, color: BRAND.lightText }}>—</td>
                                  </tr>
                                </tbody>
                              </table>
                              {data.notes.length > 0 && (
                                <ul
                                  style={{
                                    margin: "12px 0 0 0",
                                    paddingLeft: "20px",
                                    fontSize: "13px",
                                    lineHeight: 1.5,
                                    color: BRAND.text,
                                  }}
                                >
                                  {data.notes.map((n, i) => (
                                    <li key={i}>{n}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        />

                        {/* §8 Traffic sources + countries */}
                        <Section
                          num={8}
                          title="Traffic Sources + Countries"
                          result={s.trafficSources}
                          render={(data) => {
                            if (!data.hasData)
                              return (
                                <p style={{ margin: 0, color: BRAND.lightText, fontStyle: "italic" }}>
                                  GA4 not configured.
                                </p>
                              );
                            const maxSrc = Math.max(...data.sources.map((s2) => s2.sessions), 1);
                            const maxCty = Math.max(...data.countries.map((c) => c.sessions), 1);
                            return (
                              <table
                                style={{ width: "100%", borderCollapse: "collapse" }}
                                cellPadding={0}
                                cellSpacing={0}
                              >
                                <tbody>
                                  <tr>
                                    <td style={{ verticalAlign: "top", paddingRight: "12px", width: "50%" }}>
                                      <p
                                        style={{
                                          margin: "0 0 8px 0",
                                          fontSize: "12px",
                                          fontWeight: 600,
                                          color: BRAND.navy,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.05em",
                                        }}
                                      >
                                        Sources
                                      </p>
                                      {data.sources.slice(0, 7).map((src) => (
                                        <p
                                          key={src.source}
                                          style={{ margin: "0 0 4px 0", fontSize: "12px", fontFamily: FONTS.mono }}
                                        >
                                          <span style={{ display: "inline-block", width: "100px", color: BRAND.text }}>
                                            {src.source.slice(0, 18)}
                                          </span>
                                          <span style={{ color: BRAND.gold }}>{bar(src.sessions, maxSrc, 14)}</span>{" "}
                                          <span style={{ color: BRAND.lightText }}>
                                            {fmtNum(src.sessions)} ({fmtPct(src.share)})
                                          </span>
                                        </p>
                                      ))}
                                    </td>
                                    <td style={{ verticalAlign: "top", paddingLeft: "12px", width: "50%" }}>
                                      <p
                                        style={{
                                          margin: "0 0 8px 0",
                                          fontSize: "12px",
                                          fontWeight: 600,
                                          color: BRAND.navy,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.05em",
                                        }}
                                      >
                                        Countries
                                      </p>
                                      {data.countries.slice(0, 7).map((c) => (
                                        <p
                                          key={c.country}
                                          style={{ margin: "0 0 4px 0", fontSize: "12px", fontFamily: FONTS.mono }}
                                        >
                                          <span style={{ display: "inline-block", width: "80px", color: BRAND.text }}>
                                            {c.country.slice(0, 14)}
                                          </span>
                                          <span style={{ color: BRAND.blue }}>{bar(c.sessions, maxCty, 12)}</span>{" "}
                                          <span style={{ color: BRAND.lightText }}>{fmtNum(c.sessions)}</span>
                                        </p>
                                      ))}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            );
                          }}
                        />

                        {/* §9 Affiliate clicks + revenue */}
                        <Section
                          num={9}
                          title="Affiliate Clicks + Revenue"
                          result={s.affiliateClicksRevenue}
                          render={(data) => (
                            <div>
                              <table style={TBL} cellPadding={0} cellSpacing={0}>
                                <thead>
                                  <tr>
                                    <th style={TH}>Window</th>
                                    <th style={TH}>Clicks</th>
                                    <th style={TH}>Conversions</th>
                                    <th style={TH}>Revenue (USD)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td style={TD}>Last 7d</td>
                                    <td style={TD}>{fmtNum(data.last7d.clicks)}</td>
                                    <td style={TD}>{fmtNum(data.last7d.conversions)}</td>
                                    <td style={{ ...TD, fontWeight: 600 }}>${fmtNum(data.last7d.revenueUsd, 2)}</td>
                                  </tr>
                                  <tr>
                                    <td style={TD}>Last 30d</td>
                                    <td style={TD}>{fmtNum(data.last30d.clicks)}</td>
                                    <td style={TD}>{fmtNum(data.last30d.conversions)}</td>
                                    <td style={{ ...TD, fontWeight: 600 }}>${fmtNum(data.last30d.revenueUsd, 2)}</td>
                                  </tr>
                                </tbody>
                              </table>
                              <p style={{ marginTop: "12px", fontSize: "12px", color: BRAND.lightText }}>
                                30d daily revenue:{" "}
                                <span style={{ fontFamily: FONTS.mono, fontSize: "16px", color: BRAND.gold }}>
                                  {sparkline(data.revenueSparkline)}
                                </span>
                              </p>
                            </div>
                          )}
                        />

                        {/* §10 Affiliate health */}
                        <Section
                          num={10}
                          title="Affiliate Health"
                          result={s.affiliateHealth}
                          render={(data) => (
                            <div>
                              <table style={TBL} cellPadding={0} cellSpacing={0}>
                                <tbody>
                                  <tr>
                                    <td style={TD}>Total links</td>
                                    <td style={TD}>{fmtNum(data.totalLinks)}</td>
                                    <td style={TD}>Coverage</td>
                                    <td style={{ ...TD, fontWeight: 600 }}>{data.coveragePct.toFixed(1)}%</td>
                                  </tr>
                                  <tr>
                                    <td style={TD}>Dead links</td>
                                    <td style={{ ...TD, color: data.deadLinks > 0 ? BRAND.critical : BRAND.text }}>
                                      {fmtNum(data.deadLinks)}
                                    </td>
                                    <td style={TD}>Untracked direct URLs</td>
                                    <td
                                      style={{ ...TD, color: data.untrackedDirectUrls > 0 ? BRAND.high : BRAND.text }}
                                    >
                                      {fmtNum(data.untrackedDirectUrls)}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={TD}>Missing FTC disclosure</td>
                                    <td
                                      style={{ ...TD, color: data.missingDisclosure > 0 ? BRAND.critical : BRAND.text }}
                                    >
                                      {fmtNum(data.missingDisclosure)}
                                    </td>
                                    <td style={TD}>Uncovered articles</td>
                                    <td style={{ ...TD, color: data.uncoveredArticles > 0 ? BRAND.high : BRAND.text }}>
                                      {fmtNum(data.uncoveredArticles)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                              {data.topIssues.length > 0 && (
                                <table style={{ ...TBL, marginTop: "12px" }} cellPadding={0} cellSpacing={0}>
                                  <thead>
                                    <tr>
                                      <th style={TH}>Slug</th>
                                      <th style={TH}>Issue</th>
                                      <th style={TH}>Severity</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {data.topIssues.slice(0, 5).map((iss, i) => (
                                      <tr key={i}>
                                        <td style={{ ...TD, fontFamily: FONTS.mono, fontSize: "11px" }}>{iss.slug}</td>
                                        <td style={TD}>{iss.issue}</td>
                                        <td style={TD}>
                                          <span style={severityBadge(iss.severity)}>{iss.severity}</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        />

                        {/* §11 Affiliate comparisons */}
                        <Section
                          num={11}
                          title="Affiliate Comparisons (per partner, 30d)"
                          result={s.affiliateComparisons}
                          render={(data) => {
                            const maxRev = Math.max(...data.byPartner.map((p) => p.revenueUsd), 1);
                            return (
                              <table style={TBL} cellPadding={0} cellSpacing={0}>
                                <thead>
                                  <tr>
                                    <th style={TH}>Partner</th>
                                    <th style={TH}>Clicks</th>
                                    <th style={TH}>Conv.</th>
                                    <th style={TH}>Revenue</th>
                                    <th style={TH}>Content types</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.byPartner.slice(0, 10).map((p) => (
                                    <tr key={p.partner}>
                                      <td style={{ ...TD, fontWeight: 600 }}>{p.partner}</td>
                                      <td style={TD}>{fmtNum(p.clicks)}</td>
                                      <td style={TD}>{fmtNum(p.conversions)}</td>
                                      <td style={TD}>
                                        <span style={{ fontFamily: FONTS.mono, fontSize: "11px", color: BRAND.gold }}>
                                          {bar(p.revenueUsd, maxRev, 8)}
                                        </span>{" "}
                                        ${fmtNum(p.revenueUsd, 2)}
                                      </td>
                                      <td style={{ ...TD, fontSize: "11px", color: BRAND.lightText }}>
                                        {p.contentTypes.join(", ") || "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          }}
                        />

                        {/* §12 Affiliate trends */}
                        <Section
                          num={12}
                          title="Affiliate Trends"
                          result={s.affiliateTrends}
                          render={(data) => (
                            <div>
                              <table style={TBL} cellPadding={0} cellSpacing={0}>
                                <thead>
                                  <tr>
                                    <th style={TH}>Metric</th>
                                    <th style={TH}>Week-over-week</th>
                                    <th style={TH}>7d daily avg</th>
                                    <th style={TH}>30d daily avg</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td style={TD}>Revenue</td>
                                    <td
                                      style={{
                                        ...TD,
                                        color: data.weekOverWeekRevenuePct >= 0 ? BRAND.good : BRAND.critical,
                                      }}
                                    >
                                      {fmtSign(data.weekOverWeekRevenuePct, "%")}
                                    </td>
                                    <td style={TD}>${data.movingAverages.revenue7d.toFixed(2)}</td>
                                    <td style={TD}>${data.movingAverages.revenue30d.toFixed(2)}</td>
                                  </tr>
                                  <tr>
                                    <td style={TD}>Clicks</td>
                                    <td
                                      style={{
                                        ...TD,
                                        color: data.weekOverWeekClicksPct >= 0 ? BRAND.good : BRAND.critical,
                                      }}
                                    >
                                      {fmtSign(data.weekOverWeekClicksPct, "%")}
                                    </td>
                                    <td style={{ ...TD, color: BRAND.lightText }}>—</td>
                                    <td style={{ ...TD, color: BRAND.lightText }}>—</td>
                                  </tr>
                                </tbody>
                              </table>
                              {data.obviousTrends.length > 0 && (
                                <ul
                                  style={{
                                    margin: "12px 0 0 0",
                                    paddingLeft: "20px",
                                    fontSize: "13px",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {data.obviousTrends.map((t, i) => (
                                    <li key={i}>{t}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        />

                        {/* §13 Latest affiliate link updates */}
                        <Section
                          num={13}
                          title="Latest Affiliate Link Updates (24h)"
                          result={s.affiliateLinkUpdates}
                          render={(data) => (
                            <div>
                              <p style={{ margin: "0 0 12px 0", fontSize: "13px" }}>
                                <strong>{fmtNum(data.last24h)}</strong> link updates in last 24h
                              </p>
                              {data.recentlyAdded.length > 0 && (
                                <>
                                  <p
                                    style={{
                                      margin: "8px 0 4px 0",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      color: BRAND.good,
                                    }}
                                  >
                                    Recently updated
                                  </p>
                                  <ul
                                    style={{
                                      margin: 0,
                                      paddingLeft: "20px",
                                      fontSize: "12px",
                                      lineHeight: 1.5,
                                      color: BRAND.text,
                                    }}
                                  >
                                    {data.recentlyAdded.slice(0, 5).map((r, i) => (
                                      <li key={i}>
                                        <strong>{r.partner}</strong> —{" "}
                                        {new Date(r.addedAt).toLocaleTimeString("en-GB", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                              {data.recentlyExpired.length > 0 && (
                                <>
                                  <p
                                    style={{
                                      margin: "12px 0 4px 0",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      color: BRAND.critical,
                                    }}
                                  >
                                    Recently expired / declined
                                  </p>
                                  <ul
                                    style={{
                                      margin: 0,
                                      paddingLeft: "20px",
                                      fontSize: "12px",
                                      lineHeight: 1.5,
                                      color: BRAND.text,
                                    }}
                                  >
                                    {data.recentlyExpired.slice(0, 5).map((r, i) => (
                                      <li key={i}>{r.advertiser}</li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          )}
                        />

                        {/* §14 A/B testing */}
                        <Section
                          num={14}
                          title="A/B Testing"
                          result={s.abTesting}
                          render={(data) => (
                            <div>
                              <p style={{ margin: "0 0 12px 0", fontSize: "13px" }}>
                                <strong>{fmtNum(data.active)}</strong> active ·{" "}
                                <strong>{fmtNum(data.completed)}</strong> concluded
                              </p>
                              {data.recentResults.length === 0 ? (
                                <p style={{ margin: 0, color: BRAND.lightText, fontStyle: "italic", fontSize: "12px" }}>
                                  No A/B tests running. Spin one up via the chrome-bridge /ab-test endpoint.
                                </p>
                              ) : (
                                <table style={TBL} cellPadding={0} cellSpacing={0}>
                                  <thead>
                                    <tr>
                                      <th style={TH}>Test</th>
                                      <th style={TH}>Status</th>
                                      <th style={TH}>Winner</th>
                                      <th style={TH}>Confidence</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {data.recentResults.slice(0, 8).map((r, i) => (
                                      <tr key={i}>
                                        <td style={{ ...TD, fontFamily: FONTS.mono, fontSize: "11px" }}>
                                          {r.name.slice(0, 60)}
                                        </td>
                                        <td style={TD}>
                                          <span
                                            style={severityBadge(
                                              r.status === "active"
                                                ? "info"
                                                : r.status === "concluded"
                                                  ? "low"
                                                  : "medium",
                                            )}
                                          >
                                            {r.status}
                                          </span>
                                        </td>
                                        <td
                                          style={{
                                            ...TD,
                                            fontWeight: 600,
                                            color:
                                              r.winner === "A"
                                                ? BRAND.blue
                                                : r.winner === "B"
                                                  ? BRAND.gold
                                                  : BRAND.lightText,
                                          }}
                                        >
                                          {r.winner || "—"}
                                        </td>
                                        <td style={TD}>
                                          {r.confidence !== null ? `${(r.confidence * 100).toFixed(0)}%` : "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        />

                        {/* §15 Technical issues */}
                        <Section
                          num={15}
                          title="Technical Issues"
                          result={s.technicalIssues}
                          render={(data) => (
                            <div>
                              <p style={{ margin: "0 0 12px 0", fontSize: "13px" }}>
                                <span style={{ color: BRAND.critical }}>{fmtNum(data.criticalCount)} critical</span> ·{" "}
                                <span style={{ color: BRAND.high }}>{fmtNum(data.highCount)} high</span>
                              </p>
                              {Object.keys(data.byCategory).length > 0 && (
                                <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: BRAND.lightText }}>
                                  By category:{" "}
                                  {Object.entries(data.byCategory)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(" · ")}
                                </p>
                              )}
                              {data.topIssues.length > 0 && (
                                <div>
                                  {data.topIssues.slice(0, 8).map((iss, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        padding: "10px 12px",
                                        marginBottom: "8px",
                                        borderLeft: `3px solid ${iss.severity === "critical" ? BRAND.critical : BRAND.high}`,
                                        backgroundColor: BRAND.cream,
                                      }}
                                    >
                                      <p style={{ margin: "0 0 4px 0", fontSize: "12px" }}>
                                        <span style={severityBadge(iss.severity)}>{iss.severity}</span>{" "}
                                        <span
                                          style={{
                                            fontFamily: FONTS.mono,
                                            fontSize: "11px",
                                            color: BRAND.lightText,
                                            marginLeft: "6px",
                                          }}
                                        >
                                          {iss.category}
                                        </span>
                                      </p>
                                      <p style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: 600 }}>
                                        {iss.detail}
                                      </p>
                                      <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: BRAND.lightText }}>
                                        <em>Why:</em> {iss.why}
                                      </p>
                                      <p style={{ margin: 0, fontSize: "12px", color: BRAND.text }}>
                                        <em>Plan:</em> {iss.fixPlan}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        />

                        {/* §16 Fixes applied (24h) */}
                        <Section
                          num={16}
                          title="Fixes Applied (24h)"
                          result={s.fixesApplied}
                          render={(data) => (
                            <div>
                              <p style={{ margin: "0 0 12px 0", fontSize: "13px" }}>
                                <strong>{fmtNum(data.totalFixes)}</strong> fixes ·{" "}
                                <span style={{ color: BRAND.good }}>{fmtNum(data.successCount)} succeeded</span> ·{" "}
                                <span style={{ color: BRAND.critical }}>{fmtNum(data.failureCount)} failed</span>
                              </p>
                              {data.byFixType.length > 0 && (
                                <table style={TBL} cellPadding={0} cellSpacing={0}>
                                  <thead>
                                    <tr>
                                      <th style={TH}>Fix type</th>
                                      <th style={TH}>Count</th>
                                      <th style={TH}>Success rate</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {data.byFixType.slice(0, 10).map((f) => (
                                      <tr key={f.fixType}>
                                        <td style={{ ...TD, fontFamily: FONTS.mono, fontSize: "12px" }}>{f.fixType}</td>
                                        <td style={TD}>{fmtNum(f.count)}</td>
                                        <td
                                          style={{
                                            ...TD,
                                            color:
                                              f.successPct >= 90
                                                ? BRAND.good
                                                : f.successPct >= 60
                                                  ? BRAND.gold
                                                  : BRAND.critical,
                                          }}
                                        >
                                          {f.successPct}%
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        />

                        {/* §17 Validation */}
                        <Section
                          num={17}
                          title="How to Validate the Fixes"
                          result={s.validation}
                          render={(data) => (
                            <div>
                              {data.byFixType.length === 0 ? (
                                <p style={{ margin: 0, color: BRAND.lightText, fontStyle: "italic" }}>
                                  No fixes ran in last 24h — nothing to validate.
                                </p>
                              ) : (
                                data.byFixType.map((v, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      padding: "10px 12px",
                                      marginBottom: "8px",
                                      borderLeft: `3px solid ${BRAND.blue}`,
                                      backgroundColor: BRAND.cream,
                                    }}
                                  >
                                    <p
                                      style={{
                                        margin: "0 0 4px 0",
                                        fontFamily: FONTS.mono,
                                        fontSize: "12px",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {v.fixType}
                                    </p>
                                    <p style={{ margin: "0 0 4px 0", fontSize: "13px" }}>{v.how}</p>
                                    <p style={{ margin: 0, fontSize: "12px", color: BRAND.lightText }}>
                                      <em>When:</em> {v.whenToCheck}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        />

                        {/* §18 KPIs and progress */}
                        <Section
                          num={18}
                          title="KPIs and Progress"
                          result={s.kpisProgress}
                          render={(data) => (
                            <table style={TBL} cellPadding={0} cellSpacing={0}>
                              <thead>
                                <tr>
                                  <th style={TH}>KPI</th>
                                  <th style={TH}>Actual</th>
                                  <th style={TH}>Target 30d</th>
                                  <th style={TH}>Progress</th>
                                  <th style={TH}>Grade</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.kpis.map((k, i) => (
                                  <tr key={i}>
                                    <td style={TD}>{k.name}</td>
                                    <td style={{ ...TD, fontWeight: 600 }}>
                                      {k.actual !== null
                                        ? `${fmtNum(k.actual, k.unit === "ratio" ? 4 : 1)} ${k.unit}`
                                        : "—"}
                                    </td>
                                    <td style={{ ...TD, color: BRAND.lightText }}>
                                      {fmtNum(k.target30d, k.unit === "ratio" ? 4 : 1)} {k.unit}
                                    </td>
                                    <td style={TD}>
                                      {k.progressVs30d !== null ? (
                                        <span
                                          style={{
                                            fontFamily: FONTS.mono,
                                            fontSize: "11px",
                                            color: k.progressVs30d >= 1 ? BRAND.good : BRAND.high,
                                          }}
                                        >
                                          {bar(k.progressVs30d, 1.2, 10)} {(k.progressVs30d * 100).toFixed(0)}%
                                        </span>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                    <td
                                      style={{
                                        ...TD,
                                        fontFamily: FONTS.heading,
                                        fontWeight: 700,
                                        color: gradeColor(k.grade),
                                      }}
                                    >
                                      {k.grade}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        />

                        {/* §19 Per-site deep dive */}
                        <Section
                          num={19}
                          title="Per-Site Deep Dive"
                          result={s.perSiteDeepDive}
                          render={(sites) =>
                            sites.map((site) => (
                              <div
                                key={site.siteId}
                                style={{
                                  padding: "16px",
                                  marginBottom: "16px",
                                  backgroundColor: BRAND.cream,
                                  borderRadius: "6px",
                                  borderLeft: `4px solid ${BRAND.gold}`,
                                }}
                              >
                                <h3
                                  style={{
                                    fontFamily: FONTS.heading,
                                    fontSize: "16px",
                                    fontWeight: 600,
                                    margin: "0 0 8px 0",
                                    color: BRAND.navy,
                                  }}
                                >
                                  {site.siteId}
                                </h3>
                                <p style={{ margin: "0 0 4px 0", fontSize: "13px" }}>
                                  <strong>Niche:</strong> {site.niche}
                                </p>
                                <p style={{ margin: "0 0 4px 0", fontSize: "13px" }}>
                                  <strong>Destination:</strong> {site.destination}
                                </p>
                                <p
                                  style={{ margin: "0 0 12px 0", fontSize: "13px", color: BRAND.text, lineHeight: 1.5 }}
                                >
                                  <strong>Landscape:</strong> {site.businessLandscape}
                                </p>

                                {site.algorithmUpdates.length > 0 && (
                                  <div style={{ marginBottom: "12px" }}>
                                    <p
                                      style={{
                                        margin: "0 0 6px 0",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        color: BRAND.navy,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                      }}
                                    >
                                      SEO/AIO/GEO algorithm updates
                                    </p>
                                    {site.algorithmUpdates.map((a, i) => (
                                      <div
                                        key={i}
                                        style={{
                                          padding: "8px 10px",
                                          marginBottom: "6px",
                                          backgroundColor: BRAND.white,
                                          borderRadius: "4px",
                                          fontSize: "12px",
                                        }}
                                      >
                                        <p style={{ margin: "0 0 2px 0", fontWeight: 600 }}>
                                          {a.source}{" "}
                                          <span style={{ color: BRAND.lightText, fontWeight: 400 }}>· {a.date}</span>
                                        </p>
                                        <p style={{ margin: "0 0 2px 0" }}>
                                          <em>Impact:</em> {a.impact}
                                        </p>
                                        <p style={{ margin: 0, color: BRAND.lightText }}>
                                          <em>Our response:</em> {a.ourResponse}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {site.improvementsProposed.length > 0 && (
                                  <div style={{ marginBottom: "12px" }}>
                                    <p
                                      style={{
                                        margin: "0 0 6px 0",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        color: BRAND.navy,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                      }}
                                    >
                                      Improvements proposed
                                    </p>
                                    {site.improvementsProposed.map((imp, i) => (
                                      <div
                                        key={i}
                                        style={{
                                          padding: "8px 10px",
                                          marginBottom: "6px",
                                          backgroundColor: BRAND.white,
                                          borderRadius: "4px",
                                          fontSize: "12px",
                                        }}
                                      >
                                        <p style={{ margin: "0 0 2px 0", fontWeight: 600 }}>
                                          {imp.title}{" "}
                                          <span style={{ color: BRAND.lightText, fontWeight: 400 }}>
                                            · effort: {imp.effort}
                                          </span>
                                        </p>
                                        <p style={{ margin: "0 0 2px 0", color: BRAND.lightText }}>
                                          {imp.expectedImpact}
                                        </p>
                                        <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px" }}>
                                          {imp.plan.map((p, j) => (
                                            <li key={j}>{p}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {site.sevenDayPlan.length > 0 && (
                                  <div>
                                    <p
                                      style={{
                                        margin: "0 0 6px 0",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        color: BRAND.navy,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                      }}
                                    >
                                      7-day plan
                                    </p>
                                    <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", lineHeight: 1.6 }}>
                                      {site.sevenDayPlan.map((p, i) => (
                                        <li key={i}>{p}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))
                          }
                        />
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          padding: "16px 32px",
                          backgroundColor: BRAND.cream,
                          fontSize: "11px",
                          color: BRAND.lightText,
                          textAlign: "center" as const,
                        }}
                      >
                        Generated {briefing.metadata.generatedAt} · Build duration{" "}
                        {(briefing.metadata.durationMs / 1000).toFixed(1)}s · Reply to discuss any section.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

// Re-export helpers for B4b + B4c continuation files.
export { BRAND, FONTS, TBL, TH, TD, sparkline, bar, fmtNum, fmtPct, fmtSign, severityBadge, gradeColor, Section };
