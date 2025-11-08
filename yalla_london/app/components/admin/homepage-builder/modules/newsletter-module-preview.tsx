'use client'

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Send } from 'lucide-react';

export interface NewsletterModulePreviewProps {
  module: {
    content: {
      title: string;
      subtitle: string;
      placeholder: string;
      buttonText: string;
    };
  };
}

export function NewsletterModulePreview({ module }: NewsletterModulePreviewProps) {
  const { content } = module;

  return (
    <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <Mail className="h-16 w-16 text-white mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {content.title || 'Stay Updated'}
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            {content.subtitle || 'Get the latest news and offers delivered straight to your inbox'}
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="flex gap-3">
            <Input
              type="email"
              placeholder={content.placeholder || 'Enter your email'}
              className="flex-1 bg-white"
            />
            <Button className="bg-white text-blue-600 hover:bg-gray-100">
              <Send className="h-4 w-4 mr-2" />
              {content.buttonText || 'Subscribe'}
            </Button>
          </div>
          
          <p className="text-sm text-blue-100 mt-4">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-white">
          <div className="text-center">
            <div className="text-2xl font-bold">Weekly</div>
            <div className="text-blue-100">Updates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">Exclusive</div>
            <div className="text-blue-100">Offers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">Local</div>
            <div className="text-blue-100">Insights</div>
          </div>
        </div>
      </div>
    </section>
  );
}