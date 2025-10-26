import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jsqsfkyyopjfloxsqrbs.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXNma3l5b3BqZmxveHNxcmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjc2MjAsImV4cCI6MjA3Njc0MzYyMH0.9d2gqIFCqXfPT72OjwARQOYuxjYCcy3bOK8FHII2ak8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AssetType = 'stock' | 'crypto' | 'currency' | 'fund' | 'eurobond' | 'commodity';
export type TransactionType = 'deposit' | 'withdrawal' | 'buy' | 'sell' | 'dividend';

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

export interface CashBalance {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  total_deposits: number;
  total_withdrawals: number;
  realized_profit: number;
  updated_at: string;
}

export interface CashTransaction {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  currency: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  related_holding_id?: string;
  notes?: string;
  created_at: string;
}
