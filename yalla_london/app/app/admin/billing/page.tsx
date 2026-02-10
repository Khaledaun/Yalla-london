"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Building2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Globe,
  Clock,
  Receipt,
  Zap,
  Crown,
  Loader2,
} from "lucide-react";

interface BillingData {
  stripeConfigured: boolean;
  plans: Record<string, PlanConfig>;
  entity: BillingEntity | null;
  subscriptions: Subscription[];
  paymentMethods: PaymentMethodEntry[];
  invoices: InvoiceEntry[];
}

interface PlanConfig {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  maxSites: number;
}

interface BillingEntity {
  id: string;
  name: string;
  email: string;
  stripe_customer_id: string | null;
}

interface Subscription {
  id: string;
  plan_name: string;
  status: string;
  site_ids: string[];
  quantity: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface PaymentMethodEntry {
  id: string;
  type: string;
  last4: string | null;
  brand: string | null;
  is_default: boolean;
}

interface InvoiceEntry {
  id: string;
  number: string | null;
  status: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created_at: string;
  hosted_invoice_url: string | null;
  pdf_url: string | null;
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "plans" | "invoices" | "settings">("overview");
  const [entityForm, setEntityForm] = useState({ name: "", email: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  async function fetchBillingData() {
    try {
      const res = await fetch("/api/admin/billing");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      if (json.entity) {
        setEntityForm({ name: json.entity.name, email: json.entity.email });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function createEntity() {
    if (!entityForm.name || !entityForm.email) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_entity", ...entityForm }),
      });
      if (!res.ok) throw new Error("Failed to create entity");
      await fetchBillingData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function startCheckout(planId: string, period: "monthly" | "yearly") {
    if (!data?.entity) return;
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_checkout",
          entityId: data.entity.id,
          planId,
          siteIds: [],
          billingPeriod: period,
        }),
      });
      const json = await res.json();
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
      } else {
        setError(json.error || "Failed to create checkout");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    }
  }

