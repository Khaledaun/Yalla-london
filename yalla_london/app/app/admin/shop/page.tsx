'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  AdminPageHeader,
  AdminCard,
  AdminKPICard,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminSectionLabel,
} from '@/components/admin/admin-ui'
import {
  Package, Plus, Search, Edit, Trash2, Eye, DollarSign,
  TrendingUp, ShoppingCart, Download, MoreHorizontal,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'

interface ProductStat {
  id: string
  name: string
  name_ar?: string
  slug: string
  type: string
  price: number
  currency: string
  image: string | null
  is_active: boolean
  totalPurchases: number
  completedSales: number
  revenue: number
}

interface RecentOrder {
  id: string
  product: string
  customer: string
  amount: number
  currency: string
  date: string
}

interface ShopStats {
  totalRevenue: number
  totalSales: number
  activeProducts: number
  monthlyGrowth: number
  thisMonthRevenue: number
}

export default function AdminShopPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ShopStats>({
    totalRevenue: 0, totalSales: 0, activeProducts: 0, monthlyGrowth: 0, thisMonthRevenue: 0,
  })
  const [products, setProducts] = useState<ProductStat[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/shop/stats')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setStats(data.stats)
        setProducts(data.products)
        setRecentOrders(data.recentOrders)
      })
      .catch((err) => {
        console.error('Failed to fetch shop stats:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredProducts = products.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sym = (c: string) => c === 'GBP' ? '\u00A3' : c === 'USD' ? '$' : c + ' '

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Shop & Products"
        subtitle="Manage digital products and track revenue"
        action={
          <AdminButton
            variant="primary"
            onClick={() => { window.location.href = '/admin/command-center/products/pdf' }}
          >
            <Plus size={14} /> Add Product
          </AdminButton>
        }
      />

      {/* KPI Cards */}
      {loading ? (
        <AdminLoadingState label="Loading shop data..." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <AdminKPICard
              value={`\u00A3${stats.totalRevenue.toFixed(2)}`}
              label="Total Revenue"
              color="#2D5A3D"
            />
            <AdminKPICard
              value={stats.totalSales}
              label="Total Sales"
              color="#3B7EA1"
            />
            <AdminKPICard
              value={stats.activeProducts}
              label="Active Products"
              color="#1C1917"
            />
            <AdminKPICard
              value={`${stats.monthlyGrowth >= 0 ? '+' : ''}${stats.monthlyGrowth}%`}
              label="This Month"
              color={stats.monthlyGrowth >= 0 ? '#2D5A3D' : '#C8322B'}
              trend={{ value: Math.abs(stats.monthlyGrowth), positive: stats.monthlyGrowth >= 0 }}
            />
          </div>

          {/* Search */}
          <AdminCard className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#A8A29E' }} />
              <input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input pl-10 w-full"
              />
            </div>
          </AdminCard>

          {/* Products Table */}
          <AdminCard className="mb-6">
            <AdminSectionLabel>Products</AdminSectionLabel>
            {filteredProducts.length === 0 ? (
              <AdminEmptyState
                icon={Package}
                title="No products found"
                description="Add your first digital product to start selling."
                action={
                  <AdminButton variant="primary" onClick={() => { window.location.href = '/admin/command-center/products/pdf' }}>
                    <Plus size={14} /> Add Product
                  </AdminButton>
                }
              />
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full" style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(214,208,196,0.5)' }}>
                      {['Product', 'Type', 'Price', 'Sales', 'Revenue', 'Status', ''].map(h => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left"
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
                    {filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="transition-colors hover:bg-stone-50/50"
                        style={{ borderBottom: '1px solid rgba(214,208,196,0.3)' }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={40}
                                height={40}
                                className="rounded-lg object-cover"
                                style={{ width: 40, height: 40 }}
                                unoptimized
                              />
                            ) : (
                              <div
                                className="rounded-lg flex items-center justify-center"
                                style={{ width: 40, height: 40, backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.6)' }}
                              >
                                <Package size={18} color="#A8A29E" />
                              </div>
                            )}
                            <span style={{ fontWeight: 600, color: '#1C1917', fontSize: 12 }}>{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <AdminStatusBadge status="pending" label={product.type.replace('_', ' ')} />
                        </td>
                        <td className="px-4 py-3" style={{ fontWeight: 600, color: '#1C1917' }}>
                          {sym(product.currency)}{product.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3" style={{ color: '#44403C' }}>
                          {product.completedSales}
                        </td>
                        <td className="px-4 py-3" style={{ fontWeight: 600, color: '#2D5A3D' }}>
                          {sym(product.currency)}{product.revenue.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <AdminStatusBadge status={product.is_active ? 'active' : 'inactive'} />
                        </td>
                        <td className="px-4 py-3 relative">
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpenMenuId(openMenuId === product.id ? null : product.id)}
                          >
                            <MoreHorizontal size={14} />
                          </AdminButton>
                          {openMenuId === product.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div
                                className="absolute right-4 top-full z-20 rounded-xl py-1 min-w-[160px]"
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid rgba(214,208,196,0.8)',
                                  boxShadow: '0 8px 24px rgba(28,25,23,0.10)',
                                }}
                              >
                                {[
                                  { icon: Eye, label: 'View', onClick: () => window.open(`/${product.slug}`, '_blank') },
                                  { icon: Edit, label: 'Edit', onClick: () => { window.location.href = `/admin/command-center/products/pdf?id=${product.id}` } },
                                  { icon: Download, label: 'Download', onClick: () => window.open(`/api/admin/shop/download?id=${product.id}`, '_blank') },
                                ].map(item => (
                                  <button
                                    key={item.label}
                                    onClick={() => { item.onClick(); setOpenMenuId(null) }}
                                    className="flex items-center gap-2 w-full px-3 py-2 transition-colors hover:bg-stone-50"
                                    style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#44403C' }}
                                  >
                                    <item.icon size={13} /> {item.label}
                                  </button>
                                ))}
                                <div style={{ borderTop: '1px solid rgba(214,208,196,0.5)', margin: '2px 0' }} />
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Delete "${product.name}"?`)) return
                                    const res = await fetch(`/api/admin/shop?id=${product.id}`, { method: 'DELETE' })
                                    if (res.ok) setProducts(prev => prev.filter(p => p.id !== product.id))
                                    setOpenMenuId(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 transition-colors hover:bg-red-50"
                                  style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#C8322B' }}
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          {/* Recent Orders */}
          {recentOrders.length > 0 && (
            <AdminCard>
              <AdminSectionLabel>Recent Orders</AdminSectionLabel>
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full" style={{ fontFamily: 'var(--font-system)', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(214,208,196,0.5)' }}>
                      {['Product', 'Customer', 'Amount', 'Date'].map(h => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left"
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
                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="transition-colors hover:bg-stone-50/50"
                        style={{ borderBottom: '1px solid rgba(214,208,196,0.3)' }}
                      >
                        <td className="px-4 py-3" style={{ fontWeight: 600, color: '#1C1917' }}>{order.product}</td>
                        <td className="px-4 py-3" style={{ color: '#78716C' }}>{order.customer}</td>
                        <td className="px-4 py-3" style={{ fontWeight: 600, color: '#2D5A3D' }}>
                          {sym(order.currency)}{order.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3" style={{ color: '#78716C' }}>
                          {new Date(order.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          )}
        </>
      )}
    </div>
  )
}
