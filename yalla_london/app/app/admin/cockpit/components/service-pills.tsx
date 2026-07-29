"use client";

import { useState, useEffect } from "react";
import { AdminStatusBadge } from "@/components/admin/admin-ui";

interface Service {
  name: string;
  status: "ok" | "degraded" | "critical" | "unknown";
  message?: string;
}

const STATUS_MAP: Record<string, string> = {
  ok: "success",
  degraded: "warning",
  critical: "error",
  unknown: "info",
};

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
      } catch (err) {
        console.warn("[service-pills] fetch failed:", err instanceof Error ? err.message : err);
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
          <div key={i} className="h-7 w-20 bg-stone-100 rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {services.map((s) => (
        <AdminStatusBadge
          key={s.name}
          status={STATUS_MAP[s.status] || "info"}
          label={s.name}
        />
      ))}
    </div>
  );
}
