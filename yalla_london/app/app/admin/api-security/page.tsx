'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield,
  Key,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  Lock,
  Unlock,
  Globe,
  Database,
  Bot,
  Settings,
  Activity,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface APIKey {
  id: string
  name: string
  service: string
  key: string
  status: 'active' | 'inactive' | 'expired'
  createdAt: string
  lastUsed: string
  usage: {
    calls: number
    limit: number
    cost: number
  }
  permissions: string[]
  description: string
}

interface SecurityStatus {
  sslCertificate: 'valid' | 'expiring' | 'invalid'
  firewall: 'active' | 'inactive'
  backupStatus: 'daily' | 'weekly' | 'failed'
  securityScan: 'passed' | 'warning' | 'failed'
  lastScan: string
  vulnerabilities: number
}

interface UsageAnalytics {
  totalCalls: number
  totalCost: number
  topServices: { service: string; calls: number; cost: number }[]
  monthlyUsage: number[]
  costTrend: number[]
}

export default function APISecurity() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: '1',
      name: 'OpenAI GPT-4',
      service: 'OpenAI',
      key: 'sk-...***...abc123',
      status: 'active',
      createdAt: '2024-01-01',
      lastUsed: '2024-01-15 14:30:00',
      usage: {
        calls: 1247,
        limit: 10000,
        cost: 45.67
      },
      permissions: ['text-generation', 'completion'],
      description: 'Primary AI service for content generation and analysis'
    },
    {
      id: '2',
      name: 'Google Analytics',
      service: 'Google',
      key: 'GA-***-***-***',
      status: 'active',
      createdAt: '2024-01-01',
      lastUsed: '2024-01-15 12:00:00',
      usage: {
        calls: 892,
        limit: 100000,
        cost: 0
      },
      permissions: ['analytics', 'reporting'],
      description: 'Website analytics and user behavior tracking'
    },
    {
      id: '3',
      name: 'Supabase Database',
      service: 'Supabase',
      key: 'sb-***-***-***',
      status: 'active',
      createdAt: '2024-01-01',
      lastUsed: '2024-01-15 13:45:00',
      usage: {
        calls: 5892,
        limit: 50000,
        cost: 12.34
      },
      permissions: ['database', 'auth', 'storage'],
      description: 'Primary database and authentication service'
    },
    {
      id: '4',
      name: 'Claude AI',
      service: 'Anthropic',
      key: 'claude-***-***-***',
      status: 'inactive',
      createdAt: '2024-01-10',
      lastUsed: '2024-01-12 10:15:00',
      usage: {
        calls: 234,
        limit: 5000,
        cost: 8.90
      },
      permissions: ['text-generation', 'analysis'],
      description: 'Alternative AI service for content writing'
    }
  ])

  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    sslCertificate: 'valid',
    firewall: 'active',
    backupStatus: 'daily',
    securityScan: 'passed',
    lastScan: '2024-01-15 02:00:00',
    vulnerabilities: 0
  })

  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics>({
    totalCalls: 8265,
    totalCost: 66.91,
    topServices: [
      { service: 'Supabase', calls: 5892, cost: 12.34 },
      { service: 'OpenAI', calls: 1247, cost: 45.67 },
      { service: 'Google Analytics', calls: 892, cost: 0 },
      { service: 'Claude AI', calls: 234, cost: 8.90 }
    ],
    monthlyUsage: [4500, 5200, 6100, 7200, 8265, 0, 0, 0, 0, 0, 0, 0],
    costTrend: [25.50, 32.80, 41.20, 52.10, 66.91, 0, 0, 0, 0, 0, 0, 0]
  })

  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null)
  const [isAddingKey, setIsAddingKey] = useState(false)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const regenerateKey = async (keyId: string) => {
    try {
      // Simulate API key regeneration
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setApiKeys(prev => prev.map(key => 
        key.id === keyId 
          ? { ...key, key: key.key.replace(/sk-.*/, 'sk-***NEW***'), lastUsed: new Date().toISOString() }
          : key
      ))
      
      toast.success('API key regenerated successfully!')
    } catch (error) {
      toast.error('Failed to regenerate API key')
    }
  }

  const toggleKeyStatus = async (keyId: string) => {
    try {
      setApiKeys(prev => prev.map(key => 
        key.id === keyId 
          ? { ...key, status: key.status === 'active' ? 'inactive' : 'active' }
          : key
      ))
      
      toast.success('API key status updated!')
    } catch (error) {
      toast.error('Failed to update API key status')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'inactive':
        return <Badge className="bg-gray-500">Inactive</Badge>
      case 'expired':
        return <Badge className="bg-red-500">Expired</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getSecurityStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
      case 'active':
      case 'daily':
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'expiring':
      case 'weekly':
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'invalid':
      case 'inactive':
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 'openai':
        return <Bot className="h-4 w-4 text-green-500" />
      case 'google':
        return <Globe className="h-4 w-4 text-blue-500" />
      case 'supabase':
        return <Database className="h-4 w-4 text-purple-500" />
      case 'anthropic':
        return <Bot className="h-4 w-4 text-orange-500" />
      default:
        return <Key className="h-4 w-4 text-gray-500" />
    }
  }

  const getUsagePercentage = (calls: number, limit: number) => {
    return Math.min((calls / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="h-8 w-8 text-purple-500" />
                API & Security
              </h1>
              <p className="text-gray-600 mt-1">Manage API keys and security settings</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Security Scan
              </Button>
              <Button className="bg-purple-500 hover:bg-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Add API Key
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Security Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">SSL Certificate</p>
                  <p className="text-2xl font-bold capitalize">{securityStatus.sslCertificate}</p>
                </div>
                {getSecurityStatusIcon(securityStatus.sslCertificate)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Firewall</p>
                  <p className="text-2xl font-bold capitalize">{securityStatus.firewall}</p>
                </div>
                {getSecurityStatusIcon(securityStatus.firewall)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Backup Status</p>
                  <p className="text-2xl font-bold capitalize">{securityStatus.backupStatus}</p>
                </div>
                {getSecurityStatusIcon(securityStatus.backupStatus)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Security Scan</p>
                  <p className="text-2xl font-bold capitalize">{securityStatus.securityScan}</p>
                </div>
                {getSecurityStatusIcon(securityStatus.securityScan)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="security">Security Status</TabsTrigger>
            <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* API Keys List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">API Keys Management</h3>
                  <Button
                    onClick={() => setIsAddingKey(true)}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Key
                  </Button>
                </div>
                {apiKeys.map((key) => (
                  <Card 
                    key={key.id} 
                    className={`cursor-pointer transition-all ${
                      selectedKey?.id === key.id ? 'ring-2 ring-purple-500' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedKey(key)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getServiceIcon(key.service)}
                            <h4 className="font-medium text-gray-900">{key.name}</h4>
                            {getStatusBadge(key.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{key.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Service: {key.service}</span>
                            <span>Last used: {key.lastUsed}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {key.permissions.slice(0, 3).map((permission) => (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {key.usage.calls.toLocaleString()} calls
                          </div>
                          <div className="text-xs text-gray-500">
                            £{key.usage.cost.toFixed(2)} cost
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* API Key Details */}
              <div>
                {selectedKey ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        API Key Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        {getServiceIcon(selectedKey.service)}
                        <div>
                          <h3 className="text-xl font-bold">{selectedKey.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">{selectedKey.service}</span>
                            {getStatusBadge(selectedKey.status)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>API Key</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={showKeys[selectedKey.id] ? selectedKey.key : '••••••••••••••••'}
                            readOnly
                            className="font-mono"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleKeyVisibility(selectedKey.id)}
                          >
                            {showKeys[selectedKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(selectedKey.key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea value={selectedKey.description} readOnly rows={3} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Created</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{selectedKey.createdAt}</span>
                          </div>
                        </div>
                        <div>
                          <Label>Last Used</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Activity className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{selectedKey.lastUsed}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Usage Statistics</Label>
                        <div className="space-y-3 mt-2">
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>API Calls</span>
                              <span className={getUsageColor(getUsagePercentage(selectedKey.usage.calls, selectedKey.usage.limit))}>
                                {selectedKey.usage.calls.toLocaleString()} / {selectedKey.usage.limit.toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  getUsagePercentage(selectedKey.usage.calls, selectedKey.usage.limit) >= 90
                                    ? 'bg-red-500'
                                    : getUsagePercentage(selectedKey.usage.calls, selectedKey.usage.limit) >= 70
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${getUsagePercentage(selectedKey.usage.calls, selectedKey.usage.limit)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Monthly Cost</span>
                            <span className="font-medium">£{selectedKey.usage.cost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Permissions</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedKey.permissions.map((permission) => (
                            <Badge key={permission} variant="secondary" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => toggleKeyStatus(selectedKey.id)}
                          className="flex-1"
                        >
                          {selectedKey.status === 'active' ? (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Unlock className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => regenerateKey(selectedKey.id)}
                          className="flex-1"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select an API Key</h3>
                      <p className="text-gray-600">Choose an API key from the list to view details</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Security Status Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getSecurityStatusIcon(securityStatus.sslCertificate)}
                      <div>
                        <div className="font-medium">SSL Certificate</div>
                        <div className="text-sm text-gray-600">Website encryption status</div>
                      </div>
                    </div>
                    <Badge className={securityStatus.sslCertificate === 'valid' ? 'bg-green-500' : 'bg-yellow-500'}>
                      {securityStatus.sslCertificate}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getSecurityStatusIcon(securityStatus.firewall)}
                      <div>
                        <div className="font-medium">Firewall</div>
                        <div className="text-sm text-gray-600">Network protection status</div>
                      </div>
                    </div>
                    <Badge className={securityStatus.firewall === 'active' ? 'bg-green-500' : 'bg-red-500'}>
                      {securityStatus.firewall}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getSecurityStatusIcon(securityStatus.backupStatus)}
                      <div>
                        <div className="font-medium">Backup Status</div>
                        <div className="text-sm text-gray-600">Data backup frequency</div>
                      </div>
                    </div>
                    <Badge className={securityStatus.backupStatus === 'daily' ? 'bg-green-500' : 'bg-yellow-500'}>
                      {securityStatus.backupStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getSecurityStatusIcon(securityStatus.securityScan)}
                      <div>
                        <div className="font-medium">Security Scan</div>
                        <div className="text-sm text-gray-600">Last scan: {securityStatus.lastScan}</div>
                      </div>
                    </div>
                    <Badge className={securityStatus.securityScan === 'passed' ? 'bg-green-500' : 'bg-yellow-500'}>
                      {securityStatus.securityScan}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Security Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full bg-green-500 hover:bg-green-600">
                    <Shield className="h-4 w-4 mr-2" />
                    Run Security Scan
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Security Report
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Firewall Rules
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Database className="h-4 w-4 mr-2" />
                    Backup Database
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Security Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-800">SSL Certificate is valid</div>
                      <div className="text-sm text-green-700">Your website is properly encrypted and secure</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-800">Firewall is active</div>
                      <div className="text-sm text-green-700">Network protection is enabled and working</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-yellow-800">Consider API key rotation</div>
                      <div className="text-sm text-yellow-700">Some API keys haven't been rotated in over 30 days</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Activity className="h-8 w-8 text-purple-500" />
                    <div>
                      <div className="text-2xl font-bold">{usageAnalytics.totalCalls.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Total API Calls</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">£{usageAnalytics.totalCost.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Total Cost</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold">+12.5%</div>
                      <div className="text-sm text-gray-600">Usage Growth</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Services by Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {usageAnalytics.topServices.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getServiceIcon(service.service)}
                          <div>
                            <div className="font-medium">{service.service}</div>
                            <div className="text-sm text-gray-600">{service.calls.toLocaleString()} calls</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">£{service.cost.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">Cost</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Usage Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-2">
                    {usageAnalytics.monthlyUsage.map((calls, index) => (
                      <div key={index} className="flex flex-col items-center gap-2">
                        <div
                          className="bg-purple-500 rounded-t w-8 transition-all duration-500"
                          style={{ height: `${(calls / Math.max(...usageAnalytics.monthlyUsage)) * 200}px` }}
                        />
                        <span className="text-xs text-gray-600">
                          {new Date(2024, index).toLocaleDateString('en', { month: 'short' })}
                        </span>
                        <span className="text-xs font-medium">{calls}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
