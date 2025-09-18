/**
 * Supabase Client Configuration for PR #44
 * Provides graceful fallback when Supabase is not configured
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
export const isSupabaseAvailable = (): boolean => {
  return !!(supabaseUrl && (supabaseServiceKey || supabaseAnonKey))
}

// Mock Supabase client for build compatibility
const createMockSupabaseClient = () => {
  const mockClient = {
    from: (table: string) => ({
      select: (columns?: string, options?: any) => Promise.resolve({ data: [], error: null }),
      insert: (data: any) => Promise.resolve({ data: null, error: null }),
      update: (data: any) => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      upsert: (data: any) => Promise.resolve({ data: null, error: null })
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signIn: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null })
    },
    storage: {
      from: (bucket: string) => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        list: () => Promise.resolve({ data: [], error: null })
      })
    },
    rpc: (fn: string, params?: any) => Promise.resolve({ data: null, error: null })
  }

  return mockClient as unknown as SupabaseClient
}

// Create Supabase client with fallback
export const getSupabaseClient = (): SupabaseClient => {
  if (!isSupabaseAvailable()) {
    console.log('ℹ️  Supabase not configured, using mock client for build compatibility')
    return createMockSupabaseClient()
  }

  try {
    // Use service role key if available (for server-side operations)
    const key = supabaseServiceKey || supabaseAnonKey!
    
    return createClient(supabaseUrl!, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  } catch (error) {
    console.warn('Failed to create Supabase client, using mock client:', error)
    return createMockSupabaseClient()
  }
}

// Singleton instance
let supabaseClient: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = getSupabaseClient()
  }
  return supabaseClient
}

// Browser client for client-side operations
export const createBrowserClient = (): SupabaseClient => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('ℹ️  Browser Supabase client not configured, using mock')
    return createMockSupabaseClient()
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  })
}

// Server client for server-side operations  
export const createServerClient = (): SupabaseClient => {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('ℹ️  Server Supabase client not configured, using mock')
    return createMockSupabaseClient()
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Configuration validation
export const validateSupabaseConfig = () => {
  const config = {
    url: !!supabaseUrl,
    serviceKey: !!supabaseServiceKey,
    anonKey: !!supabaseAnonKey,
    isAvailable: isSupabaseAvailable()
  }

  console.log('🔍 Supabase Configuration Status:')
  console.log(`   URL configured: ${config.url}`)
  console.log(`   Service key configured: ${config.serviceKey}`)
  console.log(`   Anon key configured: ${config.anonKey}`)
  console.log(`   Client available: ${config.isAvailable}`)

  return config
}

// Export types for use in other modules
export type { SupabaseClient }

// Default export
export default getSupabase