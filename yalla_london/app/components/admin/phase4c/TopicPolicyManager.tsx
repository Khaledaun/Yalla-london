/**
 * Phase 4C Topic Policy Manager Component
 * Admin interface for managing topic policies and quotas
 */
'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/components/language-provider'
import { getTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { 
  Settings, 
  Loader2, 
  Plus, 
  Edit3, 
  Trash2, 
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/components/ui/use-toast'

interface TopicPolicy {
  id: string
  name: string
  policy_type: 'quota_balancer' | 'publishing_rules' | 'content_quality'
  rules_json: any
  quotas_json?: any
  priorities_json?: any
  auto_approval_rules?: any
  violation_actions: string[]
  is_active: boolean
  effective_from: string
  effective_until?: string
  created_by: string
  created_at: string
  updated_at: string
  user: {
    id: string
    name: string
    email: string
  }
}

export function TopicPolicyManager() {
  const { language } = useLanguage()
  const { toast } = useToast()
  const [policies, setPolicies] = useState<TopicPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<TopicPolicy | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    policy_type: 'quota_balancer' as const,
    rules_json: {},
    quotas_json: {
      daily_limit: 5,
      weekly_limit: 25,
      category_distribution: {
        'london-travel': 30,
        'london-events': 25,
        'london-food': 20,
        'london-culture': 15,
        'london-nightlife': 10
      }
    },
    priorities_json: {
      'london-travel': 1.0,
      'london-events': 0.8,
      'london-food': 0.6,
      'london-culture': 0.4,
      'london-nightlife': 0.2
    },
    auto_approval_rules: {
      min_confidence_score: 0.7,
      max_consecutive_same_category: 3,
      require_authority_links: true
    },
    violation_actions: ['warn'],
    is_active: true
  })

  // Fetch policies
  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/topics/policy')
      const data = await response.json()
      
      if (data.success) {
        setPolicies(data.data)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch topic policies',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Failed to fetch policies:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch topic policies',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicies()
  }, [])

  // Create policy
  const handleCreatePolicy = async () => {
    try {
      setCreating(true)
      const response = await fetch('/api/admin/topics/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPolicies([data.data, ...policies])
        setShowCreateForm(false)
        resetForm()
        toast({
          title: 'Success',
          description: 'Topic policy created successfully'
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create policy',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Failed to create policy:', error)
      toast({
        title: 'Error',
        description: 'Failed to create policy',
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      policy_type: 'quota_balancer',
      rules_json: {},
      quotas_json: {
        daily_limit: 5,
        weekly_limit: 25,
        category_distribution: {
          'london-travel': 30,
          'london-events': 25,
          'london-food': 20,
          'london-culture': 15,
          'london-nightlife': 10
        }
      },
      priorities_json: {
        'london-travel': 1.0,
        'london-events': 0.8,
        'london-food': 0.6,
        'london-culture': 0.4,
        'london-nightlife': 0.2
      },
      auto_approval_rules: {
        min_confidence_score: 0.7,
        max_consecutive_same_category: 3,
        require_authority_links: true
      },
      violation_actions: ['warn'],
      is_active: true
    })
  }

  const updateCategoryDistribution = (category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      quotas_json: {
        ...prev.quotas_json,
        category_distribution: {
          ...prev.quotas_json.category_distribution,
          [category]: value
        }
      }
    }))
  }

  const updatePriority = (category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      priorities_json: {
        ...prev.priorities_json,
        [category]: value / 100
      }
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading topic policies...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Topic Policy Manager</h2>
          <p className="text-muted-foreground">
            Manage content quotas, publishing rules, and automation policies
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Policy
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              <div className="text-sm font-medium">Active Policies</div>
            </div>
            <div className="text-2xl font-bold">
              {policies.filter(p => p.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-500" />
              <div className="text-sm font-medium">Quota Balancers</div>
            </div>
            <div className="text-2xl font-bold">
              {policies.filter(p => p.policy_type === 'quota_balancer').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-orange-500" />
              <div className="text-sm font-medium">Publishing Rules</div>
            </div>
            <div className="text-2xl font-bold">
              {policies.filter(p => p.policy_type === 'publishing_rules').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-500" />
              <div className="text-sm font-medium">Quality Gates</div>
            </div>
            <div className="text-2xl font-bold">
              {policies.filter(p => p.policy_type === 'content_quality').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Topic Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Policy Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Default Quota Balancer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="policy_type">Policy Type</Label>
                <Select 
                  value={formData.policy_type} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, policy_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quota_balancer">Quota Balancer</SelectItem>
                    <SelectItem value="publishing_rules">Publishing Rules</SelectItem>
                    <SelectItem value="content_quality">Content Quality</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.policy_type === 'quota_balancer' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Quota Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="daily_limit">Daily Limit</Label>
                    <Input
                      id="daily_limit"
                      type="number"
                      value={formData.quotas_json.daily_limit}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        quotas_json: { 
                          ...prev.quotas_json, 
                          daily_limit: parseInt(e.target.value) 
                        }
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weekly_limit">Weekly Limit</Label>
                    <Input
                      id="weekly_limit"
                      type="number"
                      value={formData.quotas_json.weekly_limit}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        quotas_json: { 
                          ...prev.quotas_json, 
                          weekly_limit: parseInt(e.target.value) 
                        }
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Category Distribution (%)</h4>
                  {Object.entries(formData.quotas_json.category_distribution).map(([category, percentage]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{category}</Label>
                        <span className="text-sm text-muted-foreground">{percentage}%</span>
                      </div>
                      <Slider
                        value={[percentage as number]}
                        onValueChange={([value]) => updateCategoryDistribution(category, value)}
                        max={50}
                        min={5}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Category Priorities</h4>
                  {Object.entries(formData.priorities_json).map(([category, priority]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{category}</Label>
                        <span className="text-sm text-muted-foreground">{Math.round((priority as number) * 100)}%</span>
                      </div>
                      <Slider
                        value={[Math.round((priority as number) * 100)]}
                        onValueChange={([value]) => updatePriority(category, value)}
                        max={100}
                        min={10}
                        step={10}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active</Label>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Button 
                onClick={handleCreatePolicy}
                disabled={creating || !formData.name}
                className="flex items-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? 'Creating...' : 'Create Policy'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateForm(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policies List */}
      <div className="grid grid-cols-1 gap-4">
        {policies.map((policy) => (
          <motion.div
            key={policy.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{policy.name}</CardTitle>
                    <Badge variant={policy.is_active ? "default" : "secondary"}>
                      {policy.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">
                      {policy.policy_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground">Created by</div>
                    <div>{policy.user.name}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Created</div>
                    <div>{new Date(policy.created_at).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Effective Until</div>
                    <div>{policy.effective_until ? new Date(policy.effective_until).toLocaleDateString() : 'No expiry'}</div>
                  </div>
                </div>

                {policy.policy_type === 'quota_balancer' && policy.quotas_json && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Daily Limit: {(policy.quotas_json as any).daily_limit}</div>
                        <div className="font-medium">Weekly Limit: {(policy.quotas_json as any).weekly_limit}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground mb-2">Category Distribution</div>
                        {Object.entries((policy.quotas_json as any).category_distribution || {}).map(([cat, perc]) => (
                          <div key={cat} className="flex justify-between">
                            <span>{cat}</span>
                            <span>{String(perc)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {policies.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Topic Policies</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first topic policy to start managing content quotas and automation rules.
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Policy
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}