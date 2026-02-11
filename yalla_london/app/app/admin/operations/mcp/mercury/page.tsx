'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Landmark, ArrowLeft, DollarSign, ArrowUpRight, ArrowDownRight,
  RefreshCw, Loader2, AlertTriangle, CheckCircle,
  TrendingUp, Clock, ExternalLink, Wallet, Building2
} from 'lucide-react'

interface MercuryAccount {
  id: string
  name: string
  type: string
  current_balance: number
  available_balance: number
  currency: string
  status: string
}

interface MercuryTransaction {
  id: string
  amount: number
  currency: string
  direction: 'credit' | 'debit'
  status: string
  counterparty_name: string
  description: string
  created_at: string
}

type TabId = 'accounts' | 'transactions'

export default function MercuryMCPPage() {
  const [activeTab, setActiveTab] = useState<TabId>('accounts')
  const [accounts, setAccounts] = useState<MercuryAccount[]>([])
  const [transactions, setTransactions] = useState<MercuryTransaction[]>([])
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (amount: number, currency = 'USD') => {
    const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency + ' '
    return `${sym}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  const fetchAccounts = async () => {
    setLoading(prev => ({ ...prev, accounts: true }))
    setError(null)
    try {
      const res = await fetch('/api/admin/mcp/mercury/accounts')
      if (!res.ok) throw new Error('Failed to fetch accounts')
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch {
      setError('Could not fetch Mercury accounts. Make sure MERCURY_API_KEY is configured.')
    } finally {
      setLoading(prev => ({ ...prev, accounts: false }))
    }
  }

  const fetchTransactions = async () => {
    setLoading(prev => ({ ...prev, transactions: true }))
    setError(null)
    try {
      const res = await fetch('/api/admin/mcp/mercury/transactions')
      if (!res.ok) throw new Error('Failed to fetch transactions')
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch {
      setError('Could not fetch transactions. Make sure MERCURY_API_KEY is configured.')
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }))
    }
  }

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    setError(null)
    if (tab === 'accounts' && accounts.length === 0) fetchAccounts()
    if (tab === 'transactions' && transactions.length === 0) fetchTransactions()
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0)

  return (
    <MophyAdminLayout pageTitle="Mercury Bank MCP">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/operations" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
                  <Landmark className="w-6 h-6 text-white" />
                </div>
                Mercury Bank
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                View account balances and transactions via Mercury MCP
              </p>
            </div>
          </div>
          <a
            href="https://app.mercury.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Mercury
            </Button>
          </a>
        </div>

        {/* Summary card (shows after fetch) */}
        {accounts.length > 0 && (
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Balance</p>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalBalance)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Accounts</p>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {accounts.length}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <Badge className="bg-green-100 text-green-700 text-sm">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Connected
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
          {[
            { id: 'accounts' as const, label: 'Accounts', icon: Building2 },
            { id: 'transactions' as const, label: 'Recent Transactions', icon: ArrowUpRight },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
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

        {/* ── Accounts Tab ── */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={fetchAccounts} variant="outline" size="sm" disabled={loading.accounts}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading.accounts ? 'animate-spin' : ''}`} />
                Fetch Accounts
              </Button>
            </div>

            {loading.accounts && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            )}

            {!loading.accounts && accounts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.map((account) => (
                  <Card key={account.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Wallet className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{account.name}</h3>
                            <p className="text-xs text-gray-500 capitalize">{account.type}</p>
                          </div>
                        </div>
                        <Badge className={account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                          {account.status}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500">Current Balance</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(account.current_balance, account.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Available Balance</p>
                          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                            {formatCurrency(account.available_balance, account.currency)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading.accounts && accounts.length === 0 && !error && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Landmark className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Connect to Mercury</h3>
                  <p className="text-gray-500 mb-4">Click &quot;Fetch Accounts&quot; to pull your Mercury bank account data.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Transactions Tab ── */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={fetchTransactions} variant="outline" size="sm" disabled={loading.transactions}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading.transactions ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loading.transactions && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            )}

            {!loading.transactions && transactions.length > 0 && (
              <Card>
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tx.direction === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {tx.direction === 'credit' ? (
                            <ArrowDownRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {tx.counterparty_name || tx.description || 'Transaction'}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${tx.direction === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.direction === 'credit' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                        </p>
                        <Badge variant="secondary" className="text-xs capitalize">{tx.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {!loading.transactions && transactions.length === 0 && !error && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No Transactions</h3>
                  <p className="text-gray-500">Click Refresh to fetch recent transactions from Mercury.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MophyAdminLayout>
  )
}
