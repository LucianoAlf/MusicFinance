import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_REQUEST_TIMEOUT_MS = 15000;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment variables.');
}

function withTimeoutSignal(signal?: AbortSignal) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS);

  if (!signal) {
    return { signal: controller.signal, clear: () => window.clearTimeout(timeoutId) };
  }

  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return {
      signal: AbortSignal.any([signal, controller.signal]),
      clear: () => window.clearTimeout(timeoutId),
    };
  }

  if (signal.aborted) controller.abort();
  else signal.addEventListener('abort', () => controller.abort(), { once: true });

  return { signal: controller.signal, clear: () => window.clearTimeout(timeoutId) };
}

const noCrossTabLock = async <R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => await fn();

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const { signal, clear } = withTimeoutSignal(init.signal);

  try {
    return await fetch(input, { ...init, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Supabase request timed out after ${SUPABASE_REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clear();
  }
}

export function formatAppError(error: unknown, fallback = 'Erro inesperado. Tente novamente.') {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : fallback;

  const lower = message.toLowerCase();

  if (lower.includes('timed out') || lower.includes('timeout') || lower.includes('aborterror')) {
    return 'A operação demorou demais para responder. Tente novamente.';
  }
  if (lower.includes('duplicate key') || lower.includes('already exists') || lower.includes('409')) {
    return 'Esse registro já existe.';
  }
  if (lower.includes('violates row-level security') || lower.includes('permission denied')) {
    return 'Sua sessão não tem permissão para essa operação.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('fetch')) {
    return 'Falha de conexão com o servidor.';
  }

  return message || fallback;
}

// O Supabase armazena a sessão no localStorage sob a chave configurada em `storageKey`.
// Não limpar tokens aqui, senão o usuário perde a sessão a cada refresh.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    storageKey: 'musicfinance-auth',
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: true,
    // App é single-tab — desabilitar navigator.locks em TODOS os ambientes.
    // O lock padrão do Supabase (5s timeout) trava a inicialização quando há
    // lock órfão de sessão/aba anterior, causando INITIAL_SESSION timeout.
    lock: noCrossTabLock,
  },
});
