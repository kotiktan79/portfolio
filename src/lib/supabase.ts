import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bjlacudluhvncxtrcixa.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqbGFjdWRsdWh2bmN4dHJjaXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDM0MjQsImV4cCI6MjA3NzUxOTQyNH0.7CDBNzIKM0z6UQ7lzFcsLs0o_gG0tMQgLLuYwhy0URg';

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
  manual_price?: boolean;
  manual_price_updated_at?: string;
  price_notes?: string;
  cost_basis?: number;
  unrealized_pnl?: number;
  unrealized_pnl_percent?: number;
  total_realized_pnl?: number;
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
