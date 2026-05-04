"use client";

interface HeroBarProps {
  publishedToday: number;
  indexed: number;
  sessions7d: number;
  clicks7d: number;
}

export function HeroBar({ publishedToday, indexed, sessions7d, clicks7d }: HeroBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: "Published Today", value: publishedToday },
        { label: "Indexed", value: indexed },
        { label: "Sessions (7d)", value: sessions7d.toLocaleString() },
        { label: "GSC Clicks (7d)", value: clicks7d.toLocaleString() },
      ].map((item) => (
        <div
          key={item.label}
          className="bg-white border border-[rgba(214,208,196,0.6)] rounded-lg p-3 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(28,25,23,0.04)]"
        >
          <div className="flex flex-col gap-0.5">
            <span style={{ fontFamily: "var(--font-system)", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#78716C' }}>{item.label}</span>
            <span style={{ fontFamily: "var(--font-system)", fontSize: '1.25rem', fontWeight: 700, color: '#1C1917' }}>{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
