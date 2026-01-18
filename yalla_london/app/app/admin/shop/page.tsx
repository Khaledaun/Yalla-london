'use client'

import { useState } from 'react'
import { MophyAdminLayout } from '@/components/admin/mophy/mophy-admin-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Package, Plus, Search, Edit, Trash2, Eye, DollarSign,
  TrendingUp, ShoppingCart, Download, FileText, MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const products = [
  {
    id: '1',
    name: 'Complete London Guide 2026',
    type: 'PDF Guide',
    price: 9.99,
    sales: 234,
    revenue: 2337.66,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=100&q=80'
  },
  {
    id: '2',
    name: 'Halal Restaurant Guide',
    type: 'PDF Guide',
    price: 7.99,
    sales: 156,
    revenue: 1246.44,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&q=80'
  },
  {
    id: '3',
    name: 'London Shopping Secrets',
    type: 'PDF Guide',
    price: 6.99,
    sales: 189,
    revenue: 1321.11,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&q=80'
  },
  {
    id: '4',
    name: 'Family Adventure Pack',
    type: 'Bundle',
    price: 14.99,
    sales: 312,
    revenue: 4676.88,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=100&q=80'
  },
  {
    id: '5',
    name: 'Prayer Times & Mosques Guide',
    type: 'PDF Guide',
    price: 4.99,
    sales: 98,
    revenue: 489.02,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1564769625392-651b89c75a66?w=100&q=80'
  },
]

export default function AdminShopPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0)
  const totalSales = products.reduce((sum, p) => sum + p.sales, 0)
  const activeProducts = products.filter(p => p.status === 'active').length

  return (
    <MophyAdminLayout pageTitle="Shop & Products">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop & Products</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage digital products and PDF guides for sale
            </p>
          </div>
          <Button className="bg-[#1A1F36] hover:bg-[#2d3452]">
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
                <div className="text-2xl font-bold">£{totalRevenue.toFixed(2)}</div>
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
                <div className="text-2xl font-bold">{totalSales}</div>
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
                <div className="text-2xl font-bold">{activeProducts}</div>
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
                <div className="text-2xl font-bold">+23%</div>
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
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary">{product.type}</Badge>
                    </td>
                    <td className="p-4 font-medium">£{product.price}</td>
                    <td className="p-4">{product.sales}</td>
                    <td className="p-4 font-medium text-green-600">£{product.revenue.toFixed(2)}</td>
                    <td className="p-4">
                      <Badge className="bg-green-500">Active</Badge>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                          <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem><Download className="w-4 h-4 mr-2" /> Download</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
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
