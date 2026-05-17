"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = "overview" | "listings" | "orders" | "settings";

interface EnvStatus {
  ETSY_API_KEY: boolean;
  ETSY_SHARED_SECRET: boolean;
  ETSY_SHOP_ID: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  shopName?: string;
  listingCount?: number;
  lastSync?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Shop Overview" },
  { id: "listings", label: "Listings" },
  { id: "orders", label: "Orders" },
  { id: "settings", label: "Settings" },
];

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1E293B",
  borderRadius: "12px",
  padding: "20px",
};

const monoLabelStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#64748B",
  fontWeight: 600,
};

const envRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 0",
  borderBottom: "1px solid rgba(30,41,59,0.6)",
};

// ---------------------------------------------------------------------------
// EnvBadge
// ---------------------------------------------------------------------------

function EnvBadge({ isSet }: { isSet: boolean }) {
  return (
    <span
      style={{
        fontFamily: "monospace",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.06em",
        color: isSet ? "#34D399" : "#F87171",
        padding: "2px 8px",
        borderRadius: "4px",
        background: isSet ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)",
      }}
    >
      {isSet ? "SET" : "MISSING"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatusDot
// ---------------------------------------------------------------------------

function StatusDot({ connected }: { connected: boolean | null }) {
  const color =
    connected === true ? "#10B981" : connected === false ? "#EF4444" : "#64748B";
  return (
    <span
      style={{
        display: "inline-block",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Setup Instructions
// ---------------------------------------------------------------------------

function SetupInstructions() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ ...cardStyle, background: "rgba(15,23,42,0.8)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <span style={{ ...monoLabelStyle, color: "#FCD34D", fontSize: "11px" }}>
          Setup Required
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "#64748B",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0)",
          }}
        >
          v
        </span>
      </button>
      {expanded && (
        <div
          style={{
            marginTop: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <p style={{ fontSize: "12px", color: "#94A3B8", lineHeight: 1.6, margin: 0 }}>
            To connect your Etsy shop, complete the following steps:
          </p>
          {[
            {
              step: "1",
              text: (
                <>
                  Create an Etsy app at{" "}
                  <a
                    href="https://www.etsy.com/developers/your-apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#7DD3FC", textDecoration: "underline" }}
                  >
                    etsy.com/developers/your-apps
                  </a>
                  . Copy the <strong style={{ color: "#E2E8F0" }}>Key String</strong> and{" "}
                  <strong style={{ color: "#E2E8F0" }}>Shared Secret</strong>.
                </>
              ),
            },
            {
              step: "2",
              text: (
                <>
                  Add{" "}
                  <code
                    style={{
                      background: "rgba(30,41,59,0.8)",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      color: "#E2E8F0",
                      fontSize: "10px",
                    }}
                  >
                    ETSY_API_KEY
                  </code>{" "}
                  and{" "}
                  <code
                    style={{
                      background: "rgba(30,41,59,0.8)",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      color: "#E2E8F0",
                      fontSize: "10px",
                    }}
                  >
                    ETSY_SHARED_SECRET
                  </code>{" "}
                  in Vercel Environment Variables.
                </>
              ),
            },
            {
              step: "3",
              text: (
                <>
                  Optionally set{" "}
                  <code
                    style={{
                      background: "rgba(30,41,59,0.8)",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      color: "#E2E8F0",
                      fontSize: "10px",
                    }}
                  >
                    ETSY_SHOP_ID
                  </code>{" "}
                  (numeric shop ID or shop name). If omitted, the OAuth flow resolves it
                  automatically.
                </>
              ),
            },
            {
              step: "4",
              text: "Redeploy the app, then return here and click Connect Etsy to start the OAuth flow.",
            },
          ].map((item) => (
            <div
              key={item.step}
              style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}
            >
              <span
                style={{
                  ...monoLabelStyle,
                  color: "#475569",
                  fontWeight: 700,
                  flexShrink: 0,
                  fontSize: "11px",
                }}
              >
                {item.step}.
              </span>
              <p
                style={{
                  fontSize: "12px",
                  color: "#94A3B8",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {item.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state for listings/orders when not connected
// ---------------------------------------------------------------------------

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: "36px", marginBottom: "16px", opacity: 0.5 }}>
        {icon}
      </span>
      <p style={{ fontSize: "15px", fontWeight: 600, color: "#E2E8F0", margin: "0 0 8px 0" }}>
        {title}
      </p>
      <p style={{ fontSize: "12px", color: "#64748B", margin: 0, maxWidth: "340px", lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Shop Overview
// ---------------------------------------------------------------------------

function OverviewTab({
  envStatus,
  connection,
  isConnecting,
  onConnect,
  onTestConnection,
  testResult,
  isTesting,
}: {
  envStatus: EnvStatus;
  connection: ConnectionStatus | null;
  isConnecting: boolean;
  onConnect: () => void;
  onTestConnection: () => void;
  testResult: { success: boolean; latency: number; error?: string } | null;
  isTesting: boolean;
}) {
  const isConfigured = envStatus.ETSY_API_KEY && envStatus.ETSY_SHARED_SECRET;
  const isConnected = connection?.connected === true;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Connection Status Card */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <StatusDot connected={isConnected ? true : isConfigured ? false : null} />
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#F8FAFC", margin: 0 }}>
              {isConnected
                ? "Connected to Etsy"
                : isConfigured
                  ? "Not Connected"
                  : "Not Configured"}
            </p>
          </div>
          <span
            style={{
              ...monoLabelStyle,
              padding: "2px 8px",
              borderRadius: "999px",
              background: isConnected
                ? "rgba(16,185,129,0.12)"
                : "rgba(100,116,139,0.12)",
              color: isConnected ? "#34D399" : "#94A3B8",
              fontSize: "10px",
            }}
          >
            {isConnected ? "LIVE" : isConfigured ? "READY" : "SETUP NEEDED"}
          </span>
        </div>

        {/* Shop details if connected */}
        {isConnected && connection && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            {[
              { label: "Shop Name", value: connection.shopName || "Unknown" },
              {
                label: "Active Listings",
                value: connection.listingCount?.toString() ?? "0",
              },
              {
                label: "Last Sync",
                value: connection.lastSync
                  ? new Date(connection.lastSync).toLocaleDateString()
                  : "Never",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: "rgba(15,23,42,0.6)",
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <p style={{ ...monoLabelStyle, margin: "0 0 4px 0" }}>
                  {item.label}
                </p>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#E2E8F0",
                    margin: 0,
                  }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Connect / Test buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {!isConnected && (
            <button
              onClick={onConnect}
              disabled={!isConfigured || isConnecting}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                background: isConfigured
                  ? "rgba(59,126,161,0.2)"
                  : "rgba(30,41,59,0.5)",
                border: isConfigured
                  ? "1px solid rgba(59,126,161,0.4)"
                  : "1px solid rgba(30,41,59,0.8)",
                color: isConfigured ? "#7DD3FC" : "#475569",
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase" as const,
                cursor: isConfigured && !isConnecting ? "pointer" : "not-allowed",
                opacity: isConnecting ? 0.6 : 1,
              }}
            >
              {isConnecting ? "Connecting..." : "Connect Etsy"}
            </button>
          )}

          {isConfigured && (
            <button
              onClick={onTestConnection}
              disabled={isTesting}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                background:
                  testResult?.success === true
                    ? "rgba(16,185,129,0.15)"
                    : testResult?.success === false
                      ? "rgba(248,113,113,0.15)"
                      : "rgba(59,126,161,0.1)",
                border:
                  testResult?.success === true
                    ? "1px solid rgba(16,185,129,0.35)"
                    : testResult?.success === false
                      ? "1px solid rgba(248,113,113,0.35)"
                      : "1px solid rgba(59,126,161,0.25)",
                color:
                  testResult?.success === true
                    ? "#34D399"
                    : testResult?.success === false
                      ? "#F87171"
                      : "#7DD3FC",
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase" as const,
                cursor: isTesting ? "wait" : "pointer",
                opacity: isTesting ? 0.6 : 1,
              }}
            >
              {isTesting
                ? "Testing..."
                : testResult?.success === true
                  ? `Connected (${testResult.latency}ms)`
                  : testResult?.success === false
                    ? "Test Failed"
                    : "Test Connection"}
            </button>
          )}
        </div>

        {/* Test error display */}
        {testResult?.success === false && testResult.error && (
          <p
            style={{
              fontSize: "11px",
              color: "#F87171",
              fontFamily: "monospace",
              margin: "8px 0 0 0",
            }}
          >
            {testResult.error}
          </p>
        )}

        {/* Connection error */}
        {connection?.error && !isConnected && (
          <p
            style={{
              fontSize: "11px",
              color: "#F87171",
              fontFamily: "monospace",
              margin: "8px 0 0 0",
            }}
          >
            {connection.error}
          </p>
        )}
      </div>

      {/* Setup instructions when not configured */}
      {!isConfigured && <SetupInstructions />}

      {/* OAuth info panel when configured but not connected */}
      {isConfigured && !isConnected && (
        <div style={{ ...cardStyle, background: "rgba(15,23,42,0.6)" }}>
          <p style={{ ...monoLabelStyle, margin: "0 0 8px 0" }}>OAuth2 with PKCE</p>
          <p
            style={{
              fontSize: "12px",
              color: "#94A3B8",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Etsy uses OAuth2 Authorization Code flow with PKCE for secure shop access.
            Clicking &quot;Connect Etsy&quot; will redirect you to Etsy to authorize the
            app. Tokens are encrypted and stored securely, with automatic refresh.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Listings
// ---------------------------------------------------------------------------

function ListingsTab({ isConnected }: { isConnected: boolean }) {
  if (!isConnected) {
    return (
      <EmptyState
        icon="🏷"
        title="Connect Etsy to view listings"
        description="Once your Etsy shop is connected, your active, draft, and expired listings will appear here with management actions."
      />
    );
  }

  return (
    <div style={cardStyle}>
      <p style={{ ...monoLabelStyle, margin: "0 0 12px 0" }}>Shop Listings</p>
      <div
        style={{
          background: "rgba(15,23,42,0.6)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Title", "Price", "Status", "Views", "Favorites"].map((h) => (
                <th
                  key={h}
                  style={{
                    ...monoLabelStyle,
                    padding: "10px 12px",
                    textAlign: "left",
                    borderBottom: "1px solid #1E293B",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={5}
                style={{
                  padding: "32px 12px",
                  textAlign: "center",
                  color: "#475569",
                  fontSize: "12px",
                }}
              >
                Listings will load from your connected Etsy shop. Sync your shop to
                populate this table.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Orders
// ---------------------------------------------------------------------------

function OrdersTab({ isConnected }: { isConnected: boolean }) {
  if (!isConnected) {
    return (
      <EmptyState
        icon="📦"
        title="Connect Etsy to view orders"
        description="Order history, fulfillment status, and revenue tracking will appear here once your shop is connected."
      />
    );
  }

  return (
    <div style={cardStyle}>
      <p style={{ ...monoLabelStyle, margin: "0 0 12px 0" }}>Recent Orders</p>
      <div
        style={{
          background: "rgba(15,23,42,0.6)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Order #", "Buyer", "Total", "Status", "Date"].map((h) => (
                <th
                  key={h}
                  style={{
                    ...monoLabelStyle,
                    padding: "10px 12px",
                    textAlign: "left",
                    borderBottom: "1px solid #1E293B",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={5}
                style={{
                  padding: "32px 12px",
                  textAlign: "center",
                  color: "#475569",
                  fontSize: "12px",
                }}
              >
                Orders will load from your connected Etsy shop. Sync to populate this
                table.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Settings
// ---------------------------------------------------------------------------

function SettingsTab({ envStatus }: { envStatus: EnvStatus }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* API Keys Status */}
      <div style={cardStyle}>
        <p style={{ ...monoLabelStyle, margin: "0 0 14px 0" }}>
          API Key Status
        </p>
        <div
          style={{
            background: "rgba(15,23,42,0.6)",
            borderRadius: "8px",
            padding: "12px",
          }}
        >
          {(
            [
              {
                key: "ETSY_API_KEY",
                label: "Etsy API Key (Client ID)",
                set: envStatus.ETSY_API_KEY,
              },
              {
                key: "ETSY_SHARED_SECRET",
                label: "Etsy Shared Secret",
                set: envStatus.ETSY_SHARED_SECRET,
              },
              {
                key: "ETSY_SHOP_ID",
                label: "Etsy Shop ID (optional)",
                set: envStatus.ETSY_SHOP_ID,
              },
            ] as const
          ).map((item, idx, arr) => (
            <div
              key={item.key}
              style={{
                ...envRowStyle,
                borderBottom:
                  idx < arr.length - 1
                    ? "1px solid rgba(30,41,59,0.6)"
                    : "none",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#E2E8F0",
                    margin: "0 0 2px 0",
                    fontWeight: 500,
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontFamily: "monospace",
                    fontSize: "10px",
                    color: "#475569",
                    margin: 0,
                  }}
                >
                  {item.key}
                </p>
              </div>
              <EnvBadge isSet={item.set} />
            </div>
          ))}
        </div>
      </div>

      {/* OAuth Configuration */}
      <div style={cardStyle}>
        <p style={{ ...monoLabelStyle, margin: "0 0 14px 0" }}>
          OAuth Configuration
        </p>
        <div
          style={{
            background: "rgba(15,23,42,0.6)",
            borderRadius: "8px",
            padding: "14px",
          }}
        >
          {[
            {
              label: "Auth Method",
              value: "OAuth2 + PKCE (Authorization Code)",
            },
            {
              label: "Scopes",
              value:
                "listings_r, listings_w, listings_d, shops_r, shops_w, transactions_r, profile_r",
            },
            {
              label: "Token Refresh",
              value: "Automatic (tokens refreshed 5 min before expiry)",
            },
            {
              label: "Token Storage",
              value: "Encrypted in Credential table (AES-256)",
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "6px 0",
                gap: "16px",
              }}
            >
              <span
                style={{ fontSize: "11px", color: "#64748B", flexShrink: 0 }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "#94A3B8",
                  textAlign: "right",
                  fontFamily: "monospace",
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Setup instructions */}
      {(!envStatus.ETSY_API_KEY || !envStatus.ETSY_SHARED_SECRET) && (
        <SetupInstructions />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function EtsyShopPage() {
  // Feature flag: Etsy integration is frozen
  const etsyEnabled = process.env.NEXT_PUBLIC_ETSY_ENABLED === "true";
  if (!etsyEnabled) {
    return (
      <div style={{ maxWidth: 600, margin: "4rem auto", textAlign: "center", padding: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>Etsy Integration</h1>
        <div style={{ padding: "2rem", background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 12 }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 500, marginBottom: "0.5rem" }}>Temporarily Unavailable</p>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>
            The Etsy integration is currently frozen while we focus on other revenue channels.
            All your Etsy configuration and code is preserved and will be re-enabled when ready.
          </p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [envStatus, setEnvStatus] = useState<EnvStatus>({
    ETSY_API_KEY: false,
    ETSY_SHARED_SECRET: false,
    ETSY_SHOP_ID: false,
  });
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latency: number;
    error?: string;
  } | null>(null);

  // Fetch env var status on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/env-check", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.vars) {
          setEnvStatus({
            ETSY_API_KEY: !!data.vars.ETSY_API_KEY,
            ETSY_SHARED_SECRET: !!data.vars.ETSY_SHARED_SECRET,
            ETSY_SHOP_ID: !!data.vars.ETSY_SHOP_ID,
          });
        }
      } catch {
        // env check is best-effort
      }
    })();
  }, []);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const res = await fetch("/api/admin/etsy/connect", {
        method: "POST",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.authUrl) {
          window.location.href = data.authUrl;
          return;
        }
      }
      setConnection({
        connected: false,
        error: "OAuth flow not available. Ensure ETSY_API_KEY and ETSY_SHARED_SECRET are set.",
      });
    } catch (err) {
      setConnection({
        connected: false,
        error: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    const start = Date.now();
    try {
      const res = await fetch("/api/admin/env-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "etsy" }),
        cache: "no-store",
      });
      const latency = Date.now() - start;
      if (!res.ok) {
        setTestResult({ success: false, latency, error: `HTTP ${res.status}` });
        return;
      }
      const data = await res.json();
      if (data?.connected === false) {
        setTestResult({
          success: false,
          latency,
          error: data.error || "Connection check failed",
        });
      } else {
        setTestResult({ success: true, latency });
        if (data?.shopName) {
          setConnection({
            connected: true,
            shopName: data.shopName,
            listingCount: data.listingCount,
          });
        }
      }
    } catch (err) {
      const latency = Date.now() - start;
      setTestResult({
        success: false,
        latency,
        error: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setIsTesting(false);
    }
  }, []);

  const isConnected = connection?.connected === true;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B1120",
        padding: "28px 24px",
        fontFamily: "var(--font-system, system-ui)",
        color: "#F1F5F9",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <p
          style={{
            fontFamily: "monospace",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#64748B",
            marginBottom: "6px",
          }}
        >
          Admin / Commerce
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#F8FAFC",
                margin: 0,
              }}
            >
              Etsy Shop
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "#94A3B8",
                marginTop: "4px",
              }}
            >
              Manage your Etsy shop connection, listings, and orders.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <StatusDot connected={isConnected ? true : envStatus.ETSY_API_KEY ? false : null} />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                color: isConnected ? "#34D399" : "#94A3B8",
                fontWeight: 600,
              }}
            >
              {isConnected
                ? connection?.shopName || "Connected"
                : "Not Connected"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "20px",
          borderBottom: "1px solid #1E293B",
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid #7DD3FC"
                  : "2px solid transparent",
              color: activeTab === tab.id ? "#F8FAFC" : "#64748B",
              fontFamily: "monospace",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab
          envStatus={envStatus}
          connection={connection}
          isConnecting={isConnecting}
          onConnect={handleConnect}
          onTestConnection={handleTestConnection}
          testResult={testResult}
          isTesting={isTesting}
        />
      )}
      {activeTab === "listings" && <ListingsTab isConnected={isConnected} />}
      {activeTab === "orders" && <OrdersTab isConnected={isConnected} />}
      {activeTab === "settings" && <SettingsTab envStatus={envStatus} />}

      {/* Footer */}
      <p
        style={{
          marginTop: "32px",
          fontSize: "11px",
          color: "#334155",
          fontFamily: "monospace",
          textAlign: "center",
        }}
      >
        Etsy API v3 — OAuth2 PKCE — Env var status reflects build-time
        detection.
      </p>
    </div>
  );
}
