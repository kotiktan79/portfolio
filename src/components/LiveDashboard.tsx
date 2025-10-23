import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, ArrowUp, ArrowDown, Maximize2 } from 'lucide-react';
import { Holding } from '../lib/supabase';
import { formatCurrency, formatPercentage } from '../services/priceService';

interface LiveDashboardProps {
  holdings: Holding[];
  totalValue: number;
  totalInvestment: number;
  totalPnL: number;
  totalPnLPercent: number;
}

interface HoldingWithPnL extends Holding {
  pnl: number;
  pnlPercent: number;
  value: number;
  weight: number;
}

export function LiveDashboard({
  holdings,
  totalValue,
  totalInvestment,
  totalPnL,
  totalPnLPercent,
}: LiveDashboardProps) {
  const [time, setTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const holdingsWithPnL: HoldingWithPnL[] = holdings.map((h) => {
    const value = h.current_price * h.quantity;
    const invested = h.purchase_price * h.quantity;
    const pnl = value - invested;
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
    const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;

    return {
      ...h,
      pnl,
      pnlPercent,
      value,
      weight,
    };
  });

  const sortedByPnL = [...holdingsWithPnL].sort((a, b) => b.pnl - a.pnl);
  const topGainers = sortedByPnL.slice(0, 3);
  const topLosers = sortedByPnL.reverse().slice(0, 3);

  const getColorClass = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getBgColorClass = (value: number) => {
    if (value > 5) return 'bg-green-500/20 border-green-500/50';
    if (value > 0) return 'bg-green-500/10 border-green-500/30';
    if (value < -5) return 'bg-red-500/20 border-red-500/50';
    if (value < 0) return 'bg-red-500/10 border-red-500/30';
    return 'bg-gray-500/10 border-gray-500/30';
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white overflow-auto">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>

      <div className="relative z-10 p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-2xl backdrop-blur-xl border border-blue-500/30">
              <Activity className="text-blue-400 animate-pulse" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Canlı Portföy İzleme</h1>
              <p className="text-gray-400 text-lg mt-1">
                {time.toLocaleTimeString('tr-TR')} • {time.toLocaleDateString('tr-TR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all border border-gray-700"
          >
            <Maximize2 size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-2 bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-xl rounded-3xl p-8 border border-blue-500/30 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="text-blue-400" size={32} />
              <p className="text-blue-200 text-xl font-semibold">Toplam Değer</p>
            </div>
            <p className="text-6xl font-bold mb-2">{formatCurrency(totalValue, 0)} ₺</p>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                {totalPnL >= 0 ? (
                  <ArrowUp className="text-green-400" size={24} />
                ) : (
                  <ArrowDown className="text-red-400" size={24} />
                )}
                <span className={`text-3xl font-bold ${getColorClass(totalPnL)}`}>
                  {formatCurrency(Math.abs(totalPnL), 0)} ₺
                </span>
              </div>
              <span className={`text-2xl font-bold ${getColorClass(totalPnL)}`}>
                {formatPercentage(totalPnLPercent)}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-xl rounded-3xl p-8 border border-purple-500/30 shadow-2xl">
            <p className="text-purple-200 text-lg font-semibold mb-2">Yatırım</p>
            <p className="text-4xl font-bold">{formatCurrency(totalInvestment, 0)} ₺</p>
          </div>

          <div className="bg-gradient-to-br from-teal-600/20 to-teal-800/20 backdrop-blur-xl rounded-3xl p-8 border border-teal-500/30 shadow-2xl">
            <p className="text-teal-200 text-lg font-semibold mb-2">Toplam Varlık</p>
            <p className="text-4xl font-bold">{holdings.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="text-green-400" size={28} />
              <h2 className="text-2xl font-bold">En Çok Kazandıranlar</h2>
            </div>
            <div className="space-y-4">
              {topGainers.map((holding, index) => (
                <div
                  key={holding.id}
                  className={`p-4 rounded-xl border-2 ${getBgColorClass(holding.pnlPercent)} transition-all`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-gray-400">#{index + 1}</span>
                      <span className="text-2xl font-bold">{holding.symbol}</span>
                    </div>
                    <span className="text-xl font-semibold text-green-400">
                      {formatPercentage(holding.pnlPercent)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg text-gray-400">
                      {formatCurrency(holding.current_price)} ₺
                    </span>
                    <span className="text-xl font-bold text-green-400">
                      +{formatCurrency(holding.pnl)} ₺
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <TrendingDown className="text-red-400" size={28} />
              <h2 className="text-2xl font-bold">En Çok Kaybedenler</h2>
            </div>
            <div className="space-y-4">
              {topLosers.map((holding, index) => (
                <div
                  key={holding.id}
                  className={`p-4 rounded-xl border-2 ${getBgColorClass(holding.pnlPercent)} transition-all`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-gray-400">#{index + 1}</span>
                      <span className="text-2xl font-bold">{holding.symbol}</span>
                    </div>
                    <span className="text-xl font-semibold text-red-400">
                      {formatPercentage(holding.pnlPercent)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg text-gray-400">
                      {formatCurrency(holding.current_price)} ₺
                    </span>
                    <span className="text-xl font-bold text-red-400">
                      {formatCurrency(holding.pnl)} ₺
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50 shadow-2xl">
          <h2 className="text-2xl font-bold mb-6">Tüm Varlıklar - Isı Haritası</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {holdingsWithPnL.map((holding) => {
              const size = Math.max(Math.min(holding.weight * 2, 100), 40);
              return (
                <div
                  key={holding.id}
                  className={`relative rounded-2xl border-2 ${getBgColorClass(holding.pnlPercent)} transition-all hover:scale-105 cursor-pointer overflow-hidden`}
                  style={{
                    height: `${size + 80}px`,
                  }}
                >
                  <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-xl font-bold mb-1">{holding.symbol}</p>
                      <p className="text-xs text-gray-400 uppercase">{holding.asset_type}</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${getColorClass(holding.pnlPercent)}`}>
                        {formatPercentage(holding.pnlPercent)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatCurrency(holding.value, 0)} ₺
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 bg-gray-800/20 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/30">
          <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Canlı Veri Akışı Aktif</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="animate-pulse" size={16} />
              <span>Otomatik Güncelleme: 5 Saniye</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
