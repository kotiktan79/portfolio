import { supabase } from '../lib/supabase';
import { normalizeToBaseCurrency } from './currencyService';

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
  pnlPercentage: number,
  holdings?: any[]
) {
  const today = new Date().toISOString().split('T')[0];

  let normalizedValue = totalValue;
  let normalizedInvestment = totalInvestment;
  let normalizedPnl = totalPnl;

  if (holdings && holdings.length > 0) {
    const normalized = await normalizeToBaseCurrency(holdings, 'TRY');
    normalizedValue = normalized.reduce((sum, h) => sum + h.normalized_current, 0);
    normalizedInvestment = normalized.reduce((sum, h) => sum + h.normalized_invested, 0);
    normalizedPnl = normalizedValue - normalizedInvestment;
    pnlPercentage = normalizedInvestment > 0 ? (normalizedPnl / normalizedInvestment) * 100 : 0;
  }

  const { data: existingSnapshot } = await supabase
    .from('portfolio_snapshots')
    .select('id')
    .eq('snapshot_date', today)
    .maybeSingle();

  if (existingSnapshot) {
    await supabase
      .from('portfolio_snapshots')
      .update({
        total_value: normalizedValue,
        total_investment: normalizedInvestment,
        total_pnl: normalizedPnl,
        pnl_percentage: pnlPercentage,
      })
      .eq('id', existingSnapshot.id);
  } else {
    await supabase.from('portfolio_snapshots').insert([
      {
        total_value: normalizedValue,
        total_investment: normalizedInvestment,
        total_pnl: normalizedPnl,
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

export interface AdvancedMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  cagr: number;
  beta: number;
  alpha: number;
}

export async function calculateSharpeRatio(riskFreeRate: number = 0.15): Promise<number> {
  const snapshots = await getHistoricalSnapshots(365);
  if (snapshots.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const dailyReturn = (snapshots[i].total_value - snapshots[i - 1].total_value) / snapshots[i - 1].total_value;
    returns.push(dailyReturn);
  }

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  const annualizedReturn = avgReturn * 252;
  const annualizedVolatility = stdDev * Math.sqrt(252);

  if (annualizedVolatility === 0) return 0;
  return (annualizedReturn - riskFreeRate) / annualizedVolatility;
}

export async function calculateMaxDrawdown(): Promise<number> {
  const snapshots = await getHistoricalSnapshots(365);
  if (snapshots.length < 2) return 0;

  let maxDrawdown = 0;
  let peak = snapshots[0].total_value;

  for (const snapshot of snapshots) {
    if (snapshot.total_value > peak) {
      peak = snapshot.total_value;
    }
    const drawdown = (peak - snapshot.total_value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown * 100;
}

export async function calculateVolatility(): Promise<number> {
  const snapshots = await getHistoricalSnapshots(365);
  if (snapshots.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const dailyReturn = (snapshots[i].total_value - snapshots[i - 1].total_value) / snapshots[i - 1].total_value;
    returns.push(dailyReturn);
  }

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev * Math.sqrt(252) * 100;
}

export async function calculateCAGR(): Promise<number> {
  const snapshots = await getHistoricalSnapshots(365);
  if (snapshots.length < 2) return 0;

  const firstValue = snapshots[0].total_value;
  const lastValue = snapshots[snapshots.length - 1].total_value;
  const years = snapshots.length / 365;

  if (firstValue === 0 || years === 0) return 0;
  return (Math.pow(lastValue / firstValue, 1 / years) - 1) * 100;
}

export async function getAdvancedMetrics(): Promise<AdvancedMetrics> {
  const [sharpeRatio, maxDrawdown, volatility, cagr] = await Promise.all([
    calculateSharpeRatio(),
    calculateMaxDrawdown(),
    calculateVolatility(),
    calculateCAGR(),
  ]);

  return {
    sharpeRatio,
    maxDrawdown,
    volatility,
    cagr,
    beta: 0,
    alpha: 0,
  };
}

export interface AssetTypePnLSummary {
  asset_type: string;
  total_value: number;
  total_investment: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  total_pnl: number;
  pnl_percent: number;
}

export async function getPnLSummaryByAssetType(): Promise<AssetTypePnLSummary[]> {
  const { data: holdings } = await supabase
    .from('holdings')
    .select('*');

  if (!holdings || holdings.length === 0) return [];

  const summary = new Map<string, AssetTypePnLSummary>();

  for (const holding of holdings) {
    const assetType = holding.asset_type;

    const holdingCurrency = holding.currency || 'TRY';
    const purchaseCurrency = holding.purchase_currency || holdingCurrency;

    const currentValue = holding.current_price * holding.quantity;
    const investment = holding.purchase_price * holding.quantity;

    const currentValueTRY = holdingCurrency === 'TRY' ? currentValue : holding.original_try_current_price ? holding.original_try_current_price * holding.quantity : currentValue;
    const investmentTRY = purchaseCurrency === 'TRY' ? investment : holding.original_try_price ? holding.original_try_price * holding.quantity : investment;

    const unrealizedPnl = currentValueTRY - investmentTRY;
    const realizedPnl = holding.total_realized_pnl || 0;
    const totalPnl = unrealizedPnl + realizedPnl;

    if (!summary.has(assetType)) {
      summary.set(assetType, {
        asset_type: assetType,
        total_value: 0,
        total_investment: 0,
        total_unrealized_pnl: 0,
        total_realized_pnl: 0,
        total_pnl: 0,
        pnl_percent: 0,
      });
    }

    const current = summary.get(assetType)!;
    current.total_value += currentValueTRY;
    current.total_investment += investmentTRY;
    current.total_unrealized_pnl += unrealizedPnl;
    current.total_realized_pnl += realizedPnl;
    current.total_pnl += totalPnl;
  }

  const result = Array.from(summary.values());
  result.forEach(item => {
    item.pnl_percent = item.total_investment > 0
      ? (item.total_pnl / item.total_investment) * 100
      : 0;
  });

  return result.sort((a, b) => b.total_value - a.total_value);
}
