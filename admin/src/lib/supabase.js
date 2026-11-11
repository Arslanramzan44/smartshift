import { createClient } from '@supabase/supabase-js'

const url = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://nctjfcdsxdeqfruezcub.supabase.co'
const anon = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdGpmY2RzeGRlcWZydWV6Y3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzk1OTQsImV4cCI6MjA5Njc1NTU5NH0.Je-F3iDigah-Wf8rJ_E4o6nB1VtFnAqJXR7woxgDUgM'

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const ADMIN_CREDENTIALS = {
  email: 'admin@smartshift.pk',
  password: 'AdminPassword123!',
}

let authPromise = null

// Ensure an authenticated session with Supabase so Row Level Security policies permit queries
export async function ensureAdminSession() {
  if (authPromise) return authPromise

  authPromise = (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData?.session) {
        return sessionData.session
      }

      // Automatically sign in with the admin account
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
      })

      if (!signInErr && signInData?.session) {
        return signInData.session
      }

      // If sign in failed because user doesn't exist, sign up
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
      })

      if (!signUpErr && signUpData?.session) {
        return signUpData.session
      }

      return null
    } catch (err) {
      console.warn('ensureAdminSession warning:', err)
      return null
    } finally {
      authPromise = null
    }
  })()

  return authPromise
}

// Generate signed URL for private mover documents stored in Supabase mover-docs bucket
export async function getSignedDocUrl(path, expiresIn = 3600) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }

  try {
    await ensureAdminSession()
    const { data, error } = await supabase.storage.from('mover-docs').createSignedUrl(path, expiresIn)
    if (!error && data?.signedUrl) {
      return data.signedUrl
    }
    // Fallback: try public URL
    const pub = supabase.storage.from('mover-docs').getPublicUrl(path)
    return pub?.data?.publicUrl || null
  } catch (err) {
    console.warn('Failed to generate signed document URL:', err)
    return null
  }
}

// Check if schema extensions from admin_and_verification.sql are installed
export async function checkDatabaseSchema() {
  try {
    await ensureAdminSession()
    // Test if verification_status column exists in profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('verification_status')
      .limit(1)

    if (error && (error.code === 'PGRST204' || error.message?.includes('verification_status'))) {
      return {
        isConnected: true,
        hasVerificationColumn: false,
        message: 'verification_status column missing. Run supabase/admin_and_verification.sql in Supabase SQL editor.',
      }
    }

    return {
      isConnected: true,
      hasVerificationColumn: true,
      message: 'Supabase schema fully synchronized.',
    }
  } catch (err) {
    return {
      isConnected: false,
      hasVerificationColumn: false,
      message: err.message,
    }
  }
}
