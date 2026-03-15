"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Link {
  id: string;
  name: string;
  destinationUrl: string;
  affiliateUrl: string;
  category: string | null;
  language: string;
  clicks: number;
  impressions: number;
  isActive: boolean;
  advertiser: { name: string };
}

export default function LinksPage() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch(`/api/affiliate/links?page=${page}&limit=${limit}`);
      if (res.ok) {
        const d = await res.json();
        setLinks(d.links || []);
        setTotal(d.total || 0);
      }
    } catch {}
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const syncAll = async () => {
    setLoading(true);
    await fetch("/api/affiliate/links/bulk-sync", { method: "POST" }).catch(() => {});
    await fetchLinks();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Affiliate Links</h1>
          <p style={{ fontSize: "0.75rem", color: "#666" }}>{total} total links</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button onClick={syncAll} style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "0.8rem", cursor: "pointer" }}>
            Sync All Links
          </button>
          <Link href="/admin/affiliate" style={{ fontSize: "0.8rem", color: "#4A7BA8" }}>← Dashboard</Link>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#666" }}>Loading...</p>
      ) : links.length === 0 ? (
        <p style={{ color: "#666" }}>No links found. Sync advertisers first, then sync links.</p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem" }}>Name</th>
                  <th style={{ padding: "0.5rem" }}>Advertiser</th>
                  <th style={{ padding: "0.5rem" }}>Category</th>
                  <th style={{ padding: "0.5rem" }}>Lang</th>
                  <th style={{ padding: "0.5rem" }}>Clicks</th>
                  <th style={{ padding: "0.5rem" }}>Impressions</th>
                  <th style={{ padding: "0.5rem" }}>Active</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.5rem", maxWidth: "250px" }}>
                      <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {link.name}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {link.destinationUrl}
                      </div>
                    </td>
                    <td style={{ padding: "0.5rem", color: "#666" }}>{link.advertiser?.name || "—"}</td>
                    <td style={{ padding: "0.5rem", color: "#666" }}>{link.category || "—"}</td>
                    <td style={{ padding: "0.5rem" }}>{link.language}</td>
                    <td style={{ padding: "0.5rem", fontWeight: 600 }}>{link.clicks}</td>
                    <td style={{ padding: "0.5rem" }}>{link.impressions}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <span style={{ color: link.isActive ? "#22c55e" : "#ef4444" }}>
                        {link.isActive ? "✓" : "✗"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
              <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); setLoading(true); }} style={{ padding: "0.3rem 0.6rem", borderRadius: "4px", border: "1px solid #e5e7eb", background: "#fff", cursor: page > 1 ? "pointer" : "default", fontSize: "0.8rem" }}>
                ← Prev
              </button>
              <span style={{ fontSize: "0.8rem", padding: "0.3rem 0.5rem", color: "#666" }}>
                {page} / {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); setLoading(true); }} style={{ padding: "0.3rem 0.6rem", borderRadius: "4px", border: "1px solid #e5e7eb", background: "#fff", cursor: page < totalPages ? "pointer" : "default", fontSize: "0.8rem" }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
