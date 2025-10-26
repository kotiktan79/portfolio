import { supabase } from '../lib/supabase';

export async function getAllTransactions() {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false });

  return data || [];
}

export async function getTotalDividends() {
  const { data } = await supabase.from('dividends').select('amount');

  if (!data) return 0;

  return data.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
}

export async function addTransaction(holdingId: string, type: 'buy' | 'sell', quantity: number, price: number) {
  await supabase.from('transactions').insert({
    holding_id: holdingId,
    transaction_type: type,
    quantity,
    price,
    total_amount: quantity * price,
    transaction_date: new Date().toISOString()
  });
}
