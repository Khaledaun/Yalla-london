"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /admin/activity — Redirects to Cockpit Mission Control
 *
 * Activity feed is consolidated into the cockpit. This page exists
 * to prevent 404s from sidebar/nav links.
 */
export default function ActivityPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/cockpit");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-sm text-gray-500">Redirecting to Mission Control…</p>
    </div>
  );
}
