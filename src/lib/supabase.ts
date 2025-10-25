import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AssetType = 'stock' | 'crypto' | 'forex' | 'commodity' | 'bond' | 'fund';

export interface Holding {
  id: string;
  user_id: string;
  name: string;
  symbol: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  asset_type: AssetType;
  notes?: string;
  target_allocation?: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  holding_id: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total_value: number;
  notes?: string;
  transaction_date: string;
  created_at: string;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  holding_id: string;
  target_price: number;
  condition: 'above' | 'below';
  is_active: boolean;
  triggered_at?: string;
  created_at: string;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  total_value: number;
  total_investment: number;
  profit_loss: number;
  profit_loss_percentage: number;
  snapshot_date: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  title: string;
  description: string;
  earned_at: string;
}
