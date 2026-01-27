import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let client;

if (supabaseUrl && supabaseAnonKey) {
    client = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.error('❌ Supabase Keys Missing! Authentication will fail.');
    // Mock client to prevent crash
    client = {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: async () => ({ data: { user: null }, error: { message: "⚠️ ERRO CRÍTICO: Chaves não configuradas (Verifique SUPABASE_SETUP.md)" } }),
            signOut: async () => { },
            signInWithOAuth: async () => ({ error: { message: "Chaves ausentes" } })
        }
    };
}

export const supabase = client as any;
