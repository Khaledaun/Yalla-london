'use client'

import { useState, useEffect } from 'react'
import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Package, Plus, Search, Edit, Trash2, Eye, DollarSign,
  TrendingUp, ShoppingCart, Download, MoreHorizontal, Loader2,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

  const sym = (c: string) => c === 'GBP' ? '£' : c === 'USD' ? '$' : c + ' '

  return (
    <MophyAdminLayout pageTitle="Shop & Products">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop & Products</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage digital products and track revenue
            </p>
          </div>
          <Button
            className="bg-[#1C1917] hover:bg-[#3D3835]"
            onClick={() => { window.location.href = '/admin/command-center/products/pdf'; }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Product
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
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <div className="text-2xl font-bold">£{stats.totalRevenue.toFixed(2)}</div>
                )}
                <div className="text-sm text-gray-500">Total Revenue</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <div className="text-2xl font-bold">{stats.totalSales}</div>
                )}
                <div className="text-sm text-gray-500">Total Sales</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <div className="text-2xl font-bold">{stats.activeProducts}</div>
                )}
                <div className="text-sm text-gray-500">Active Products</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-bold">
                      {stats.monthlyGrowth >= 0 ? '+' : ''}{stats.monthlyGrowth}%
                    </span>
                    {stats.monthlyGrowth >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                )}
                <div className="text-sm text-gray-500">This Month</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading products...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No products found. Add your first digital product to start selling.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">{product.type.replace('_', ' ')}</Badge>
                      </td>
                      <td className="p-4 font-medium">{sym(product.currency)}{product.price.toFixed(2)}</td>
                      <td className="p-4">{product.completedSales}</td>
                      <td className="p-4 font-medium text-green-600">
                        {sym(product.currency)}{product.revenue.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <Badge className={product.is_active ? 'bg-green-500' : 'bg-gray-400'}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(`/${product.slug}`, '_blank')}><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { window.location.href = `/admin/command-center/products/pdf?id=${product.id}`; }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`/api/admin/shop/download?id=${product.id}`, '_blank')}><Download className="w-4 h-4 mr-2" /> Download</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={async () => {
                              if (!confirm(`Delete "${product.name}"?`)) return;
                              const res = await fetch(`/api/admin/shop?id=${product.id}`, { method: 'DELETE' });
                              if (res.ok) setProducts(prev => prev.filter(p => p.id !== product.id));
                            }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">Recent Orders</h3>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="p-4 font-medium">{order.product}</td>
                      <td className="p-4 text-gray-500">{order.customer}</td>
                      <td className="p-4 font-medium text-green-600">
                        {sym(order.currency)}{order.amount.toFixed(2)}
                      </td>
                      <td className="p-4 text-gray-500">
                        {new Date(order.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </MophyAdminLayout>
  )
}
