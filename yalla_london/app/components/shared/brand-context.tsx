"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getBrandProfile, type BrandProfile } from "@/lib/design/brand-provider";
import { getDefaultSiteId } from "@/config/sites";

// ─── Context Types ────────────────────────────────────────────────

interface BrandContextType {
  brand: BrandProfile | null;
  siteId: string;
  setSiteId: (id: string) => void;
  loading: boolean;
}

// ─── Default Context ──────────────────────────────────────────────

const BrandContext = createContext<BrandContextType>({
  brand: null,
  siteId: "",
  setSiteId: () => {},
  loading: true,
});

export { BrandContext };

// ─── Provider ─────────────────────────────────────────────────────

export function BrandProvider({
  children,
  defaultSiteId,
}: {
  children: ReactNode;
  defaultSiteId?: string;
}) {
  const initialSiteId = defaultSiteId || getDefaultSiteId();
  const [siteId, setSiteId] = useState<string>(initialSiteId);
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      const profile = getBrandProfile(siteId);
      setBrand(profile);
    } catch (err) {
      console.warn("[BrandContext] Failed to load brand profile for", siteId, err);
      // Fall back to default site brand
      try {
        const fallback = getBrandProfile("yalla-london");
        setBrand(fallback);
      } catch {
        console.warn("[BrandContext] Fallback brand profile also failed");
        setBrand(null);
      }
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  return (
    <BrandContext.Provider value={{ brand, siteId, setSiteId, loading }}>
      {children}
    </BrandContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useBrand(): BrandContextType {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}
