"use client";

import React, { useState } from "react";
import { ZenithaLuxuryMock } from "./zenitha-luxury";
import { ZenithaYachtsMock } from "./zenitha-yachts";
import { YallaRivieraMock } from "./yalla-riviera";

const SITES = [
  { id: "zenitha-luxury", label: "Zenitha Luxury", subtitle: "BMW \u2014 obsidian+gold, zero radius, angular prestige", component: ZenithaLuxuryMock },
  { id: "zenitha-yachts", label: "Zenitha Yachts", subtitle: "Stripe \u2014 navy+aegean, blue shadows, maritime", component: ZenithaYachtsMock },
  { id: "yalla-riviera", label: "Yalla Riviera", subtitle: "Superhuman \u2014 navy+lavender+champagne, French elegance", component: YallaRivieraMock },
] as const;

export default function SitePreviewsPage() {
  const [active, setActive] = useState("zenitha-luxury");
  const ActiveComponent = SITES.find(s => s.id === active)?.component ?? ZenithaLuxuryMock;

  return (
    <div>
      {/* Selector */}
      <div className="sticky top-0 z-50 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-bold text-stone-800">Site Design Previews</h1>
            <span className="text-[10px] text-stone-400">Tap a site to preview</span>
          </div>
          <div className="flex gap-2">
            {SITES.map(s => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex-1 py-2 px-3 rounded-lg text-center transition-all ${
                  active === s.id
                    ? "bg-stone-900 text-white shadow-md"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                <span className="text-xs font-semibold block">{s.label}</span>
                <span className={`text-[8px] block mt-0.5 leading-tight ${active === s.id ? "text-white/60" : "text-stone-400"}`}>
                  {s.subtitle}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="border-4 border-stone-200 rounded-b-xl mx-auto max-w-7xl overflow-hidden">
        <ActiveComponent />
      </div>
    </div>
  );
}
