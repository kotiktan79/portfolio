import { TrendingUp, Award, Target, Zap } from 'lucide-react';
import { Holding } from '../lib/supabase';

interface PerformanceDashboardProps {
  holdings: Holding[];
  totalValue: number;
  totalInvestment: number;
}

export function PerformanceDashboard({ holdings, totalValue, totalInvestment }: PerformanceDashboardProps) {
  const totalPnL = totalValue - totalInvestment;
  const totalPnLPercent = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;

  const bestPerformer = holdings.reduce((best, h) => {
    const pnl = ((h.current_price - h.purchase_price) / h.purchase_price) * 100;
    const bestPnl = ((best.current_price - best.purchase_price) / best.purchase_price) * 100;
    return pnl > bestPnl ? h : best;
  }, holdings[0]);

  const worstPerformer = holdings.reduce((worst, h) => {
    const pnl = ((h.current_price - h.purchase_price) / h.purchase_price) * 100;
    const worstPnl = ((worst.current_price - worst.purchase_price) / worst.purchase_price) * 100;
    return pnl < worstPnl ? h : worst;
  }, holdings[0]);

  const avgHoldingValue = holdings.length > 0 ? totalValue / holdings.length : 0;
  const diversificationScore = Math.min(holdings.length * 10, 100);

  const bestPnL = bestPerformer ? ((bestPerformer.current_price - bestPerformer.purchase_price) / bestPerformer.purchase_price) * 100 : 0;
  const worstPnL = worstPerformer ? ((worstPerformer.current_price - worstPerformer.purchase_price) / worstPerformer.purchase_price) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
        <div className="flex items-center justify-between mb-3">
          <TrendingUp size={24} />
          <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
            Toplam
          </span>
        </div>
        <p className="text-sm opacity-90 mb-1">Toplam Getiri</p>
        <p className="text-3xl font-bold">
          {totalPnLPercent >= 0 ? '+' : ''}
          {totalPnLPercent.toFixed(2)}%
        </p>
        <p className="text-sm opacity-75 mt-2">
          {totalPnL >= 0 ? '+' : ''}
          {totalPnL.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
        </p>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
        <div className="flex items-center justify-between mb-3">
          <Award size={24} />
          <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
            En İyi
          </span>
        </div>
        <p className="text-sm opacity-90 mb-1">En İyi Performans</p>
        <p className="text-2xl font-bold truncate">{bestPerformer?.symbol || '-'}</p>
        <p className="text-sm opacity-75 mt-2">
          +{bestPnL.toFixed(2)}%
        </p>
      </div>

      <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
        <div className="flex items-center justify-between mb-3">
          <TrendingUp size={24} className="rotate-180" />
          <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
            En Kötü
          </span>
        </div>
        <p className="text-sm opacity-90 mb-1">En Düşük Performans</p>
        <p className="text-2xl font-bold truncate">{worstPerformer?.symbol || '-'}</p>
        <p className="text-sm opacity-75 mt-2">
          {worstPnL.toFixed(2)}%
        </p>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
        <div className="flex items-center justify-between mb-3">
          <Target size={24} />
          <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded-full">
            Skor
          </span>
        </div>
        <p className="text-sm opacity-90 mb-1">Çeşitlendirme</p>
        <p className="text-3xl font-bold">{diversificationScore}/100</p>
        <p className="text-sm opacity-75 mt-2">
          {holdings.length} varlık
        </p>
      </div>
    </div>
  );
}
