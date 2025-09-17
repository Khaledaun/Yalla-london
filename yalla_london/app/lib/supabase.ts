/**
 * Supabase Client Utility with Build-time Compatibility
 * Handles graceful fallback when environment variables are not available during build
 */

import { createClient } from '@supabase/supabase-js'

// Mock Supabase client for build compatibility
const mockSupabaseClient = {
  from: () => ({
    select: () => ({ 
      eq: () => ({ 
        gte: () => ({ 
          order: () => ({ 
            limit: () => ({ 
              single: () => Promise.resolve({ data: null, error: null }) 
            }),
            range: () => Promise.resolve({ data: [], error: null, count: 0 })
          })
        })
      })
    }),
    insert: () => ({ 
      select: () => ({ 
        single: () => Promise.resolve({ data: null, error: null }) 
      })
    }),
    update: () => ({ 
      eq: () => ({ 
        select: () => ({ 
          single: () => Promise.resolve({ data: null, error: null }) 
        })
      })
    }),
    delete: () => ({ 
      eq: () => Promise.resolve({ data: null, error: null }) 
    })
  }),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null })
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } })
    })
  }
}

let supabaseInstance: any = null

/**
 * Get Supabase client with build-time compatibility
 * Returns mock client during build when environment variables are not available
 */
export function getSupabaseClient() {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Check if we have the required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.log('Supabase environment variables not available, using mock client for build compatibility')
    supabaseInstance = mockSupabaseClient
    return supabaseInstance
  }

  try {
    // Create real Supabase client
    supabaseInstance = createClient(supabaseUrl, supabaseKey)
    return supabaseInstance
  } catch (error) {
    console.warn('Failed to create Supabase client, using mock client:', error)
    supabaseInstance = mockSupabaseClient
    return supabaseInstance
  }
}

/**
 * Check if we have a real Supabase client available
 */
export function isSupabaseAvailable(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Export default client instance
export const supabase = getSupabaseClient()