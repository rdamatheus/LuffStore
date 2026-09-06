import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://asotrfqaqcbhkjuvkncw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_MNUBzU55wlWps1TYdQYiQw_mgiL-4cS';

export const TENANT_SLUG = 'luff-store';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: 'luff' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
