'use client'

import React from 'react';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, Twitter, ExternalLink } from 'lucide-react';

export interface SocialModulePreviewProps {
  module: {
    content: {
      title: string;
      platforms: string[];
      showFeed: boolean;
    };
  };
}

export function SocialModulePreview({ module }: SocialModulePreviewProps) {
  const { content } = module;

  const socialLinks = [
    { name: 'instagram', icon: Instagram, url: '#', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { name: 'twitter', icon: Twitter, url: '#', color: 'bg-blue-500' },
    { name: 'facebook', icon: Facebook, url: '#', color: 'bg-blue-600' }
  ];

  const activePlatforms = socialLinks.filter(link => 
    content.platforms.includes(link.name)
  );

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {content.title || 'Follow Us'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Stay connected and get the latest updates on social media
          </p>
        </div>

        {/* Social Media Buttons */}
        <div className="flex justify-center gap-4 mb-12">
          {activePlatforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <Button
                key={platform.name}
                size="lg"
                className={`${platform.color} hover:opacity-90 text-white border-0`}
              >
                <Icon className="h-5 w-5 mr-2" />
                Follow on {platform.name.charAt(0).toUpperCase() + platform.name.slice(1)}
              </Button>
            );
          })}
        </div>

        {/* Social Feed Preview */}
        {content.showFeed && (
          <div>
            <h3 className="text-2xl font-bold text-center mb-8">Latest Posts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Instagram className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold">@yallalondon</div>
                      <div className="text-sm text-gray-500">2 hours ago</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-200 h-48 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-gray-500">Social Media Post</span>
                  </div>
                  
                  <p className="text-gray-700 mb-3">
                    Just discovered this amazing hidden gem in Shoreditch! 
                    The street art here is absolutely incredible 🎨 #London #StreetArt
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>❤️ 142 likes</span>
                    <Button variant="link" size="sm" className="p-0 h-auto">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Post
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}