import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AssetType = 'stock' | 'crypto' | 'commodity' | 'currency' | 'fund' | 'eurobond';

export interface Holding {
  id: string;
  user_id: string;
  symbol: string;
  asset_type: AssetType;
  quantity: number;
  purchase_price: number;
  current_price: number;
  created_at: string;
  updated_at: string;
}
