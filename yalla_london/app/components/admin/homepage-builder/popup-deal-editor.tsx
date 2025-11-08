'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap,
  Image as ImageIcon,
  Clock,
  MousePointer,
  Eye,
  BarChart3,
  Settings,
  Palette,
  Timer
} from 'lucide-react';

export interface PopupDealContent {
  enabled: boolean;
  title: string;
  subtitle?: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  backgroundType: 'color' | 'image' | 'gradient';
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundGradient?: {
    from: string;
    to: string;
    direction: string;
  };
  textColor: string;
  trigger: {
    type: 'time' | 'scroll' | 'exit' | 'manual';
    delay?: number; // seconds for time trigger
    scrollPercentage?: number; // percentage for scroll trigger
  };
  frequency: 'once' | 'daily' | 'session' | 'always';
  position: 'center' | 'top-right' | 'bottom-right' | 'bottom-center';
  animation: 'fade' | 'slide-up' | 'slide-down' | 'scale' | 'bounce';
  showCountdown?: boolean;
  countdownEndDate?: string;
  dismissible: boolean;
  autoClose?: {
    enabled: boolean;
    delay: number; // seconds
  };
  analytics: {
    enabled: boolean;
    ga4EventName?: string;
    trackConversions: boolean;
  };
  multilang?: {
    [lang: string]: {
      title: string;
      subtitle?: string;
      description: string;
      ctaText: string;
    };
  };
}

export interface PopupDealEditorProps {
  content: PopupDealContent;
  onUpdate: (content: PopupDealContent) => void;
}

