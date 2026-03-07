import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment variables.');
}

// O Supabase armazena a sessão no localStorage sob a chave configurada em `storageKey`.
// NÃO limpar tokens de sessão aqui — isso causaria logout automático a cada F5.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'musicfinance-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Desabilitar navigator.locks — o lock padrão do Supabase (5s timeout)
    // trava a inicialização em HMR/refresh quando há lock órfão de instância anterior.
    // App é single-tab, não precisa de cross-tab lock.
    lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => await fn(),
  },
});
