'use client'

import { useState } from 'react'
import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  CreditCard, Search, Download, DollarSign, TrendingUp,
  ArrowUpRight, ArrowDownRight, Filter, Calendar
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

  return (
    <MophyAdminLayout pageTitle="Transactions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Track all purchases and payment activity
            </p>
          </div>
          <Button
            variant="outline"
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
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">£{totalRevenue.toFixed(2)}</div>
                <div className="text-sm text-gray-500">Total Revenue</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold">£{todayRevenue}</span>
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-sm text-gray-500">Today</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{transactions.length}</div>
                <div className="text-sm text-gray-500">Total Transactions</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">£{pendingAmount.toFixed(2)}</div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by customer, email, or transaction ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setSearchQuery(searchQuery === '' ? 'completed' : '')}
              >
                <Filter className="w-4 h-4 mr-2" /> {searchQuery === 'completed' ? 'Show All' : 'Completed'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="p-4 font-mono text-sm">{txn.id}</td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{txn.customer}</div>
                        <div className="text-sm text-gray-500">{txn.email}</div>
                      </div>
                    </td>
                    <td className="p-4">{txn.product}</td>
                    <td className="p-4 font-medium">£{txn.amount}</td>
                    <td className="p-4">
                      <Badge className={
                        txn.status === 'completed' ? 'bg-green-500' :
                        txn.status === 'pending' ? 'bg-amber-500' :
                        'bg-red-500'
                      }>
                        {txn.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{txn.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </MophyAdminLayout>
  )
}
