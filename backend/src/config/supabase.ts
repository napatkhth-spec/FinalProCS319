import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { HttpError } from '../utils/http-error.js'

export const PRODUCT_IMAGE_BUCKET = 'product-images'
let storageClient: SupabaseClient | undefined

export function getSupabaseStorageClient(): SupabaseClient {
  if (storageClient) return storageClient

  const url = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) throw new HttpError(503, 'Product image storage is not configured')

  storageClient = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  return storageClient
}
