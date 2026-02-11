'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CreditCard, ArrowLeft, DollarSign, Users, Receipt,
  RefreshCw, Loader2, AlertTriangle, CheckCircle,
  TrendingUp, Clock, ExternalLink, Search, ArrowUpDown
} from 'lucide-react'

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
    const sym = currency === 'gbp' ? '£' : currency === 'usd' ? '$' : currency === 'eur' ? '€' : currency.toUpperCase() + ' '
    return `${sym}${(amount / 100).toFixed(2)}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const statusColor = (status: string) => {
    if (status === 'succeeded') return 'bg-green-100 text-green-700'
    if (status === 'pending') return 'bg-amber-100 text-amber-700'
    if (status === 'failed') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-600'
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

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
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

  return (
    <MophyAdminLayout pageTitle="Stripe MCP">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/operations" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                Stripe Dashboard
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                View payments, customers, and balance via Stripe MCP
              </p>
            </div>
          </div>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Full Dashboard
            </Button>
          </a>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
          {[
            { id: 'overview' as const, label: 'Overview', icon: TrendingUp },
            { id: 'payments' as const, label: 'Recent Payments', icon: Receipt },
            { id: 'customers' as const, label: 'Customers', icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={fetchBalance} variant="outline" size="sm" disabled={loading.balance}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading.balance ? 'animate-spin' : ''}`} />
                Fetch Balance
              </Button>
            </div>

            {loading.balance && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            )}

            {!loading.balance && balance && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Available Balance</h3>
                    </div>
                    {balance.available.map((b, i) => (
                      <div key={i} className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(b.amount, b.currency)}
                        </span>
                        <span className="text-sm text-gray-500 uppercase">{b.currency}</span>
                      </div>
                    ))}
                    {balance.available.length === 0 && (
                      <p className="text-gray-500">No available balance</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Pending Balance</h3>
                    </div>
                    {balance.pending.map((b, i) => (
                      <div key={i} className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(b.amount, b.currency)}
                        </span>
                        <span className="text-sm text-gray-500 uppercase">{b.currency}</span>
                      </div>
                    ))}
                    {balance.pending.length === 0 && (
                      <p className="text-gray-500">No pending balance</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {!loading.balance && !balance && !error && (
              <Card>
                <CardContent className="p-12 text-center">
                  <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Connect to Stripe</h3>
                  <p className="text-gray-500 mb-4">Click &quot;Fetch Balance&quot; to pull your latest Stripe balance data.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Payments Tab ── */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email or payment ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
                />
              </div>
              <Button onClick={fetchPayments} variant="outline" size="sm" disabled={loading.payments}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading.payments ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loading.payments && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            )}

            {!loading.payments && filteredPayments.length > 0 && (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((payment) => (
                        <tr key={payment.id} className="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{payment.customer_email || 'N/A'}</p>
                            <p className="text-xs text-gray-500 font-mono">{payment.id.substring(0, 20)}...</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(payment.amount, payment.currency)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={statusColor(payment.status)}>
                              {payment.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-500">{formatDate(payment.created)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {!loading.payments && filteredPayments.length === 0 && !error && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No Payments Found</h3>
                  <p className="text-gray-500">
                    {payments.length === 0 ? 'Click Refresh to fetch recent payments from Stripe.' : 'No payments match your search.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Customers Tab ── */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={fetchCustomers} variant="outline" size="sm" disabled={loading.customers}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading.customers ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loading.customers && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            )}

            {!loading.customers && customers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customers.map((customer) => (
                  <Card key={customer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {(customer.name || customer.email || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{customer.name || 'No name'}</p>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {formatDate(customer.created)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading.customers && customers.length === 0 && !error && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No Customers Yet</h3>
                  <p className="text-gray-500">Click Refresh to fetch customers from Stripe.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MophyAdminLayout>
  )
}
