import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Environment variables configured in .env.local
const supabaseUrl = 'https://ftybizjyqoezsmiqfmun.supabase.co';
const supabaseAnonKey = 'sb_publishable_E8MD06yHYlJzzvFwB5hsvQ_5MjQPkw2';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Please check your Cloudflare Pages settings.');
}

const validUrl = supabaseUrl;
const validKey = supabaseAnonKey;

// Create Supabase client with TypeScript types
export const supabase = createClient<Database>(validUrl, validKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});

// Helper type exports for better DX
export type { Database };
export type Tables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update'];
