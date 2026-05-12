import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

/** Redirect URL for OAuth — works for both local dev and GitHub Pages */
export function getOAuthRedirectUrl() {
  return window.location.origin + (import.meta.env.VITE_BASE_URL ?? '/')
}
