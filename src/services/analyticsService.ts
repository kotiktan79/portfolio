import { supabase } from '../lib/supabase';

export interface PnLData {
  totalValue: number;
  totalInvestment: number;
  pnl: number;
  pnlPercentage: number;
}

export async function getPnLData(period: 'daily' | 'weekly' | 'monthly'): Promise<PnLData> {
  const { data: holdings } = await supabase.from('holdings').select('*');

  if (!holdings || holdings.length === 0) {
    return { totalValue: 0, totalInvestment: 0, pnl: 0, pnlPercentage: 0 };
  }

  const totalValue = holdings.reduce((sum, h) => sum + (h.current_price * h.quantity), 0);
  const totalInvestment = holdings.reduce((sum, h) => sum + (h.purchase_price * h.quantity), 0);
  const pnl = totalValue - totalInvestment;
  const pnlPercentage = totalInvestment > 0 ? (pnl / totalInvestment) * 100 : 0;

  return { totalValue, totalInvestment, pnl, pnlPercentage };
}

export async function savePortfolioSnapshot(totalValue: number, totalInvestment: number, pnl: number, pnlPercentage: number) {
  await supabase.from('portfolio_snapshots').insert({
    total_value: totalValue,
    total_investment: totalInvestment,
    total_pnl: pnl,
    pnl_percentage: pnlPercentage,
    snapshot_date: new Date().toISOString().split('T')[0]
  });
}

export function calculateRebalance(holdings: any[], targetAllocations: Record<string, number>) {
  return [];
}

export function getDefaultTargetAllocations(): Record<string, number> {
  return {
    stock: 50,
    crypto: 20,
    commodity: 15,
    forex: 10,
    fund: 5
  };
}

export async function getHistoricalSnapshots(days: number = 30) {
  const { data } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: true })
    .limit(days);

  return data || [];
}
