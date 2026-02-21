'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';

/**
 * /admin/facts — Fact Checker
 * The dedicated fact-checking UI is managed through the Content Pipeline.
 * This page redirects users to the appropriate tools.
 */
export default function FactCheckerPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 space-y-6">
      <div>
        <h1 style={{ fontFamily:"'Anybody',sans-serif", fontWeight:800, fontSize:28, color:"#1C1917", letterSpacing:-0.5 }}>
          Fact Checker
        </h1>
        <div style={{ fontFamily:"'IBM Plex Sans Arabic',sans-serif", fontSize:13, color:"#78716C", letterSpacing:0, marginTop:4 }}>
          التحقق من الحقائق
        </div>
      </div>

      <div className="neu-card" style={{ borderLeft:"4px solid #C49A2A" }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} style={{ color:"#C49A2A", flexShrink:0, marginTop:2 }} />
          <div>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, fontWeight:600, color:"#C49A2A", textTransform:"uppercase", letterSpacing:1 }}>
              Integrated into Content Pipeline
            </div>
            <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"#78716C", marginTop:6, lineHeight:1.7 }}>
              Fact verification is handled automatically during the content generation pipeline (Phase 6 of 8).
              Articles are fact-checked before reaching the reservoir and publishing queue.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            label: 'Content Pipeline',
            desc: 'Monitor fact-checking progress in the pipeline',
            href: '/admin/pipeline',
            color: '#C8322B',
          },
          {
            label: 'Generation Monitor',
            desc: 'Real-time article generation & quality checks',
            href: '/admin/content?tab=generation',
            color: '#4A7BA8',
          },
          {
            label: 'Article Drafts',
            desc: 'Review and manage draft articles',
            href: '/admin/articles',
            color: '#2D5A3D',
          },
          {
            label: 'London News',
            desc: 'Breaking news with auto fact-checking',
            href: '/admin/news',
            color: '#C49A2A',
          },
        ].map((item) => (
          <Link key={item.href} href={item.href}
                className="neu-card flex items-center justify-between gap-3 transition-all hover:shadow-lg"
                style={{ textDecoration:'none' }}>
            <div>
              <div style={{ fontFamily:"'Anybody',sans-serif", fontWeight:700, fontSize:13, color:"#1C1917" }}>
                {item.label}
              </div>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:"#78716C", marginTop:3, textTransform:"uppercase", letterSpacing:0.5 }}>
                {item.desc}
              </div>
            </div>
            <ArrowRight size={16} style={{ color: item.color, flexShrink:0 }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
