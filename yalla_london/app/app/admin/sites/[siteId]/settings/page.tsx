"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Variable {
  key: string;
  label: string;
  category: string;
  description: string;
  sensitive: boolean;
  placeholder?: string;
  required?: boolean;
  syncToVercel?: boolean;
  value: string;
  maskedValue: string;
  hasValue: boolean;
  lastUpdated: string | null;
}

interface Category {
  category: string;
  variables: Variable[];
}

interface VaultData {
  siteId: string;
  categories: Category[];
  vercelConfigured: boolean;
  totalVariables: number;
  configuredCount: number;
}

// Category icons & colors
const CATEGORY_META: Record<string, { icon: string; color: string; bg: string }> = {
  Analytics: { icon: "\u{1F4CA}", color: "#60a5fa", bg: "#1e3a5f" },
  SEO: { icon: "\u{1F50D}", color: "#34d399", bg: "#1a3a2a" },
  "AI Providers": { icon: "\u{1F916}", color: "#c084fc", bg: "#2d1b4e" },
  Affiliates: { icon: "\u{1F4B0}", color: "#fbbf24", bg: "#3d2e0a" },
  Domain: { icon: "\u{1F310}", color: "#f472b6", bg: "#3d1b2e" },
  Social: { icon: "\u{1F4F1}", color: "#38bdf8", bg: "#0c2d4a" },
};

