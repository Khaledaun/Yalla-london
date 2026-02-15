/**
 * Zenitha.Luxury LLC — Parent Entity Configuration
 *
 * Single source of truth for all legal, brand, and structural identity.
 * Every site, footer, legal page, and API references this config.
 *
 * Structure:
 *   Zenitha.Luxury LLC (umbrella)
 *   ├── Content Arm — travel blogs (Yalla London, Arabaldives, etc.)
 *   └── Tech Arm — travel tech products (ZenithaOS, future SaaS)
 */

export interface EntityConfig {
  /** Legal entity name as registered */
  legalName: string;
  /** Consumer-facing brand name */
  brandName: string;
  /** State/jurisdiction of formation */
  jurisdiction: string;
  /** Entity type */
  entityType: string;
  /** Year of formation */
  formationYear: number;
  /** EIN country */
  country: string;

  /** Founder / principal */
  founder: {
    name: string;
    title: string;
  };

  /** Contact channels — legal vs. general */
  contact: {
    legalEmail: string;
    generalEmail: string;
    website?: string;
  };

  /** Business arms under the umbrella */
  arms: {
    content: {
      name: string;
      description: string;
      /** Site IDs that belong to this arm */
      siteIds: string[];
    };
    tech: {
      name: string;
      description: string;
      /** Product identifiers under this arm */
      products: string[];
    };
  };

  /** Copyright and legal boilerplate */
  legal: {
    copyrightStartYear: number;
    /** Used in privacy policy, terms, etc. */
    dataControllerStatement: {
      en: string;
      ar: string;
    };
    /** Footer entity disclosure line */
    brandDisclosure: {
      en: (siteName: string) => string;
      ar: (siteName: string) => string;
    };
  };
}

export const ENTITY: EntityConfig = {
  legalName: "Zenitha.Luxury LLC",
  brandName: "Zenitha",
  jurisdiction: "Delaware",
  entityType: "Limited Liability Company",
  formationYear: 2025,
  country: "US",

  founder: {
    name: "Khaled N. Aun",
    title: "Founder & CEO",
  },

  contact: {
    legalEmail: "legal@zenitha.luxury",
    generalEmail: "hello@zenitha.luxury",
    website: "https://zenitha.luxury",
  },

  arms: {
    content: {
      name: "Zenitha Content Network",
      description:
        "Multi-destination luxury travel content platform. Bilingual (EN/AR) blogs targeting Arab travelers with affiliate monetization.",
      siteIds: ["yalla-london", "arabaldives", "dubai", "istanbul", "thailand"],
    },
    tech: {
      name: "ZenithaOS",
      description:
        "Travel technology and white-label reseller platform.",
      products: ["zenithaos"],
    },
  },

  legal: {
    copyrightStartYear: 2025,
    dataControllerStatement: {
      en: "Zenitha.Luxury LLC is the data controller for all personal information collected through this website.",
      ar: "شركة Zenitha.Luxury LLC هي المتحكم في البيانات لجميع المعلومات الشخصية المجمعة عبر هذا الموقع.",
    },
    brandDisclosure: {
      en: (siteName: string) =>
        `${siteName} is a brand of Zenitha.Luxury LLC, a Delaware limited liability company.`,
      ar: (siteName: string) =>
        `${siteName} هي علامة تجارية لشركة Zenitha.Luxury LLC، شركة ذات مسؤولية محدودة في ديلاوير.`,
    },
  },
};

/** Helper: get copyright line for any year */
export function getCopyrightLine(language: "en" | "ar"): string {
  const currentYear = new Date().getFullYear();
  const yearRange =
    currentYear > ENTITY.legal.copyrightStartYear
      ? `${ENTITY.legal.copyrightStartYear}–${currentYear}`
      : `${ENTITY.legal.copyrightStartYear}`;

  return language === "en"
    ? `© ${yearRange} ${ENTITY.legalName}. All rights reserved.`
    : `© ${yearRange} ${ENTITY.legalName}. جميع الحقوق محفوظة.`;
}

/** Helper: get brand disclosure for a specific site */
export function getBrandDisclosure(
  siteName: string,
  language: "en" | "ar",
): string {
  return ENTITY.legal.brandDisclosure[language](siteName);
}

/** Helper: check if a site ID belongs to the content arm */
export function isContentSite(siteId: string): boolean {
  return ENTITY.arms.content.siteIds.includes(siteId);
}
