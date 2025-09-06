
export interface BlogPost {
  id: string
  title_en: string
  title_ar: string
  slug: string
  excerpt_en?: string | null
  excerpt_ar?: string | null
  content_en: string
  content_ar: string
  featured_image?: string | null
  published: boolean
  category_id: string
  author_id: string
  meta_title_en?: string | null
  meta_title_ar?: string | null
  meta_description_en?: string | null
  meta_description_ar?: string | null
  tags: string[]
  created_at: Date
  updated_at: Date
  category: Category
  author: User
}

export interface Category {
  id: string
  name_en: string
  name_ar: string
  slug: string
  description_en?: string | null
  description_ar?: string | null
  image_url?: string | null
  created_at: Date
  updated_at: Date
}

export interface Recommendation {
  id: string
  name_en: string
  name_ar: string
  type: string
  category: string
  description_en: string
  description_ar: string
  address_en: string
  address_ar: string
  phone?: string | null
  website?: string | null
  price_range?: string | null
  rating?: number | null
  images: string[]
  features_en: string[]
  features_ar: string[]
  booking_url?: string | null
  latitude?: number | null
  longitude?: number | null
  published: boolean
  created_at: Date
  updated_at: Date
}

export interface User {
  id: string
  name?: string | null
  email: string
  emailVerified?: Date | null
  image?: string | null
}

export interface ContentGeneration {
  id: string
  prompt: string
  response: string
  type: string
  language: string
  used: boolean
  created_at: Date
}

export type Language = 'en' | 'ar'

export interface LanguageContent {
  en: string
  ar: string
}
