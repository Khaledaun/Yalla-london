"use client";

import { useState, useEffect } from "react";
import { ZHStatusPill } from "@/components/zh";

interface Service {
  name: string;
  status: "ok" | "degraded" | "critical" | "unknown";
  message?: string;
}

export function ServicePills() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/admin/system/api-health");
        if (res.ok) {
          const data = await res.json();
          setServices(data.services || []);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetch_();
    const interval = setInterval(fetch_, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-7 w-20 bg-zh-navy-mid rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {services.map((s) => (
        <ZHStatusPill
          key={s.name}
          label={s.name}
          status={s.status}
        />
      ))}
    </div>
  );
}
