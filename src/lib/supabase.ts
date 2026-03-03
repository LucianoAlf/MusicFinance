import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bbplmivormqcoiltteox.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJicGxtaXZvcm1xY29pbHR0ZW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTgxOTAsImV4cCI6MjA4ODEzNDE5MH0.J6kJNmfCGTEzXOlGDUp2WWEEX_pACK5uwp88CX4VeRY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
