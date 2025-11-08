'use client'

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ArrowRight } from 'lucide-react';

export interface ArticlesModulePreviewProps {
  module: {
    content: {
      title: string;
      maxItems: number;
      layout: 'grid' | 'list';
      showExcerpts: boolean;
    };
  };
}

const sampleArticles = [
  {
    id: 1,
    title: 'Best Hidden Gems in East London',
    excerpt: 'Discover the secret spots that locals love, from underground bars to vintage markets that most tourists never find.',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
    author: 'Sarah Mitchell',
    publishDate: '2024-01-15',
    category: 'Local Guides',
    readTime: '5 min read'
  },
  {
    id: 2,
    title: 'London Food Scene: Where to Eat in 2024',
    excerpt: 'From Michelin-starred restaurants to street food markets, explore London\'s evolving culinary landscape.',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
    author: 'James Chen',
    publishDate: '2024-01-12',
    category: 'Food & Drink',
    readTime: '8 min read'
  },
  {
    id: 3,
    title: 'Free Museums and Galleries Guide',
    excerpt: 'Make the most of London\'s incredible free cultural offerings with our comprehensive guide to museums and galleries.',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
    author: 'Emma Thompson',
    publishDate: '2024-01-10',
    category: 'Culture',
    readTime: '6 min read'
  },
  {
    id: 4,
    title: 'Thames Path Walking Guide',
    excerpt: 'Follow the historic Thames Path from Greenwich to Putney, discovering riverside pubs and historic landmarks.',
    image: 'https://images.unsplash.com/photo-1520637836862-4d197d17c90a?w=400',
    author: 'Michael Roberts',
    publishDate: '2024-01-08',
    category: 'Outdoor',
    readTime: '10 min read'
  }
];

export function ArticlesModulePreview({ module }: ArticlesModulePreviewProps) {
  const { content } = module;
  const articles = sampleArticles.slice(0, content.maxItems);

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {content.title || 'Latest Articles'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover London through our insider guides, tips, and local recommendations
          </p>
        </div>

        <div className={`${content.layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-8' : 'space-y-8'}`}>
          {articles.map((article) => (
            <ArticleCard 
              key={article.id} 
              article={article} 
              showExcerpts={content.showExcerpts}
              layout={content.layout}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="outline">
            Read All Articles
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}

interface ArticleCardProps {
  article: typeof sampleArticles[0];
  showExcerpts: boolean;
  layout: 'grid' | 'list';
}

function ArticleCard({ article, showExcerpts, layout }: ArticleCardProps) {
  if (layout === 'list') {
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="flex">
          <div className="w-64 h-40 relative">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <Badge className="absolute top-2 left-2 bg-blue-500">
              {article.category}
            </Badge>
          </div>
          
          <CardContent className="flex-1 p-6">
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {article.author}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(article.publishDate).toLocaleDateString()}
              </div>
              <span>{article.readTime}</span>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
              {article.title}
            </h3>
            
            {showExcerpts && (
              <p className="text-gray-600 mb-4 line-clamp-3">
                {article.excerpt}
              </p>
            )}
            
            <Button variant="link" className="p-0 h-auto">
              Read More
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-48 object-cover"
        />
        <Badge className="absolute top-3 left-3 bg-blue-500">
          {article.category}
        </Badge>
      </div>
      
      <CardContent className="p-6">
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {article.author}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(article.publishDate).toLocaleDateString()}
          </div>
          <span>{article.readTime}</span>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
          {article.title}
        </h3>
        
        {showExcerpts && (
          <p className="text-gray-600 mb-4 line-clamp-3">
            {article.excerpt}
          </p>
        )}
        
        <Button variant="link" className="p-0 h-auto">
          Read More
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}