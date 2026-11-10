import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://nctjfcdsxdeqfruezcub.supabase.co'
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdGpmY2RzeGRlcWZydWV6Y3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzk1OTQsImV4cCI6MjA5Njc1NTU5NH0.Je-F3iDigah-Wf8rJ_E4o6nB1VtFnAqJXR7woxgDUgM'

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
