import { createClient } from '@supabase/supabase-js';

// Use a safe access pattern for env vars to support both Vite-replaced and raw environments.
// We cast to any to bypass TypeScript complaints about optional properties or strict null checks.
const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://yfuzrzctznihtdxqaody.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmdXpyemN0em5paHRkeHFhb2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDg4NjQsImV4cCI6MjA4MzU4NDg2NH0.A3ajfB12dmgDyhqtRd3CphjycSAiGtwwq8ipkdqbbRc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);