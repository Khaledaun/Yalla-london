'use client'

import { useState } from 'react'
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminStatusBadge,
  AdminButton,
  AdminKPICard,
} from '@/components/admin/admin-ui'
import {
  CreditCard, Search, Download, DollarSign, TrendingUp,
  ArrowUpRight, Filter, Calendar
} from 'lucide-react'

const transactions = [
  {
    id: 'TXN-001',
    customer: 'Ahmed Al-Hassan',
    email: 'ahmed@example.com',
    product: 'Complete London Guide 2026',
    amount: 9.99,
    status: 'completed',
    date: '2026-01-18 14:32'
  },
  {
    id: 'TXN-002',
    customer: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    product: 'Family Adventure Pack',
    amount: 14.99,
    status: 'completed',
    date: '2026-01-18 12:15'
  },
  {
    id: 'TXN-003',
    customer: 'Mohammed Ali',
    email: 'mali@example.com',
    product: 'Halal Restaurant Guide',
    amount: 7.99,
    status: 'completed',
    date: '2026-01-17 18:45'
  },
  {
    id: 'TXN-004',
    customer: 'Emma Williams',
    email: 'emma.w@example.com',
    product: 'London Shopping Secrets',
    amount: 6.99,
    status: 'pending',
    date: '2026-01-17 16:20'
  },
  {
    id: 'TXN-005',
    customer: 'Khalid Rahman',
    email: 'khalid.r@example.com',
    product: 'Ultimate London Bundle',
    amount: 29.99,
    status: 'completed',
    date: '2026-01-17 11:08'
  },
  {
    id: 'TXN-006',
    customer: 'Lisa Chen',
    email: 'lisa.c@example.com',
    product: 'Prayer Times & Mosques Guide',
    amount: 4.99,
    status: 'refunded',
    date: '2026-01-16 09:30'
  },
]

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const totalRevenue = transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0)
  const todayRevenue = 24.98
  const pendingAmount = transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0)

  const filteredTransactions = searchQuery
    ? transactions.filter(t =>
        t.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.status.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transactions

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Transactions"
        subtitle="Track all purchases and payment activity"
        action={
          <AdminButton
            size="sm"
            onClick={() => {
              const csv = ['ID,Customer,Email,Product,Amount,Status,Date', ...transactions.map(t =>
                `"${t.id}","${t.customer}","${t.email}","${t.product}","${t.amount}","${t.status}","${t.date}"`
              )].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </AdminButton>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <AdminKPICard
          value={`\u00A3${totalRevenue.toFixed(2)}`}
          label="Total Revenue"
          color="#2D5A3D"
        />
        <AdminKPICard
          value={`\u00A3${todayRevenue}`}
          label="Today"
          color="#3B7EA1"
          trend={{ value: 12, positive: true }}
        />
        <AdminKPICard
          value={String(transactions.length)}
          label="Total Transactions"
          color="#C49A2A"
        />
        <AdminKPICard
          value={`\u00A3${pendingAmount.toFixed(2)}`}
          label="Pending"
          color="#C8322B"
        />
      </div>

      {/* Filters */}
      <AdminCard className="mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#A8A29E' }} />
            <input
              className="admin-input pl-10"
              placeholder="Search by customer, email, or transaction ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <AdminButton
            onClick={() => setSearchQuery(searchQuery === 'completed' ? '' : 'completed')}
          >
            <Filter className="w-3.5 h-3.5" />
            {searchQuery === 'completed' ? 'Show All' : 'Completed'}
          </AdminButton>
        </div>
      </AdminCard>

      {/* Transactions Table — Desktop */}
      <AdminCard className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(214,208,196,0.5)' }}>
                {['Transaction ID', 'Customer', 'Product', 'Amount', 'Status', 'Date'].map((h) => (
                  <th
                    key={h}
                    className="p-3 text-left"
                    style={{
                      fontFamily: 'var(--font-system)',
                      fontSize: 9,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      color: '#A8A29E',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((txn) => (
                <tr
                  key={txn.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid rgba(214,208,196,0.3)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF8F4')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td className="p-3">
                    <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, fontWeight: 600, color: '#3B7EA1', letterSpacing: '0.5px' }}>
                      {txn.id}
                    </span>
                  </td>
                  <td className="p-3">
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: '#1C1917' }}>
                        {txn.customer}
                      </div>
                      <div style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                        {txn.email}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span style={{ fontFamily: 'var(--font-system)', fontSize: 12, color: '#44403C' }}>
                      {txn.product}
                    </span>
                  </td>
                  <td className="p-3">
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1C1917' }}>
                      {'\u00A3'}{txn.amount}
                    </span>
                  </td>
                  <td className="p-3">
                    <AdminStatusBadge
                      status={
                        txn.status === 'completed' ? 'success' :
                        txn.status === 'pending' ? 'pending' :
                        'error'
                      }
                      label={txn.status}
                    />
                  </td>
                  <td className="p-3">
                    <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                      {txn.date}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Transactions Cards — Mobile */}
      <div className="md:hidden space-y-2">
        {filteredTransactions.map((txn) => (
          <AdminCard key={txn.id}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: '#1C1917' }}>
                  {txn.customer}
                </span>
                <p style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                  {txn.email}
                </p>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#1C1917' }}>
                {'\u00A3'}{txn.amount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AdminStatusBadge
                  status={
                    txn.status === 'completed' ? 'success' :
                    txn.status === 'pending' ? 'pending' :
                    'error'
                  }
                  label={txn.status}
                />
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
                  {txn.id}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C' }}>
                {txn.date}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C', marginTop: 6 }}>
              {txn.product}
            </p>
          </AdminCard>
        ))}
      </div>
    </div>
  )
}
