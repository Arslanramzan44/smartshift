import { createClient } from '@supabase/supabase-js'

const url =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://nctjfcdsxdeqfruezcub.supabase.co'
const anon =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdGpmY2RzeGRlcWZydWV6Y3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzk1OTQsImV4cCI6MjA5Njc1NTU5NH0.Je-F3iDigah-Wf8rJ_E4o6nB1VtFnAqJXR7woxgDUgM'

// Isolated storageKey keeps Admin auth completely separate from Customer/Mover/Warehouse sessions
// when Admin is mounted under /admin inside the main app.
export const supabase = createClient(url, anon, {
  auth: {
    storageKey: 'smartshift-admin-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

export const ADMIN_CREDENTIALS = {
  email: 'admin@smartshift.pk',
  password: 'AdminPassword123!',
}

let authPromise = null

// Ensure an authenticated ADMIN session with Supabase so admin RLS policies grant full visibility.
export async function ensureAdminSession() {
  if (authPromise) return authPromise

  authPromise = (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const currentUser = sessionData?.session?.user
      const isAlreadyAdmin =
        currentUser &&
        (currentUser.email === ADMIN_CREDENTIALS.email ||
          currentUser.app_metadata?.is_admin === true)

      if (isAlreadyAdmin) {
        return sessionData.session
      }

      // Sign in cleanly with the admin account
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
      })

      if (!signInErr && signInData?.session) {
        return signInData.session
      }

      if (signInErr) {
        console.error('Admin sign-in failed:', signInErr.message)
      }

      return null
    } catch (err) {
      console.error('ensureAdminSession error:', err)
      return null
    } finally {
      authPromise = null
    }
  })()

  return authPromise
}

// Generate signed URL for private documents in Supabase storage (mover-docs or warehouse-docs).
export async function getSignedDocUrl(path, expiresIn = 3600, bucket = 'mover-docs') {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }

  try {
    await ensureAdminSession()
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
    if (!error && data?.signedUrl) {
      return data.signedUrl
    }
    const pub = supabase.storage.from(bucket).getPublicUrl(path)
    return pub?.data?.publicUrl || null
  } catch (err) {
    console.warn(`Failed to generate signed URL (${bucket}/${path}):`, err)
    return null
  }
}

// Verify admin connection and schema readiness (profiles.verification_status + warehouses table)
export async function checkDatabaseSchema() {
  try {
    const session = await ensureAdminSession()
    if (!session) {
      return {
        isConnected: false,
        hasVerificationColumn: false,
        hasWarehousesTable: false,
        message: 'Could not authenticate admin@smartshift.pk session.',
      }
    }

    const [profCheck, whCheck] = await Promise.all([
      supabase.from('profiles').select('verification_status').limit(1),
      supabase.from('warehouses').select('id').limit(1),
    ])

    const hasVerificationColumn = !profCheck.error
    const hasWarehousesTable = !whCheck.error

    if (!hasVerificationColumn || !hasWarehousesTable) {
      return {
        isConnected: true,
        hasVerificationColumn,
        hasWarehousesTable,
        message: 'Run supabase/warehouse_and_admin.sql in Supabase SQL editor to sync schema.',
      }
    }

    return {
      isConnected: true,
      hasVerificationColumn: true,
      hasWarehousesTable: true,
      message: 'Supabase live database & warehouse schema synchronized.',
    }
  } catch (err) {
    return {
      isConnected: false,
      hasVerificationColumn: false,
      hasWarehousesTable: false,
      message: err.message,
    }
  }
}