export default function SiteVariableVault() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const [data, setData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<any>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sites/${siteId}/variables`);
      const json = await res.json();
      setData(json);

      // Pre-populate edit values with non-sensitive existing values
      const initialValues: Record<string, string> = {};
      for (const cat of json.categories || []) {
        for (const v of cat.variables) {
          if (v.value) {
            initialValues[v.key] = v.value;
          }
        }
      }
      setEditValues(initialValues);
      // Expand categories that have configured values
      const expanded = new Set<string>();
      for (const cat of json.categories || []) {
        if (cat.variables.some((v: Variable) => v.hasValue)) {
          expanded.add(cat.category);
        }
      }
      setExpandedCategories(expanded);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaveResult(null);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);

    // Collect only changed values
    const variables = Object.entries(editValues)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => ({ key, value }));

    try {
      const res = await fetch(`/api/admin/sites/${siteId}/variables`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables }),
      });
      const result = await res.json();
      setSaveResult(result);
      setDirty(false);
      // Refresh data to show updated masked values
      await fetchData();
    } catch (err) {
      setSaveResult({ error: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#888", fontSize: 18 }}>Loading Variable Vault...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", padding: 40, color: "#fff" }}>
        <h1>Variable Vault</h1>
        <p style={{ color: "#f87171" }}>Failed to load variables for site: {siteId}</p>
        <button onClick={() => router.push("/admin/command-center")} style={btnStyle}>
          Back to Command Center
        </button>
      </div>
    );
  }

  const progress = data.totalVariables > 0
    ? Math.round((data.configuredCount / data.totalVariables) * 100)
    : 0;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #222", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <button
            onClick={() => router.push("/admin/command-center")}
            style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14, padding: 0, marginBottom: 8 }}
          >
            &larr; Command Center
          </button>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#fff" }}>
            Variable Vault &mdash; {siteId}
          </h1>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: 14 }}>
            Configure credentials, API keys, and integrations for this site
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Vercel status */}
          <div style={{
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            background: data.vercelConfigured ? "#052e16" : "#451a03",
            color: data.vercelConfigured ? "#4ade80" : "#fbbf24",
            border: `1px solid ${data.vercelConfigured ? "#166534" : "#92400e"}`,
          }}>
            Vercel Sync: {data.vercelConfigured ? "Connected" : "Not Configured"}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{
              ...btnStyle,
              background: dirty ? "#2563eb" : "#333",
              opacity: saving || !dirty ? 0.5 : 1,
              cursor: saving || !dirty ? "not-allowed" : "pointer",
              minWidth: 140,
            }}
          >
            {saving ? "Saving..." : dirty ? "Save All Changes" : "No Changes"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: "16px 32px", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "#888" }}>
            Configuration Progress
          </span>
          <span style={{ fontSize: 13, color: "#aaa" }}>
            {data.configuredCount} / {data.totalVariables} variables set ({progress}%)
          </span>
        </div>
        <div style={{ background: "#1a1a1a", borderRadius: 4, height: 6, overflow: "hidden" }}>
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              borderRadius: 4,
              background: progress === 100 ? "#22c55e" : progress > 50 ? "#3b82f6" : "#f59e0b",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Save result banner */}
      {saveResult && (
        <div style={{
          margin: "16px 32px 0",
          padding: "12px 16px",
          borderRadius: 8,
          fontSize: 13,
          background: saveResult.success ? "#052e16" : "#450a0a",
          border: `1px solid ${saveResult.success ? "#166534" : "#991b1b"}`,
          color: saveResult.success ? "#4ade80" : "#fca5a5",
        }}>
          {saveResult.success ? (
            <>
              Saved successfully!{" "}
              DB: {saveResult.database?.saved || 0} saved, {saveResult.database?.deleted || 0} deleted.
              {saveResult.vercel?.vercelConfigured && (
                <> Vercel: {saveResult.vercel.synced} synced, {saveResult.vercel.failed} failed.</>
              )}
            </>
          ) : (
            <>Error: {saveResult.error || "Save failed"}</>
          )}
        </div>
      )}

      {/* Variable categories */}
      <div style={{ padding: "24px 32px" }}>
        {data.categories.map((cat) => {
          const meta = CATEGORY_META[cat.category] || { icon: "\u2699\uFE0F", color: "#888", bg: "#1a1a1a" };
          const isExpanded = expandedCategories.has(cat.category);
          const configured = cat.variables.filter((v) => v.hasValue).length;

          return (
            <div key={cat.category} style={{
              marginBottom: 16,
              border: "1px solid #222",
              borderRadius: 12,
              overflow: "hidden",
              background: "#111",
            }}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.category)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  background: isExpanded ? meta.bg : "transparent",
                  border: "none",
                  borderBottom: isExpanded ? "1px solid #222" : "none",
                  cursor: "pointer",
                  color: "#e5e5e5",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{meta.icon}</span>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{cat.category}</span>
                  <span style={{
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: configured === cat.variables.length ? "#052e16" : "#1a1a1a",
                    color: configured === cat.variables.length ? "#4ade80" : "#888",
                  }}>
                    {configured}/{cat.variables.length}
                  </span>
                </div>
                <span style={{ fontSize: 14, color: "#555", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                  &#9660;
                </span>
              </button>

              {/* Variables */}
              {isExpanded && (
                <div style={{ padding: "12px 20px 20px" }}>
                  {cat.variables.map((v) => (
                    <div key={v.key} style={{
                      padding: "12px 0",
                      borderBottom: "1px solid #1a1a1a",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div>
                          <label style={{ fontSize: 14, fontWeight: 600, color: meta.color }}>
                            {v.label}
                          </label>
                          {v.syncToVercel && (
                            <span style={{ fontSize: 10, marginLeft: 8, padding: "1px 6px", borderRadius: 4, background: "#1a2744", color: "#60a5fa" }}>
                              Vercel
                            </span>
                          )}
                          {v.sensitive && (
                            <span style={{ fontSize: 10, marginLeft: 4, padding: "1px 6px", borderRadius: 4, background: "#2d1b1b", color: "#fca5a5" }}>
                              Encrypted
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#555" }}>
                          {v.hasValue ? (
                            <span style={{ color: "#4ade80" }}>Configured</span>
                          ) : (
                            <span style={{ color: "#666" }}>Not set</span>
                          )}
                          {v.lastUpdated && (
                            <span style={{ marginLeft: 8 }}>
                              Updated {new Date(v.lastUpdated).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#666" }}>
                        {v.description}
                      </p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type={v.sensitive && !revealedKeys.has(v.key) ? "password" : "text"}
                          value={editValues[v.key] ?? ""}
                          onChange={(e) => handleChange(v.key, e.target.value)}
                          placeholder={v.hasValue ? v.maskedValue : v.placeholder || "Enter value..."}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            background: "#0a0a0a",
                            border: "1px solid #333",
                            borderRadius: 6,
                            color: "#e5e5e5",
                            fontSize: 13,
                            fontFamily: "monospace",
                            outline: "none",
                          }}
                          autoComplete="off"
                          spellCheck={false}
                        />
                        {v.sensitive && (
                          <button
                            onClick={() => toggleReveal(v.key)}
                            style={{
                              padding: "8px 12px",
                              background: "#1a1a1a",
                              border: "1px solid #333",
                              borderRadius: 6,
                              color: "#888",
                              cursor: "pointer",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {revealedKeys.has(v.key) ? "Hide" : "Show"}
                          </button>
                        )}
                        {editValues[v.key] && (
                          <button
                            onClick={() => {
                              setEditValues((prev) => {
                                const next = { ...prev };
                                delete next[v.key];
                                return next;
                              });
                              setDirty(true);
                            }}
                            style={{
                              padding: "8px 12px",
                              background: "#1a1a1a",
                              border: "1px solid #333",
                              borderRadius: 6,
                              color: "#f87171",
                              cursor: "pointer",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: "#444", fontFamily: "monospace" }}>
                        ENV: {v.key}_{siteId.toUpperCase().replace(/-/g, "_")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky save bar */}
      {dirty && (
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 32px",
          background: "#111",
          borderTop: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 100,
        }}>
          <span style={{ color: "#fbbf24", fontSize: 13 }}>
            You have unsaved changes
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...btnStyle,
              background: "#2563eb",
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  background: "#2563eb",
};
