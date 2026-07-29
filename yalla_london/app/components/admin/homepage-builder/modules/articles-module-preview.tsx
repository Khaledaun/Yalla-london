'use client'

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
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

// Sample articles with slugs matching actual blog posts
const sampleArticles = [
  {
    id: 1,
    title: 'First Time in London? Complete Guide for Arab Visitors',
    slug: 'first-time-london-guide-arab-tourists-2025',
    excerpt: 'Everything Arab tourists need to know before visiting London. Visa requirements, best areas to stay, and halal food guide.',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
    author: 'Yalla London Editorial',
    publishDate: '2025-01-15',
    category: 'Travel Guides',
    readTime: '18 min read'
  },
  {
    id: 2,
    title: 'Best Halal Restaurants in Central London 2025',
    slug: 'best-halal-restaurants-central-london-2025',
    excerpt: 'From Mayfair fine dining to quick bites in Soho. Our curated list of the best halal restaurants in Zone 1.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    author: 'Yalla London Editorial',
    publishDate: '2025-01-12',
    category: 'Restaurants',
    readTime: '14 min read'
  },
  {
    id: 3,
    title: '20 Best London Attractions for Arab Families',
    slug: 'best-london-attractions-arab-families-2025',
    excerpt: 'From the Tower of London to Harry Potter Studios. Complete guide to family-friendly attractions with halal food.',
    image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400',
    author: 'Yalla London Editorial',
    publishDate: '2025-01-10',
    category: 'Attractions',
    readTime: '16 min read'
  },
  {
    id: 4,
    title: 'Best Shisha Lounges in London 2025',
    slug: 'best-shisha-lounges-london',
    excerpt: 'Discover London\'s finest shisha lounges. From luxury rooftop terraces to authentic Arabic cafes.',
    image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400',
    author: 'Yalla London Editorial',
    publishDate: '2025-01-08',
    category: 'Restaurants',
    readTime: '12 min read'
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
          <Button size="lg" variant="outline" asChild>
            <Link href="/blog">
              Read All Articles
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
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
  const articleUrl = `/blog/${article.slug}`;

  if (layout === 'list') {
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="flex">
          <Link href={articleUrl} className="w-64 h-40 relative block flex-shrink-0">
            <Image
              src={article.image}
              alt={article.title}
              width={256}
              height={160}
              className="w-full h-full object-cover"
              unoptimized
            />
            <Badge className="absolute top-2 left-2 bg-blue-500">
              {article.category}
            </Badge>
          </Link>

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
              <Link href={articleUrl} className="hover:text-blue-600 transition-colors">
                {article.title}
              </Link>
            </h3>

            {showExcerpts && (
              <p className="text-gray-600 mb-4 line-clamp-3">
                {article.excerpt}
              </p>
            )}

            <Button variant="link" className="p-0 h-auto" asChild>
              <Link href={articleUrl}>
                Read More
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={articleUrl} className="relative block">
        <Image
          src={article.image}
          alt={article.title}
          width={0}
          height={0}
          sizes="100vw"
          className="w-full h-48 object-cover"
          style={{ width: '100%', height: '12rem' }}
          unoptimized
        />
        <Badge className="absolute top-3 left-3 bg-blue-500">
          {article.category}
        </Badge>
      </Link>

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
          <Link href={articleUrl} className="hover:text-blue-600 transition-colors">
            {article.title}
          </Link>
        </h3>

        {showExcerpts && (
          <p className="text-gray-600 mb-4 line-clamp-3">
            {article.excerpt}
          </p>
        )}

        <Button variant="link" className="p-0 h-auto" asChild>
          <Link href={articleUrl}>
            Read More
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}