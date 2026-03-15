'use client'

import { useState } from 'react'
import {
  CreditCard, DollarSign, Users, Receipt,
  RefreshCw, Clock, ExternalLink, Search
} from 'lucide-react'
import {
  AdminPageHeader,
  AdminCard,
  AdminButton,
  AdminTabs,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminKPICard,
} from '@/components/admin/admin-ui'

interface StripePayment {
  id: string
  amount: number
  currency: string
  status: string
  customer_email: string
  description: string | null
  created: string
}

interface StripeCustomer {
  id: string
  email: string
  name: string | null
  created: string
  total_spent: number
  currency: string
}

interface StripeBalance {
  available: { amount: number; currency: string }[]
  pending: { amount: number; currency: string }[]
}

type TabId = 'overview' | 'payments' | 'customers'

export default function StripeMCPPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [payments, setPayments] = useState<StripePayment[]>([])
  const [customers, setCustomers] = useState<StripeCustomer[]>([])
  const [balance, setBalance] = useState<StripeBalance | null>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const formatCurrency = (amount: number, currency: string) => {
    const sym = currency === 'gbp' ? '\u00A3' : currency === 'usd' ? '$' : currency === 'eur' ? '\u20AC' : currency.toUpperCase() + ' '
    return `${sym}${(amount / 100).toFixed(2)}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const fetchBalance = async () => {
    setLoading(prev => ({ ...prev, balance: true }))
    setError(null)
    try {
      const res = await fetch('/api/admin/mcp/stripe/balance')
      if (!res.ok) throw new Error('Failed to fetch balance')
      const data = await res.json()
      setBalance(data)
    } catch (e) {
      setError('Could not fetch Stripe balance. Make sure STRIPE_SECRET_KEY is configured.')
    } finally {
      setLoading(prev => ({ ...prev, balance: false }))
    }
  }

  const fetchPayments = async () => {
    setLoading(prev => ({ ...prev, payments: true }))
    setError(null)
    try {
      const res = await fetch('/api/admin/mcp/stripe/payments')
      if (!res.ok) throw new Error('Failed to fetch payments')
      const data = await res.json()
      setPayments(data.payments || [])
    } catch (e) {
      setError('Could not fetch payments. Make sure STRIPE_SECRET_KEY is configured.')
    } finally {
      setLoading(prev => ({ ...prev, payments: false }))
    }
  }

  const fetchCustomers = async () => {
    setLoading(prev => ({ ...prev, customers: true }))
    setError(null)
    try {
      const res = await fetch('/api/admin/mcp/stripe/customers')
      if (!res.ok) throw new Error('Failed to fetch customers')
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (e) {
      setError('Could not fetch customers. Make sure STRIPE_SECRET_KEY is configured.')
    } finally {
      setLoading(prev => ({ ...prev, customers: false }))
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabId)
    setError(null)
    if (tab === 'overview' && !balance) fetchBalance()
    if (tab === 'payments' && payments.length === 0) fetchPayments()
    if (tab === 'customers' && customers.length === 0) fetchCustomers()
  }

  const filteredPayments = payments.filter(p =>
    !searchQuery ||
    p.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stripeStatusMap: Record<string, string> = {
    succeeded: 'success',
    pending: 'pending',
    failed: 'failed',
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Stripe Dashboard"
        subtitle="Payments, customers & balance via Stripe MCP"
        backHref="/admin/operations"
        action={
          <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
            <AdminButton variant="secondary" size="sm">
              <ExternalLink size={14} />
              Full Dashboard
            </AdminButton>
          </a>
        }
      />

      <div className="mb-6">
        <AdminTabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'payments', label: 'Payments' },
            { id: 'customers', label: 'Customers' },
          ]}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {error && (
        <AdminAlertBanner
          severity="critical"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <AdminButton onClick={fetchBalance} variant="secondary" size="sm" loading={loading.balance}>
              <RefreshCw size={14} />
              Fetch Balance
            </AdminButton>
          </div>

          {loading.balance && <AdminLoadingState label="Fetching balance..." />}

          {!loading.balance && balance && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AdminCard accent accentColor="green">
                <div className="p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(45,90,61,0.1)' }}
                    >
                      <DollarSign size={16} color="#2D5A3D" />
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#78716C',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                      }}
                    >
                      Available Balance
                    </span>
                  </div>
                  {balance.available.map((b, i) => (
                    <div key={i} className="flex items-baseline gap-2">
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          fontSize: 32,
                          color: '#1C1917',
                        }}
                      >
                        {formatCurrency(b.amount, b.currency)}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 10,
                          color: '#A8A29E',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}
                      >
                        {b.currency}
                      </span>
                    </div>
                  ))}
                  {balance.available.length === 0 && (
                    <p style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#78716C' }}>
                      No available balance
                    </p>
                  )}
                </div>
              </AdminCard>

              <AdminCard accent accentColor="gold">
                <div className="p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(196,154,42,0.1)' }}
                    >
                      <Clock size={16} color="#C49A2A" />
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#78716C',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                      }}
                    >
                      Pending Balance
                    </span>
                  </div>
                  {balance.pending.map((b, i) => (
                    <div key={i} className="flex items-baseline gap-2">
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          fontSize: 32,
                          color: '#1C1917',
                        }}
                      >
                        {formatCurrency(b.amount, b.currency)}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 10,
                          color: '#A8A29E',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}
                      >
                        {b.currency}
                      </span>
                    </div>
                  ))}
                  {balance.pending.length === 0 && (
                    <p style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#78716C' }}>
                      No pending balance
                    </p>
                  )}
                </div>
              </AdminCard>
            </div>
          )}

          {!loading.balance && !balance && !error && (
            <AdminEmptyState
              icon={CreditCard}
              title="Connect to Stripe"
              description="Click Fetch Balance to pull your latest Stripe balance data."
              action={
                <AdminButton onClick={fetchBalance} variant="primary" size="sm">
                  Fetch Balance
                </AdminButton>
              }
            />
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#A8A29E' }} />
              <input
                type="text"
                placeholder="Search by email or payment ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input w-full pl-10"
                style={{
                  fontFamily: 'var(--font-system)',
                  fontSize: 12,
                }}
              />
            </div>
            <AdminButton onClick={fetchPayments} variant="secondary" size="sm" loading={loading.payments}>
              <RefreshCw size={14} />
              Refresh
            </AdminButton>
          </div>

          {loading.payments && <AdminLoadingState label="Fetching payments..." />}

          {!loading.payments && filteredPayments.length > 0 && (
            <AdminCard>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(214,208,196,0.5)' }}>
                      {['Customer', 'Amount', 'Status', 'Date'].map(h => (
                        <th
                          key={h}
                          className="text-left px-4 py-3"
                          style={{
                            fontFamily: 'var(--font-system)',
                            fontSize: 9,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '1.5px',
                            color: '#78716C',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-stone-50 transition-colors"
                        style={{ borderBottom: '1px solid rgba(214,208,196,0.3)' }}
                      >
                        <td className="px-4 py-3">
                          <p style={{ fontFamily: 'var(--font-system)', fontSize: 12, fontWeight: 500, color: '#1C1917' }}>
                            {payment.customer_email || 'N/A'}
                          </p>
                          <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', fontVariantNumeric: 'tabular-nums' }}>
                            {payment.id.substring(0, 20)}...
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: 14,
                              fontWeight: 700,
                              color: '#1C1917',
                            }}
                          >
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <AdminStatusBadge status={stripeStatusMap[payment.status] || payment.status} label={payment.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                            {formatDate(payment.created)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          )}

          {!loading.payments && filteredPayments.length === 0 && !error && (
            <AdminEmptyState
              icon={Receipt}
              title="No Payments Found"
              description={payments.length === 0 ? 'Click Refresh to fetch recent payments from Stripe.' : 'No payments match your search.'}
              action={
                payments.length === 0 ? (
                  <AdminButton onClick={fetchPayments} variant="primary" size="sm">
                    Fetch Payments
                  </AdminButton>
                ) : undefined
              }
            />
          )}
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <AdminButton onClick={fetchCustomers} variant="secondary" size="sm" loading={loading.customers}>
              <RefreshCw size={14} />
              Refresh
            </AdminButton>
          </div>

          {loading.customers && <AdminLoadingState label="Fetching customers..." />}

          {!loading.customers && customers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customers.map((customer) => (
                <AdminCard key={customer.id}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'rgba(59,126,161,0.12)' }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 800,
                              fontSize: 14,
                              color: '#3B7EA1',
                            }}
                          >
                            {(customer.name || customer.email || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p style={{ fontFamily: 'var(--font-system)', fontSize: 13, fontWeight: 600, color: '#1C1917' }}>
                            {customer.name || 'No name'}
                          </p>
                          <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                            {customer.email}
                          </p>
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 10,
                          color: '#A8A29E',
                        }}
                      >
                        {formatDate(customer.created)}
                      </span>
                    </div>
                  </div>
                </AdminCard>
              ))}
            </div>
          )}

          {!loading.customers && customers.length === 0 && !error && (
            <AdminEmptyState
              icon={Users}
              title="No Customers Yet"
              description="Click Refresh to fetch customers from Stripe."
              action={
                <AdminButton onClick={fetchCustomers} variant="primary" size="sm">
                  Fetch Customers
                </AdminButton>
              }
            />
          )}
        </div>
      )}
    </div>
  )
}
