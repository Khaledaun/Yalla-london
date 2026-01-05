/**
 * Affiliate Tracking Types
 */

export type PartnerType =
  | 'HOTEL'
  | 'EXPERIENCE'
  | 'INSURANCE'
  | 'FLIGHT'
  | 'TRANSFER'
  | 'EQUIPMENT';

export type ConversionStatus =
  | 'PENDING'
  | 'BOOKED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PAID';

export interface AffiliatePartner {
  id: string;
  name: string;
  slug: string;
  partner_type: PartnerType;
  commission_type: string;
  commission_rate: number;
  cookie_days: number;
  api_url: string | null;
  tracking_domain: string | null;
  affiliate_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AffiliateClick {
  id: string;
  site_id: string;
  partner_id: string;
  resort_id: string | null;
  product_id: string | null;
  article_id: string | null;
  link_type: string | null;
  session_id: string;
  visitor_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_page: string | null;
  user_agent: string | null;
  device_type: string | null;
  country_code: string | null;
  clicked_at: Date;
}

export interface Conversion {
  id: string;
  site_id: string;
  click_id: string;
  partner_id: string;
  booking_ref: string | null;
  booking_value: number;
  commission: number;
  currency: string;
  status: ConversionStatus;
  check_in: Date | null;
  check_out: Date | null;
  converted_at: Date;
  confirmed_at: Date | null;
  paid_at: Date | null;
}

export interface TrackClickInput {
  site_id: string;
  partner_id: string;
  resort_id?: string;
  product_id?: string;
  article_id?: string;
  link_type?: string;
  session_id: string;
  visitor_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_page?: string;
  user_agent?: string;
}

export interface RecordConversionInput {
  click_id: string;
  booking_ref?: string;
  booking_value: number;
  commission: number;
  currency?: string;
  check_in?: Date;
  check_out?: Date;
}

export interface AffiliateStats {
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  total_commission: number;
  conversion_rate: number;
  average_order_value: number;
  average_commission: number;
}