export function PopupDealEditor({ content, onUpdate }: PopupDealEditorProps) {
  const [activeTab, setActiveTab] = useState('content');
  const [previewOpen, setPreviewOpen] = useState(false);

  const triggerTypes = [
    { value: 'time', label: 'Time Delay', description: 'Show after specified seconds' },
    { value: 'scroll', label: 'Scroll Position', description: 'Show when user scrolls to percentage' },
    { value: 'exit', label: 'Exit Intent', description: 'Show when user tries to leave page' },
    { value: 'manual', label: 'Manual Trigger', description: 'Show on button click or event' }
  ];

  const frequencies = [
    { value: 'once', label: 'Once Per User', description: 'Show only once, remember with cookie' },
    { value: 'daily', label: 'Once Per Day', description: 'Show once per day per user' },
    { value: 'session', label: 'Once Per Session', description: 'Show once per browser session' },
    { value: 'always', label: 'Every Visit', description: 'Show on every page load (testing only)' }
  ];

  const positions = [
    { value: 'center', label: 'Center Modal' },
    { value: 'top-right', label: 'Top Right Corner' },
    { value: 'bottom-right', label: 'Bottom Right Corner' },
    { value: 'bottom-center', label: 'Bottom Center Banner' }
  ];

  const animations = [
    { value: 'fade', label: 'Fade In' },
    { value: 'slide-up', label: 'Slide Up' },
    { value: 'slide-down', label: 'Slide Down' },
    { value: 'scale', label: 'Scale In' },
    { value: 'bounce', label: 'Bounce In' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Pop-Up Deal Editor
          <Switch
            checked={content.enabled}
            onCheckedChange={(checked) => onUpdate({ ...content, enabled: checked })}
          />
        </CardTitle>
      </CardHeader>
      
      {content.enabled && (
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="trigger">Trigger</TabsTrigger>
              <TabsTrigger value="appearance">Design</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="popup-title">Headline</Label>
                <Input
                  id="popup-title"
                  value={content.title}
                  onChange={(e) => onUpdate({ ...content, title: e.target.value })}
                  placeholder="🎉 Special Offer!"
                />
              </div>

              {/* Subtitle */}
              <div className="space-y-2">
                <Label htmlFor="popup-subtitle">Subtitle (Optional)</Label>
                <Input
                  id="popup-subtitle"
                  value={content.subtitle || ''}
                  onChange={(e) => onUpdate({ ...content, subtitle: e.target.value })}
                  placeholder="Limited time only"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="popup-description">Description</Label>
                <Textarea
                  id="popup-description"
                  value={content.description}
                  onChange={(e) => onUpdate({ ...content, description: e.target.value })}
                  placeholder="Get 20% off your first order when you sign up for our newsletter..."
                  rows={3}
                />
              </div>

              {/* CTA */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="popup-cta-text">Button Text</Label>
                  <Input
                    id="popup-cta-text"
                    value={content.ctaText}
                    onChange={(e) => onUpdate({ ...content, ctaText: e.target.value })}
                    placeholder="Claim Offer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="popup-cta-url">Button URL</Label>
                  <Input
                    id="popup-cta-url"
                    value={content.ctaUrl}
                    onChange={(e) => onUpdate({ ...content, ctaUrl: e.target.value })}
                    placeholder="/signup?promo=SAVE20"
                  />
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Countdown Timer</Label>
                  <Switch
                    checked={content.showCountdown || false}
                    onCheckedChange={(checked) => onUpdate({ 
                      ...content, 
                      showCountdown: checked 
                    })}
                  />
                </div>
                
                {content.showCountdown && (
                  <div className="space-y-2">
                    <Label htmlFor="countdown-end">End Date & Time</Label>
                    <Input
                      id="countdown-end"
                      type="datetime-local"
                      value={content.countdownEndDate || ''}
                      onChange={(e) => onUpdate({ 
                        ...content, 
                        countdownEndDate: e.target.value 
                      })}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="trigger" className="space-y-4">
              {/* Trigger Type */}
              <div className="space-y-3">
                <Label>Trigger Type</Label>
                <div className="space-y-2">
                  {triggerTypes.map((trigger) => (
                    <div
                      key={trigger.value}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        content.trigger.type === trigger.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => onUpdate({
                        ...content,
                        trigger: { ...content.trigger, type: trigger.value as any }
                      })}
                    >
                      <div className="font-medium text-sm">{trigger.label}</div>
                      <div className="text-xs text-gray-500">{trigger.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trigger Settings */}
              {content.trigger.type === 'time' && (
                <div className="space-y-2">
                  <Label>Delay (seconds): {content.trigger.delay || 3}</Label>
                  <Slider
                    value={[content.trigger.delay || 3]}
                    onValueChange={([value]) => onUpdate({
                      ...content,
                      trigger: { ...content.trigger, delay: value }
                    })}
                    max={30}
                    min={1}
                    step={1}
                  />
                </div>
              )}

              {content.trigger.type === 'scroll' && (
                <div className="space-y-2">
                  <Label>Scroll Percentage: {content.trigger.scrollPercentage || 50}%</Label>
                  <Slider
                    value={[content.trigger.scrollPercentage || 50]}
                    onValueChange={([value]) => onUpdate({
                      ...content,
                      trigger: { ...content.trigger, scrollPercentage: value }
                    })}
                    max={100}
                    min={10}
                    step={5}
                  />
                </div>
              )}

              {/* Frequency */}
              <div className="space-y-3">
                <Label>Show Frequency</Label>
                <Select
                  value={content.frequency}
                  onValueChange={(value: any) => onUpdate({ ...content, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        <div>
                          <div className="font-medium">{freq.label}</div>
                          <div className="text-xs text-gray-500">{freq.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4">
              {/* Position */}
              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  value={content.position}
                  onValueChange={(value: any) => onUpdate({ ...content, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Animation */}
              <div className="space-y-2">
                <Label>Animation</Label>
                <Select
                  value={content.animation}
                  onValueChange={(value: any) => onUpdate({ ...content, animation: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {animations.map((anim) => (
                      <SelectItem key={anim.value} value={anim.value}>
                        {anim.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Background */}
              <div className="space-y-4">
                <Label>Background</Label>
                <Select
                  value={content.backgroundType}
                  onValueChange={(value: any) => onUpdate({ ...content, backgroundType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="color">Solid Color</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>

                {content.backgroundType === 'color' && (
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={content.backgroundColor || '#ffffff'}
                      onChange={(e) => onUpdate({ 
                        ...content, 
                        backgroundColor: e.target.value 
                      })}
                      className="w-12 h-8"
                    />
                    <Input
                      value={content.backgroundColor || '#ffffff'}
                      onChange={(e) => onUpdate({ 
                        ...content, 
                        backgroundColor: e.target.value 
                      })}
                      placeholder="#ffffff"
                    />
                  </div>
                )}

                {content.backgroundType === 'image' && (
                  <Input
                    value={content.backgroundImage || ''}
                    onChange={(e) => onUpdate({ 
                      ...content, 
                      backgroundImage: e.target.value 
                    })}
                    placeholder="Enter image URL"
                  />
                )}
              </div>

              {/* Text Color */}
              <div className="space-y-2">
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={content.textColor || '#000000'}
                    onChange={(e) => onUpdate({ ...content, textColor: e.target.value })}
                    className="w-12 h-8"
                  />
                  <Input
                    value={content.textColor || '#000000'}
                    onChange={(e) => onUpdate({ ...content, textColor: e.target.value })}
                    placeholder="#000000"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="behavior" className="space-y-4">
              {/* Dismissible */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Dismissible</Label>
                  <div className="text-sm text-gray-500">Allow users to close the popup</div>
                </div>
                <Switch
                  checked={content.dismissible}
                  onCheckedChange={(checked) => onUpdate({ ...content, dismissible: checked })}
                />
              </div>

              {/* Auto Close */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Close</Label>
                    <div className="text-sm text-gray-500">Automatically close after delay</div>
                  </div>
                  <Switch
                    checked={content.autoClose?.enabled || false}
                    onCheckedChange={(checked) => onUpdate({ 
                      ...content, 
                      autoClose: { 
                        enabled: checked, 
                        delay: content.autoClose?.delay || 10 
                      } 
                    })}
                  />
                </div>

                {content.autoClose?.enabled && (
                  <div className="space-y-2">
                    <Label>Auto Close Delay: {content.autoClose.delay} seconds</Label>
                    <Slider
                      value={[content.autoClose.delay]}
                      onValueChange={([value]) => onUpdate({
                        ...content,
                        autoClose: { ...content.autoClose!, delay: value }
                      })}
                      max={60}
                      min={3}
                      step={1}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {/* Analytics Enabled */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Analytics</Label>
                  <div className="text-sm text-gray-500">Track popup performance</div>
                </div>
                <Switch
                  checked={content.analytics.enabled}
                  onCheckedChange={(checked) => onUpdate({ 
                    ...content, 
                    analytics: { ...content.analytics, enabled: checked } 
                  })}
                />
              </div>

              {content.analytics.enabled && (
                <>
                  {/* GA4 Event Name */}
                  <div className="space-y-2">
                    <Label htmlFor="ga4-event">GA4 Event Name</Label>
                    <Input
                      id="ga4-event"
                      value={content.analytics.ga4EventName || ''}
                      onChange={(e) => onUpdate({ 
                        ...content, 
                        analytics: { 
                          ...content.analytics, 
                          ga4EventName: e.target.value 
                        } 
                      })}
                      placeholder="popup_deal_view"
                    />
                  </div>

                  {/* Conversion Tracking */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Track Conversions</Label>
                      <div className="text-sm text-gray-500">Track CTA clicks as conversions</div>
                    </div>
                    <Switch
                      checked={content.analytics.trackConversions}
                      onCheckedChange={(checked) => onUpdate({ 
                        ...content, 
                        analytics: { ...content.analytics, trackConversions: checked } 
                      })}
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Preview Button */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview Popup
            </Button>

            <div className="text-sm text-gray-500">
              Changes auto-save as you edit
            </div>
          </div>

          {/* Preview Modal */}
          {previewOpen && (
            <PopupPreview
              content={content}
              onClose={() => setPreviewOpen(false)}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Preview Component
interface PopupPreviewProps {
  content: PopupDealContent;
  onClose: () => void;
}

function PopupPreview({ content, onClose }: PopupPreviewProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2"
        >
          ×
        </Button>

        <div style={{ color: content.textColor }}>
          <h3 className="text-xl font-bold mb-2">{content.title}</h3>
          {content.subtitle && (
            <h4 className="text-lg mb-3 opacity-80">{content.subtitle}</h4>
          )}
          <p className="mb-4">{content.description}</p>
          
          {content.showCountdown && (
            <div className="bg-red-100 text-red-800 px-3 py-2 rounded mb-4 text-center">
              <Timer className="h-4 w-4 inline mr-1" />
              Offer expires in: 23:59:45
            </div>
          )}

          <Button className="w-full" style={{ backgroundColor: content.textColor }}>
            {content.ctaText}
          </Button>
        </div>
      </div>
    </div>
  );
}