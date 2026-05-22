// src/supabaseClient.js
// ══════════════════════════════════════════════════════════════
// กรอก URL และ Key จาก Supabase Dashboard
// Project Settings → API → Project URL & anon/public key
// ══════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('❌ กรุณากำหนด VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
