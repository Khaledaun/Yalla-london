'use client'

import { useState } from 'react'
import {
  Landmark, DollarSign, ArrowUpRight, ArrowDownRight,
  RefreshCw, Clock, ExternalLink, Wallet, Building2
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
  AdminSectionLabel,
} from '@/components/admin/admin-ui'

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
    const sym = currency === 'GBP' ? '\u00A3' : currency === 'USD' ? '$' : currency === 'EUR' ? '\u20AC' : currency + ' '
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabId)
    setError(null)
    if (tab === 'accounts' && accounts.length === 0) fetchAccounts()
    if (tab === 'transactions' && transactions.length === 0) fetchTransactions()
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0)

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Mercury Bank"
        subtitle="Account balances & transactions via Mercury MCP"
        backHref="/admin/operations"
        action={
          <a href="https://app.mercury.com" target="_blank" rel="noopener noreferrer">
            <AdminButton variant="secondary" size="sm">
              <ExternalLink size={14} />
              Open Mercury
            </AdminButton>
          </a>
        }
      />

      {/* Summary KPIs (shows after fetch) */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <AdminKPICard
            value={formatCurrency(totalBalance)}
            label="Total Balance"
            color="#2D5A3D"
          />
          <AdminKPICard
            value={accounts.length}
            label="Accounts"
            color="#3B7EA1"
          />
          <AdminCard className="flex items-center justify-center p-4">
            <AdminStatusBadge status="active" label="Connected" />
          </AdminCard>
        </div>
      )}

      <div className="mb-6">
        <AdminTabs
          tabs={[
            { id: 'accounts', label: 'Accounts' },
            { id: 'transactions', label: 'Transactions' },
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

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <AdminButton onClick={fetchAccounts} variant="secondary" size="sm" loading={loading.accounts}>
              <RefreshCw size={14} />
              Fetch Accounts
            </AdminButton>
          </div>

          {loading.accounts && <AdminLoadingState label="Fetching accounts..." />}

          {!loading.accounts && accounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((account) => (
                <AdminCard key={account.id} accent accentColor="blue">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(59,126,161,0.1)' }}
                        >
                          <Wallet size={16} color="#3B7EA1" />
                        </div>
                        <div>
                          <p style={{ fontFamily: 'var(--font-system)', fontSize: 13, fontWeight: 600, color: '#1C1917' }}>
                            {account.name}
                          </p>
                          <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E', textTransform: 'capitalize' }}>
                            {account.type}
                          </p>
                        </div>
                      </div>
                      <AdminStatusBadge status={account.status === 'active' ? 'active' : 'inactive'} />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <AdminSectionLabel>Current Balance</AdminSectionLabel>
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: 26,
                            color: '#1C1917',
                          }}
                        >
                          {formatCurrency(account.current_balance, account.currency)}
                        </span>
                      </div>
                      <div>
                        <AdminSectionLabel>Available Balance</AdminSectionLabel>
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: 18,
                            color: '#44403C',
                          }}
                        >
                          {formatCurrency(account.available_balance, account.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </AdminCard>
              ))}
            </div>
          )}

          {!loading.accounts && accounts.length === 0 && !error && (
            <AdminEmptyState
              icon={Landmark}
              title="Connect to Mercury"
              description="Click Fetch Accounts to pull your Mercury bank account data."
              action={
                <AdminButton onClick={fetchAccounts} variant="primary" size="sm">
                  Fetch Accounts
                </AdminButton>
              }
            />
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <AdminButton onClick={fetchTransactions} variant="secondary" size="sm" loading={loading.transactions}>
              <RefreshCw size={14} />
              Refresh
            </AdminButton>
          </div>

          {loading.transactions && <AdminLoadingState label="Fetching transactions..." />}

          {!loading.transactions && transactions.length > 0 && (
            <AdminCard>
              <div className="divide-y" style={{ borderColor: 'rgba(214,208,196,0.4)' }}>
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: tx.direction === 'credit'
                            ? 'rgba(45,90,61,0.1)'
                            : 'rgba(200,50,43,0.08)',
                        }}
                      >
                        {tx.direction === 'credit' ? (
                          <ArrowDownRight size={16} color="#2D5A3D" />
                        ) : (
                          <ArrowUpRight size={16} color="#C8322B" />
                        )}
                      </div>
                      <div>
                        <p style={{ fontFamily: 'var(--font-system)', fontSize: 12, fontWeight: 500, color: '#1C1917' }}>
                          {tx.counterparty_name || tx.description || 'Transaction'}
                        </p>
                        <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: 14,
                          color: tx.direction === 'credit' ? '#2D5A3D' : '#C8322B',
                        }}
                      >
                        {tx.direction === 'credit' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                      </span>
                      <AdminStatusBadge
                        status={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'pending' : tx.status}
                        label={tx.status}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}

          {!loading.transactions && transactions.length === 0 && !error && (
            <AdminEmptyState
              icon={Clock}
              title="No Transactions"
              description="Click Refresh to fetch recent transactions from Mercury."
              action={
                <AdminButton onClick={fetchTransactions} variant="primary" size="sm">
                  Fetch Transactions
                </AdminButton>
              }
            />
          )}
        </div>
      )}
    </div>
  )
}
