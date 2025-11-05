import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const BUCKET_NAME = 'submissions'

// Create Supabase client with service role key for server-side operations
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function uploadFileToR2(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const key = `${Date.now()}-${fileName}`

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(key, file, {
      contentType,
      upsert: false,
    })

  if (error) {
    console.error('Supabase upload error:', error)
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  // Return the path/key
  return data.path
}

export async function getFileUrl(key: string): Promise<string> {
  const { data } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(key)

  return data.publicUrl
}

export function getPublicUrl(key: string): string {
  const { data } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(key)

  return data.publicUrl
}
