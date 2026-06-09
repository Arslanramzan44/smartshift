import { supabase } from './supabase'

// Upload a file into "<userId>/<label>-<timestamp>.<ext>" inside a bucket.
// Returns the public URL for the public "avatars" bucket, else the storage path.
export async function uploadFile(bucket, userId, file, label) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${label}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error
  if (bucket === 'avatars') {
    return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
  }
  return path
}

// Signed URL for private mover-docs files (valid 1 hour).
export async function signedUrl(path, expiresIn = 3600) {
  if (!path) return null
  const { data, error } = await supabase.storage.from('mover-docs').createSignedUrl(path, expiresIn)
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
