"use client";

import React from "react";

/* ═══════════════════════════════════════════════
   ZENITHA HQ — Component Library
   Dark navy admin components for the Zenitha.Luxury dashboard.
   All components assume they render inside a .zh-dark wrapper.
   ═══════════════════════════════════════════════ */

// ─── ZHCard ──────────────────────────────────────
export function ZHCard({
  children,
  className = "",
  onClick,
  hover = false,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-zh-navy-mid border border-zh-navy-border rounded-lg p-4
        ${hover ? "cursor-pointer hover:bg-zh-navy-light hover:border-zh-gold-dim transition-colors duration-150" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ─── ZHBadge ─────────────────────────────────────
type BadgeVariant = "gold" | "success" | "warn" | "error" | "info" | "muted";

const BADGE_STYLES: Record<BadgeVariant, string> = {
  gold: "bg-zh-gold-dim text-zh-gold",
  success: "bg-[rgba(45,106,63,0.15)] text-zh-success-text",
  warn: "bg-[rgba(122,74,16,0.15)] text-zh-warn-text",
  error: "bg-[rgba(107,28,28,0.15)] text-zh-error-text",
  info: "bg-[rgba(15,46,58,0.15)] text-zh-info-text",
  muted: "bg-zh-navy-light text-zh-cream-muted",
};

export function ZHBadge({
  children,
  variant = "muted",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-zh-mono
        ${BADGE_STYLES[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// ─── ZHStatusPill ────────────────────────────────
type PillStatus = "ok" | "degraded" | "critical" | "unknown";

const PILL_STYLES: Record<PillStatus, { dot: string; bg: string; text: string }> = {
  ok: { dot: "bg-zh-success-text", bg: "bg-[rgba(45,106,63,0.15)]", text: "text-zh-success-text" },
  degraded: { dot: "bg-zh-warn-text", bg: "bg-[rgba(122,74,16,0.15)]", text: "text-zh-warn-text" },
  critical: { dot: "bg-zh-error-text animate-pulse", bg: "bg-[rgba(107,28,28,0.15)]", text: "text-zh-error-text" },
  unknown: { dot: "bg-zh-cream-muted", bg: "bg-zh-navy-light", text: "text-zh-cream-muted" },
};

export function ZHStatusPill({
  label,
  status = "unknown",
  className = "",
}: {
  label: string;
  status?: PillStatus;
  className?: string;
}) {
  const s = PILL_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-zh-mono ${s.bg} ${s.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
}

// ─── ZHMetricCell ────────────────────────────────
export function ZHMetricCell({
  label,
  value,
  sub,
  trend,
  className = "",
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "flat";
  className?: string;
}) {
  const trendIcon = trend === "up" ? "+" : trend === "down" ? "-" : "";
  const trendColor = trend === "up" ? "text-zh-success-text" : trend === "down" ? "text-zh-error-text" : "text-zh-cream-muted";
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] uppercase tracking-wider text-zh-cream-muted font-zh-mono">{label}</span>
      <span className="text-xl font-bold font-zh-mono text-zh-cream">{value}</span>
      {sub && (
        <span className={`text-xs font-zh-mono ${trendColor}`}>
          {trendIcon && <span className="mr-0.5">{trendIcon}</span>}
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── ZHAlertBanner ───────────────────────────────
export function ZHAlertBanner({
  children,
  severity = "info",
  onDismiss,
  className = "",
}: {
  children: React.ReactNode;
  severity?: "info" | "warn" | "error" | "success";
  onDismiss?: () => void;
  className?: string;
}) {
  const styles: Record<string, string> = {
    info: "border-zh-info bg-[rgba(15,46,58,0.2)] text-zh-info-text",
    warn: "border-zh-warn bg-[rgba(122,74,16,0.2)] text-zh-warn-text",
    error: "border-zh-error bg-[rgba(107,28,28,0.2)] text-zh-error-text",
    success: "border-zh-success bg-[rgba(45,106,63,0.2)] text-zh-success-text",
  };
  return (
    <div className={`flex items-start gap-3 border-l-4 rounded-r-lg px-4 py-3 text-sm font-zh-ui ${styles[severity]} ${className}`}>
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 text-current">
          &times;
        </button>
      )}
    </div>
  );
}

// ─── ZHTable ─────────────────────────────────────
export function ZHTable({
  headers,
  children,
  className = "",
}: {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zh-navy-border">
            {headers.map((h) => (
              <th key={h} className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-zh-cream-muted font-zh-mono font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zh-navy-border">{children}</tbody>
      </table>
    </div>
  );
}

// ─── ZHActionBtn ─────────────────────────────────
type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

const BTN_STYLES: Record<BtnVariant, string> = {
  primary: "bg-zh-gold text-zh-navy hover:bg-zh-gold/90 font-semibold",
  secondary: "bg-zh-navy-light text-zh-cream border border-zh-navy-border hover:bg-zh-navy-hover",
  ghost: "text-zh-cream-muted hover:text-zh-cream hover:bg-zh-navy-light",
  danger: "bg-zh-error text-zh-error-text hover:bg-zh-error/80",
};

export function ZHActionBtn({
  children,
  variant = "secondary",
  onClick,
  disabled = false,
  loading = false,
  className = "",
  size = "md",
}: {
  children: React.ReactNode;
  variant?: BtnVariant;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm";
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-2 rounded-md font-zh-ui transition-colors duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${sizeClass} ${BTN_STYLES[variant]} ${className}
      `}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

// ─── ZHSectionLabel ──────────────────────────────
export function ZHSectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`text-[11px] uppercase tracking-[0.15em] text-zh-cream-muted font-zh-mono mb-3 ${className}`}>
      {children}
    </h2>
  );
}

// ─── ZHMonoVal ───────────────────────────────────
export function ZHMonoVal({
  children,
  className = "",
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "text-xs" : size === "lg" ? "text-2xl" : "text-base";
  return (
    <span className={`font-zh-mono tabular-nums ${sizeClass} ${className}`}>
      {children}
    </span>
  );
}

// ─── ZHPipelineTrack ─────────────────────────────
interface PipelineNode {
  label: string;
  count: number;
  status?: "active" | "idle" | "error";
}

export function ZHPipelineTrack({
  nodes,
  className = "",
}: {
  nodes: PipelineNode[];
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 overflow-x-auto py-2 ${className}`}>
      {nodes.map((node, i) => {
        const statusColor =
          node.status === "active"
            ? "border-zh-gold text-zh-gold"
            : node.status === "error"
            ? "border-zh-error-text text-zh-error-text"
            : "border-zh-navy-border text-zh-cream-muted";
        return (
          <React.Fragment key={node.label}>
            {i > 0 && <span className="text-zh-navy-border text-xs mx-0.5">&rarr;</span>}
            <div
              className={`
                flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded border
                min-w-[64px] text-center
                ${statusColor}
              `}
            >
              <span className="text-lg font-bold font-zh-mono leading-none">{node.count}</span>
              <span className="text-[9px] uppercase tracking-wider font-zh-mono leading-none whitespace-nowrap">{node.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
