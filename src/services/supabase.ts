import { createClient } from '@supabase/supabase-js';

// Use a safe access pattern for env vars to support both Vite-replaced and raw environments.
// We cast to any to bypass TypeScript complaints about optional properties or strict null checks.
const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://djxtylesnpomcjkxgcex.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeHR5bGVzbnBvbWNqa3hnY2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0Nzc5MzYsImV4cCI6MjA4MzA1MzkzNn0.ycTt-J9FnJdSLRcFrH2mUX6FTKI_Ap_pSyVMd-5Ge4s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);