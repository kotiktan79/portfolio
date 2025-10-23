import { supabase } from '../lib/supabase';

export interface PnLData {
  period: string;
  value: number;
  percentage: number;
  change: number;
}

export interface PortfolioSnapshot {
  date: string;
  total_value: number;
  total_investment: number;
  total_pnl: number;
  pnl_percentage: number;
}

export interface AssetAllocation {
  symbol: string;
  asset_type: string;
  value: number;
  percentage: number;
  target_percentage: number;
  rebalance_amount: number;
}

export async function savePortfolioSnapshot(
  totalValue: number,
  totalInvestment: number,
  totalPnl: number,
  pnlPercentage: number
) {
  const today = new Date().toISOString().split('T')[0];

  const { data: existingSnapshot } = await supabase
    .from('portfolio_snapshots')
    .select('id')
    .eq('snapshot_date', today)
    .maybeSingle();

  if (existingSnapshot) {
    await supabase
      .from('portfolio_snapshots')
      .update({
        total_value: totalValue,
        total_investment: totalInvestment,
        total_pnl: totalPnl,
        pnl_percentage: pnlPercentage,
      })
      .eq('id', existingSnapshot.id);
  } else {
    await supabase.from('portfolio_snapshots').insert([
      {
        total_value: totalValue,
        total_investment: totalInvestment,
        total_pnl: totalPnl,
        pnl_percentage: pnlPercentage,
        snapshot_date: today,
      },
    ]);
  }
}

export async function getPnLData(): Promise<{
  daily: PnLData;
  weekly: PnLData;
  monthly: PnLData;
}> {
  const { data: snapshots } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(60);

  if (!snapshots || snapshots.length === 0) {
    return {
      daily: { period: 'Günlük', value: 0, percentage: 0, change: 0 },
      weekly: { period: 'Haftalık', value: 0, percentage: 0, change: 0 },
      monthly: { period: 'Aylık', value: 0, percentage: 0, change: 0 },
    };
  }

  const current = snapshots[0];
  const yesterday = snapshots.find((_s, i) => i >= 1);
  const lastWeek = snapshots.find((_s, i) => i >= 7);
  const lastMonth = snapshots.find((_s, i) => i >= 30);

  const calculateChange = (
    current: PortfolioSnapshot,
    previous?: PortfolioSnapshot
  ) => {
    if (!previous) return { value: 0, percentage: 0, change: 0 };
    const change = current.total_value - previous.total_value;
    const percentage = ((change / previous.total_value) * 100);
    return { value: current.total_value, percentage, change };
  };

  return {
    daily: { period: 'Günlük', ...calculateChange(current, yesterday) },
    weekly: { period: 'Haftalık', ...calculateChange(current, lastWeek) },
    monthly: { period: 'Aylık', ...calculateChange(current, lastMonth) },
  };
}

export async function getHistoricalSnapshots(days: number): Promise<PortfolioSnapshot[]> {
  const { data } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: true })
    .limit(days);

  if (!data) return [];

  return data.map((snapshot) => ({
    date: snapshot.snapshot_date,
    total_value: snapshot.total_value,
    total_investment: snapshot.total_investment,
    total_pnl: snapshot.total_pnl,
    pnl_percentage: snapshot.pnl_percentage,
  }));
}

export function calculateRebalance(
  holdings: Array<{
    symbol: string;
    asset_type: string;
    current_price: number;
    quantity: number;
  }>,
  targetAllocations: Record<string, number>
): AssetAllocation[] {
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.current_price * h.quantity,
    0
  );

  const allocations: AssetAllocation[] = holdings.map((holding) => {
    const value = holding.current_price * holding.quantity;
    const percentage = (value / totalValue) * 100;
    const targetPercentage = targetAllocations[holding.asset_type] || 0;
    const targetValue = (totalValue * targetPercentage) / 100;
    const rebalanceAmount = targetValue - value;

    return {
      symbol: holding.symbol,
      asset_type: holding.asset_type,
      value,
      percentage,
      target_percentage: targetPercentage,
      rebalance_amount: rebalanceAmount,
    };
  });

  return allocations.sort((a, b) => b.value - a.value);
}

export function getDefaultTargetAllocations(): Record<string, number> {
  return {
    stock: 40,
    crypto: 20,
    currency: 15,
    fund: 15,
    eurobond: 5,
    commodity: 5,
  };
}
