import { createClient } from '@supabase/supabase-js';

// Use a safe access pattern for env vars to support both Vite-replaced and raw environments.
// We cast to any to avoid TypeScript complaints about optional properties or strict null checks.
const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://mxwwjjdytjxwxjdtbdez.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14d3dqamR5dGp4d3hqZHRiZGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MDQxNTMsImV4cCI6MjA4Mjk4MDE1M30.SaFndrvFMZSrW1nA_0nXIWtHpQ9quLG45jtnC7mPDnA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);