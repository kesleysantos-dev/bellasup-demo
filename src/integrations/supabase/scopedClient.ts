import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Isolated Supabase client for /afiliado and /super-admin routes.
// Uses sessionStorage so each browser tab maintains its own independent
// session, completely separate from the main localStorage session used
// by /admin. Logging in here never overwrites the manicure session.
export const supabaseScoped = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: window.sessionStorage,
    storageKey: 'bellasup-scoped-auth',
    persistSession: true,
    autoRefreshToken: true,
  },
});
