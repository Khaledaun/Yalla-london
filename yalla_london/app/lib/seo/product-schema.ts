/**
 * Product JSON-LD helpers aligned with Google's 2024+ Merchant Listing requirements.
 *
 * Google requires, on every Product Offer:
 *   - brand.@type = "Brand" (NOT "Organization" — flagged as "invalid object type")
 *   - hasMerchantReturnPolicy (MerchantReturnPolicy)
 *   - shippingDetails (OfferShippingDetails)
 *
 * For digital goods (downloads, PDFs, digital guides) shippingRate is 0 and
 * delivery is instant (0 days handling + 0 days transit).
 *
 * Refs:
 *   https://developers.google.com/search/docs/appearance/structured-data/product
 *   https://developers.google.com/search/docs/appearance/structured-data/merchant-return-policy
 *   https://developers.google.com/search/docs/appearance/structured-data/product-shipping
 */

export type DigitalOfferInput = {
  price: string | number;
  priceCurrency?: string;
  availability?: string;
  url: string;
  sellerName: string;
  country?: string; // ISO-3166 alpha-2, defaults to "GB"
  returnDays?: number; // defaults to 14
};

export type ProductSchemaInput = {
  name: string;
  description: string;
  image: string;
  brandName: string;
  category?: string;
  sku?: string;
  offer: DigitalOfferInput;
};

export function buildDigitalShippingDetails(country = "GB", currency = "GBP") {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: "0",
      currency,
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: country,
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
    },
  };
}

export function buildDigitalReturnPolicy(country = "GB", returnDays = 14) {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: country,
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: returnDays,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/FreeReturn",
  };
}

export function buildDigitalOffer(offer: DigitalOfferInput) {
  const currency = offer.priceCurrency || "GBP";
  const country = offer.country || "GB";
  return {
    "@type": "Offer",
    price: String(offer.price),
    priceCurrency: currency,
    availability: offer.availability || "https://schema.org/InStock",
    url: offer.url,
    seller: { "@type": "Organization", name: offer.sellerName },
    hasMerchantReturnPolicy: buildDigitalReturnPolicy(country, offer.returnDays),
    shippingDetails: buildDigitalShippingDetails(country, currency),
  };
}

export function buildDigitalProductSchema(input: ProductSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.image,
    // Product.brand MUST use @type: "Brand" — Google flags "Organization" as invalid
    brand: { "@type": "Brand", name: input.brandName },
    offers: buildDigitalOffer(input.offer),
    ...(input.category ? { category: input.category } : {}),
    ...(input.sku ? { sku: input.sku } : {}),
  };
}
