import { supabase } from '../lib/supabase';

export interface Transaction {
  id: string;
  holding_id: string;
  transaction_type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total_amount: number;
  fee: number;
  notes?: string;
  transaction_date: string;
  created_at: string;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  target_price: number;
  condition: 'above' | 'below';
  is_active: boolean;
  triggered_at?: string;
  created_at: string;
}

export interface Dividend {
  id: string;
  holding_id: string;
  amount: number;
  payment_date: string;
  notes?: string;
  created_at: string;
}

export async function addTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getTransactionsByHolding(holdingId: string): Promise<Transaction[]> {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('holding_id', holdingId)
    .order('transaction_date', { ascending: false });

  return data || [];
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false });

  return data || [];
}

export async function addPriceAlert(alert: Omit<PriceAlert, 'id' | 'created_at' | 'triggered_at'>) {
  const { data, error } = await supabase
    .from('price_alerts')
    .insert([alert])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getActivePriceAlerts(): Promise<PriceAlert[]> {
  const { data } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return data || [];
}

export async function checkAndTriggerAlerts(symbol: string, currentPrice: number) {
  const { data: alerts } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('symbol', symbol)
    .eq('is_active', true);

  if (!alerts) return [];

  const triggeredAlerts = alerts.filter((alert) => {
    if (alert.condition === 'above' && currentPrice >= alert.target_price) return true;
    if (alert.condition === 'below' && currentPrice <= alert.target_price) return true;
    return false;
  });

  for (const alert of triggeredAlerts) {
    await supabase
      .from('price_alerts')
      .update({ is_active: false, triggered_at: new Date().toISOString() })
      .eq('id', alert.id);
  }

  return triggeredAlerts;
}

export async function deletePriceAlert(id: string) {
  const { error } = await supabase.from('price_alerts').delete().eq('id', id);
  if (error) throw error;
}

export async function addDividend(dividend: Omit<Dividend, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('dividends')
    .insert([dividend])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getDividendsByHolding(holdingId: string): Promise<Dividend[]> {
  const { data } = await supabase
    .from('dividends')
    .select('*')
    .eq('holding_id', holdingId)
    .order('payment_date', { ascending: false });

  return data || [];
}

export async function getAllDividends(): Promise<Dividend[]> {
  const { data } = await supabase
    .from('dividends')
    .select('*')
    .order('payment_date', { ascending: false });

  return data || [];
}

export async function getTotalDividends(): Promise<number> {
  const dividends = await getAllDividends();
  return dividends.reduce((sum, d) => sum + Number(d.amount), 0);
}

export function calculateAverageCost(transactions: Transaction[]): number {
  const buyTransactions = transactions.filter((t) => t.transaction_type === 'buy');
  if (buyTransactions.length === 0) return 0;

  const totalCost = buyTransactions.reduce((sum, t) => sum + t.total_amount + t.fee, 0);
  const totalQuantity = buyTransactions.reduce((sum, t) => sum + t.quantity, 0);

  return totalQuantity > 0 ? totalCost / totalQuantity : 0;
}

export function calculateRealizedPnL(transactions: Transaction[]): number {
  const buyTransactions = transactions.filter((t) => t.transaction_type === 'buy');
  const sellTransactions = transactions.filter((t) => t.transaction_type === 'sell');

  const totalBuyCost = buyTransactions.reduce((sum, t) => sum + t.total_amount + t.fee, 0);
  const totalSellRevenue = sellTransactions.reduce((sum, t) => sum + t.total_amount - t.fee, 0);

  return totalSellRevenue - totalBuyCost;
}
