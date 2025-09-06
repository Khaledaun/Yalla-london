
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Key, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Database,
  Mail,
  BarChart3,
  Search,
  Instagram,
  Youtube,
  Smartphone,
  Globe,
  Zap,
  Eye,
  EyeOff,
  TestTube
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ApiSetting {
  id: string;
  keyName: string;
  keyValue: string;
  isActive: boolean;
  lastTested?: string;
  testStatus?: 'success' | 'failed' | 'not_tested';
  category: string;
  description: string;
  required: boolean;
}

interface ApiTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export function ApiSettingsPanel() {
  const [activeTab, setActiveTab] = useState('integrations');
  const [apiSettings, setApiSettings] = useState<ApiSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newValues, setNewValues] = useState<Record<string, string>>({});

  const apiCategories = [
    {
      id: 'ai',
      name: 'AI & Content Generation',
      icon: <Zap className="h-5 w-5" />,
      keys: [
        {
          keyName: 'abacusai_api_key',
          displayName: 'AbacusAI API Key',
          description: 'Required for AI content generation and automation',
          required: true,
          placeholder: 'sk-abacus-...'
        },
        {
          keyName: 'openai_api_key',
          displayName: 'OpenAI API Key',
          description: 'Backup AI provider for content generation',
          required: false,
          placeholder: 'sk-...'
        }
      ]
    },
    {
      id: 'analytics',
      name: 'Analytics & SEO',
      icon: <BarChart3 className="h-5 w-5" />,
      keys: [
        {
          keyName: 'google_analytics_id',
          displayName: 'Google Analytics ID',
          description: 'Track website performance and user behavior',
          required: true,
          placeholder: 'G-XXXXXXXXXX'
        },
        {
          keyName: 'google_search_console_key',
          displayName: 'Google Search Console',
          description: 'Submit URLs and monitor search performance',
          required: true,
          placeholder: 'Service account JSON key'
        },
        {
          keyName: 'google_tag_manager_id',
          displayName: 'Google Tag Manager ID',
          description: 'Manage tracking codes and pixels',
          required: false,
          placeholder: 'GTM-XXXXXXX'
        }
      ]
    },
    {
      id: 'social',
      name: 'Social Media',
      icon: <Instagram className="h-5 w-5" />,
      keys: [
        {
          keyName: 'instagram_access_token',
          displayName: 'Instagram Access Token',
          description: 'Auto-post to Instagram Business account',
          required: false,
          placeholder: 'IGQVJYQm9...'
        },
        {
          keyName: 'instagram_business_id',
          displayName: 'Instagram Business ID',
          description: 'Instagram Business Account ID',
          required: false,
          placeholder: '17841400...'
        },
        {
          keyName: 'tiktok_access_token',
          displayName: 'TikTok Access Token',
          description: 'Auto-upload videos to TikTok',
          required: false,
          placeholder: 'act.example...'
        },
        {
          keyName: 'youtube_api_key',
          displayName: 'YouTube API Key',
          description: 'YouTube integration for video content',
          required: false,
          placeholder: 'AIza...'
        }
      ]
    },
    {
      id: 'email',
      name: 'Email & Communications',
      icon: <Mail className="h-5 w-5" />,
      keys: [
        {
          keyName: 'smtp_host',
          displayName: 'SMTP Host',
          description: 'Email server for notifications',
          required: false,
          placeholder: 'smtp.gmail.com'
        },
        {
          keyName: 'smtp_port',
          displayName: 'SMTP Port',
          description: 'Email server port (587 for TLS)',
          required: false,
          placeholder: '587'
        },
        {
          keyName: 'smtp_username',
          displayName: 'SMTP Username',
          description: 'Email account username',
          required: false,
          placeholder: 'your-email@gmail.com'
        },
        {
          keyName: 'smtp_password',
          displayName: 'SMTP Password',
          description: 'Email account password or app password',
          required: false,
          placeholder: 'your-app-password'
        },
        {
          keyName: 'mailchimp_api_key',
          displayName: 'Mailchimp API Key',
          description: 'Newsletter and email marketing automation',
          required: false,
          placeholder: 'xxxxxxx-usX'
        }
      ]
    },
    {
      id: 'database',
      name: 'Database & Storage',
      icon: <Database className="h-5 w-5" />,
      keys: [
        {
          keyName: 'database_url',
          displayName: 'Database URL',
          description: 'PostgreSQL database connection string',
          required: true,
          placeholder: 'postgresql://username:password@host:port/database'
        },
        {
          keyName: 'aws_access_key_id',
          displayName: 'AWS Access Key ID',
          description: 'AWS S3 for file storage and CDN',
          required: false,
          placeholder: 'AKIA...'
        },
        {
          keyName: 'aws_secret_access_key',
          displayName: 'AWS Secret Key',
          description: 'AWS S3 secret access key',
          required: false,
          placeholder: 'your-aws-secret-key'
        },
        {
          keyName: 'aws_bucket_name',
          displayName: 'AWS S3 Bucket',
          description: 'S3 bucket name for file storage',
          required: false,
          placeholder: 'your-bucket-name'
        }
      ]
    }
  ];

  useEffect(() => {
    fetchApiSettings();
  }, []);

  const fetchApiSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const result = await response.json();
      
      if (result.success) {
        setApiSettings(result.settings);
      }
    } catch (error) {
      console.error('Failed to fetch API settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateApiSetting = async (keyName: string, keyValue: string) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyName,
          keyValue: keyValue.trim(),
          isActive: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Update local state
        setApiSettings(prev => {
          const existing = prev.find(s => s.keyName === keyName);
          if (existing) {
            return prev.map(s => 
              s.keyName === keyName 
                ? { ...s, keyValue: keyValue.trim(), testStatus: 'not_tested' }
                : s
            );
          } else {
            return [...prev, {
              id: result.setting.id,
              keyName,
              keyValue: keyValue.trim(),
              isActive: true,
              testStatus: 'not_tested',
              category: '',
              description: '',
              required: false
            }];
          }
        });
        
        setEditingKey(null);
        setNewValues(prev => ({ ...prev, [keyName]: '' }));
      }
    } catch (error) {
      console.error('Failed to update API setting:', error);
    }
  };

  const testApiKey = async (keyName: string) => {
    setTesting(keyName);
    
    try {
      const response = await fetch('/api/admin/test-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyName })
      });

      const result: ApiTestResult = await response.json();
      
      // Update test status
      setApiSettings(prev => prev.map(setting => 
        setting.keyName === keyName 
          ? { 
              ...setting, 
              testStatus: result.success ? 'success' : 'failed',
              lastTested: new Date().toISOString()
            }
          : setting
      ));
      
    } catch (error) {
      console.error('Failed to test API key:', error);
      // Update to failed status
      setApiSettings(prev => prev.map(setting => 
        setting.keyName === keyName 
          ? { 
              ...setting, 
              testStatus: 'failed',
              lastTested: new Date().toISOString()
            }
          : setting
      ));
    } finally {
      setTesting(null);
    }
  };

  const toggleShowValue = (keyName: string) => {
    setShowValues(prev => ({
      ...prev,
      [keyName]: !prev[keyName]
    }));
  };

  const getApiSetting = (keyName: string) => {
    return apiSettings.find(s => s.keyName === keyName);
  };

  const renderTestStatus = (setting?: ApiSetting) => {
    if (!setting?.testStatus) return null;
    
    const statusConfig = {
      success: { icon: <CheckCircle className="h-4 w-4 text-green-500" />, text: 'Working', color: 'green' },
      failed: { icon: <XCircle className="h-4 w-4 text-red-500" />, text: 'Failed', color: 'red' },
      not_tested: { icon: <TestTube className="h-4 w-4 text-gray-400" />, text: 'Not tested', color: 'gray' }
    };
    
    const config = statusConfig[setting.testStatus as keyof typeof statusConfig];
    
    return (
      <Badge variant="outline" className={`text-${config.color}-600 border-${config.color}-200`}>
        {config.icon}
        <span className="ml-1">{config.text}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">API Settings & Integrations</h2>
        <Badge variant="outline" className="text-sm">
          {apiSettings.filter(s => s.testStatus === 'success').length} Active Integrations
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="ai">AI & Content</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apiCategories.map(category => (
              <Card key={category.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {category.icon}
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.keys.map(keyConfig => {
                      const setting = getApiSetting(keyConfig.keyName);
                      const hasValue = setting && setting.keyValue;
                      
                      return (
                        <div key={keyConfig.keyName} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{keyConfig.displayName}</span>
                              {keyConfig.required && (
                                <Badge variant="outline" className="text-xs">Required</Badge>
                              )}
                            </div>
                            {renderTestStatus(setting)}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {hasValue ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => testApiKey(keyConfig.keyName)}
                                  disabled={testing === keyConfig.keyName}
                                >
                                  {testing === keyConfig.keyName ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <TestTube className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingKey(keyConfig.keyName)}
                                >
                                  <Settings className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingKey(keyConfig.keyName)}
                              >
                                <Key className="h-3 w-3 mr-1" />
                                Setup
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {apiCategories.map(category => (
          <TabsContent key={category.id} value={category.id} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {category.icon}
                  {category.name} Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {category.keys.map(keyConfig => {
                  const setting = getApiSetting(keyConfig.keyName);
                  const isEditing = editingKey === keyConfig.keyName;
                  const currentValue = newValues[keyConfig.keyName] || setting?.keyValue || '';

                  return (
                    <div key={keyConfig.keyName} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{keyConfig.displayName}</h4>
                            {keyConfig.required && (
                              <Badge variant="destructive">Required</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{keyConfig.description}</p>
                        </div>
                        {renderTestStatus(setting)}
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={keyConfig.keyName}>API Key / Value</Label>
                            <Input
                              id={keyConfig.keyName}
                              type={showValues[keyConfig.keyName] ? 'text' : 'password'}
                              value={currentValue}
                              onChange={(e) => setNewValues(prev => ({
                                ...prev,
                                [keyConfig.keyName]: e.target.value
                              }))}
                              placeholder={keyConfig.placeholder}
                            />
                          </div>
                          
                          <div className="flex justify-between">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleShowValue(keyConfig.keyName)}
                            >
                              {showValues[keyConfig.keyName] ? (
                                <EyeOff className="h-4 w-4 mr-1" />
                              ) : (
                                <Eye className="h-4 w-4 mr-1" />
                              )}
                              {showValues[keyConfig.keyName] ? 'Hide' : 'Show'}
                            </Button>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingKey(null);
                                  setNewValues(prev => ({ ...prev, [keyConfig.keyName]: '' }));
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateApiSetting(keyConfig.keyName, currentValue)}
                                disabled={!currentValue.trim()}
                              >
                                Save & Test
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {setting?.keyValue ? (
                              <>
                                <span className="text-sm text-gray-500 font-mono">
                                  {showValues[keyConfig.keyName] 
                                    ? setting.keyValue 
                                    : '••••••••••••••••'
                                  }
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleShowValue(keyConfig.keyName)}
                                >
                                  {showValues[keyConfig.keyName] ? 
                                    <EyeOff className="h-3 w-3" /> : 
                                    <Eye className="h-3 w-3" />
                                  }
                                </Button>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">Not configured</span>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            {setting?.keyValue && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => testApiKey(keyConfig.keyName)}
                                disabled={testing === keyConfig.keyName}
                              >
                                {testing === keyConfig.keyName ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Testing...
                                  </>
                                ) : (
                                  <>
                                    <TestTube className="h-3 w-3 mr-1" />
                                    Test
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingKey(keyConfig.keyName)}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              {setting?.keyValue ? 'Update' : 'Setup'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="advanced" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Environment Variables</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Some settings are managed through environment variables for security.
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <code className="text-sm">
                      NEXT_PUBLIC_BRAND_TYPE=luxury-guide<br/>
                      NEXT_PUBLIC_SITE_URL=https://yallalondon.com<br/>
                      NEXTAUTH_URL=https://yallalondon.com<br/>
                      NEXTAUTH_SECRET=your-nextauth-secret<br/>
                    </code>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Test All Integrations</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Run a comprehensive test of all configured integrations.
                  </p>
                  
                  <Button
                    onClick={() => {
                      // Test all configured APIs
                      apiSettings.forEach(setting => {
                        if (setting.keyValue && setting.isActive) {
                          testApiKey(setting.keyName);
                        }
                      });
                    }}
                    disabled={testing !== null}
                  >
                    {testing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Test All Integrations
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
