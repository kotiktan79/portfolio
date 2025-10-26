import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL:', supabaseUrl);
  console.error('Supabase Key:', supabaseAnonKey ? 'EXISTS' : 'MISSING');
  throw new Error(`Missing Supabase environment variables - URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AssetType = 'stock' | 'crypto' | 'commodity' | 'forex' | 'fund';

export interface Holding {
  id: string;
  user_id?: string;
  symbol: string;
  asset_type: AssetType;
  quantity: number;
  purchase_price: number;
  current_price: number;
  created_at?: string;
  updated_at?: string;
}
