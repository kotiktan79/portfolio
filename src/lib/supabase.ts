import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AssetType = 'stock' | 'crypto' | 'currency' | 'fund' | 'eurobond' | 'commodity';

export interface Holding {
  id: string;
  symbol: string;
  asset_type: AssetType;
  purchase_price: number;
  quantity: number;
  current_price: number;
  created_at: string;
  updated_at: string;
}
