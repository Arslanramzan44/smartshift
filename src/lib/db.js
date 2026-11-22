import { supabase } from './supabase'

const PUBLIC_BUCKETS = ['avatars', 'warehouse-photos']

// Upload a file into "<userId>/<label>-<timestamp>.<ext>" inside a bucket.
// Returns the public URL for public buckets, else the storage path.
export async function uploadFile(bucket, userId, file, label) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/${label}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  })
  if (error) throw error
  if (PUBLIC_BUCKETS.includes(bucket)) {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }
  return path
}

// Signed URL for private mover-docs or warehouse-docs files (valid 1 hour).
export async function signedUrl(path, expiresIn = 3600, bucket = 'mover-docs') {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) return null
  return data.signedUrl
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function upsertProfile(profile) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}