  async function openBillingPortal() {
    if (!data?.entity) return;
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "billing_portal",
          entityId: data.entity.id,
        }),
      });
      const json = await res.json();
      if (json.portalUrl) {
        window.location.href = json.portalUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Portal failed");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const activeSub = data?.subscriptions?.find(
    (s) => s.status === "active" || s.status === "trialing",
  );
  const currentPlan = activeSub
    ? data?.plans?.[activeSub.plan_name]
    : data?.plans?.free;

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Building2 },
    { id: "plans" as const, label: "Plans", icon: Crown },
    { id: "invoices" as const, label: "Invoices", icon: Receipt },
    { id: "settings" as const, label: "Settings", icon: CreditCard },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <CreditCard className="h-7 w-7 text-purple-500" />
          Billing & Subscription
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your subscription, payment methods, and invoices across all sites.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {!data?.stripeConfigured && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-amber-800 dark:text-amber-300 font-medium">
            Stripe not configured
          </p>
          <p className="text-amber-600 dark:text-amber-400 text-sm mt-1">
            Set <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">STRIPE_SECRET_KEY</code> and{" "}
            <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">STRIPE_WEBHOOK_SECRET</code> environment variables to enable billing.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700 mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-purple-500 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Entity Setup */}
          {!data?.entity ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Set Up Billing Entity
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Create a billing entity to manage subscriptions across all your sites.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company / Entity Name
                  </label>
                  <input
                    type="text"
                    value={entityForm.name}
                    onChange={(e) =>
                      setEntityForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Yalla Media Group"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Billing Email
                  </label>
                  <input
                    type="email"
                    value={entityForm.email}
                    onChange={(e) =>
                      setEntityForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="billing@yourdomain.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <button
                onClick={createEntity}
                disabled={creating || !entityForm.name || !entityForm.email}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Billing Entity
              </button>
            </div>
          ) : (
            <>
              {/* Current Plan */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Current Plan
                  </h3>
                  {activeSub && (
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        activeSub.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {activeSub.status}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {currentPlan?.name || "Free"} Plan
                    </p>
                    <p className="text-sm text-gray-500">
                      {currentPlan?.description}
                    </p>
                  </div>
                </div>

                {activeSub && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <Globe className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {activeSub.site_ids?.length || 0}
                      </p>
                      <p className="text-xs text-gray-500">Sites</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <Zap className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {currentPlan?.maxSites || 1}
                      </p>
                      <p className="text-xs text-gray-500">Max Sites</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <Clock className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {activeSub.current_period_end
                          ? new Date(activeSub.current_period_end).toLocaleDateString()
                          : "—"}
                      </p>
                      <p className="text-xs text-gray-500">Renews</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <CreditCard className="h-5 w-5 text-green-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        £{currentPlan?.priceMonthly || 0}
                      </p>
                      <p className="text-xs text-gray-500">/month</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={openBillingPortal}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-2 text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Manage Subscription
                  </button>
                  <button
                    onClick={() => setActiveTab("plans")}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                  >
                    Change Plan
                  </button>
                </div>
              </div>

              {/* Billing Entity Info */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Billing Entity
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {data.entity.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {data.entity.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Stripe ID</span>
                    <p className="font-medium text-gray-900 dark:text-white font-mono text-xs">
                      {data.entity.stripe_customer_id || "Not connected"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              {data.paymentMethods.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Payment Methods
                  </h3>
                  <div className="space-y-3">
                    {data.paymentMethods.map((pm) => (
                      <div
                        key={pm.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                      >
                        <CreditCard className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {pm.brand?.toUpperCase() || "Card"} ending in {pm.last4}
                          </p>
                        </div>
                        {pm.is_default && (
                          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === "plans" && data?.plans && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.values(data.plans).map((plan) => {
            const isCurrentPlan = currentPlan?.id === plan.id;
            return (
              <div
                key={plan.id}
                className={`bg-white dark:bg-slate-800 rounded-lg border-2 p-6 ${
                  isCurrentPlan
                    ? "border-purple-500 shadow-lg shadow-purple-100 dark:shadow-none"
                    : "border-gray-200 dark:border-slate-700"
                }`}
              >
                {isCurrentPlan && (
                  <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2">
                    CURRENT PLAN
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    £{plan.priceMonthly}
                  </span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  £{plan.priceYearly}/yr (save{" "}
                  {Math.round(
                    (1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100,
                  )}
                  %)
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 space-y-2">
                  {!isCurrentPlan && plan.priceMonthly > 0 && data.entity && (
                    <>
                      <button
                        onClick={() => startCheckout(plan.id, "monthly")}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                      >
                        Subscribe Monthly
                      </button>
                      <button
                        onClick={() => startCheckout(plan.id, "yearly")}
                        className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        Subscribe Yearly
                      </button>
                    </>
                  )}
                  {isCurrentPlan && (
                    <div className="text-center text-sm text-purple-600 dark:text-purple-400 font-medium py-2">
                      Your current plan
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Invoice History
            </h3>
          </div>
          {data?.invoices && data.invoices.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {data.invoices.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center gap-4">
                  <Receipt className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {inv.number || inv.id}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {inv.currency} {(inv.amount_paid / 100).toFixed(2)}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        inv.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : inv.status === "open"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  {inv.hosted_invoice_url && (
                    <a
                      href={inv.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-500 hover:text-purple-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No invoices yet. Subscribe to a plan to get started.
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Manage Payment & Subscription
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Use the Stripe Customer Portal to update your payment methods,
              change plans, or download invoices.
            </p>
            <button
              onClick={openBillingPortal}
              disabled={!data?.entity?.stripe_customer_id}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <ExternalLink className="h-5 w-5" />
              Open Stripe Portal
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Environment Status
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {data?.stripeConfigured ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-gray-700 dark:text-gray-300">
                  STRIPE_SECRET_KEY
                </span>
              </div>
              <div className="flex items-center gap-2">
                {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-gray-700 dark:text-gray-300">
                  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
