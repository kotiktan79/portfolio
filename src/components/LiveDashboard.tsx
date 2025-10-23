import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, ArrowUp, ArrowDown, Maximize2, PieChart, AlertTriangle, Target, Zap } from 'lucide-react';
import { Holding, supabase } from '../lib/supabase';
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

interface PerformanceData {
  daily: number;
  weekly: number;
  monthly: number;
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
  const [performance, setPerformance] = useState<PerformanceData>({ daily: 0, weekly: 0, monthly: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchPerformanceData();
  }, [holdings]);

  async function fetchPerformanceData() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data: dailySnapshot } = await supabase
      .from('portfolio_snapshots')
      .select('total_value')
      .gte('snapshot_date', dayAgo.toISOString())
      .order('snapshot_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: weeklySnapshot } = await supabase
      .from('portfolio_snapshots')
      .select('total_value')
      .gte('snapshot_date', weekAgo.toISOString())
      .order('snapshot_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: monthlySnapshot } = await supabase
      .from('portfolio_snapshots')
      .select('total_value')
      .gte('snapshot_date', monthAgo.toISOString())
      .order('snapshot_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    const daily = dailySnapshot ? ((totalValue - dailySnapshot.total_value) / dailySnapshot.total_value) * 100 : 0;
    const weekly = weeklySnapshot ? ((totalValue - weeklySnapshot.total_value) / weeklySnapshot.total_value) * 100 : 0;
    const monthly = monthlySnapshot ? ((totalValue - monthlySnapshot.total_value) / monthlySnapshot.total_value) * 100 : 0;

    setPerformance({ daily, weekly, monthly });
  }

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

  const assetTypeBreakdown = holdingsWithPnL.reduce((acc, h) => {
    const type = h.asset_type || 'other';
    if (!acc[type]) {
      acc[type] = { value: 0, count: 0, pnl: 0 };
    }
    acc[type].value += h.value;
    acc[type].count += 1;
    acc[type].pnl += h.pnl;
    return acc;
  }, {} as Record<string, { value: number; count: number; pnl: number }>);

  const assetTypes = Object.entries(assetTypeBreakdown).map(([type, data]) => ({
    type,
    ...data,
    percentage: (data.value / totalValue) * 100,
  }));

  const volatileAssets = holdingsWithPnL.filter(h => Math.abs(h.pnlPercent) > 10);
  const stableAssets = holdingsWithPnL.filter(h => Math.abs(h.pnlPercent) <= 5);

  const avgReturn = holdingsWithPnL.length > 0
    ? holdingsWithPnL.reduce((sum, h) => sum + h.pnlPercent, 0) / holdingsWithPnL.length
    : 0;

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

      <div className="relative z-10 h-full flex flex-col p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-blue-500/20 rounded-xl sm:rounded-2xl backdrop-blur-xl border border-blue-500/30">
              <Activity className="text-blue-400 animate-pulse" size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">Canlı Portföy İzleme</h1>
              <p className="text-gray-400 text-xs sm:text-sm md:text-base lg:text-lg mt-1">
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
            className="p-2 sm:p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg sm:rounded-xl transition-all border border-gray-700"
          >
            <Maximize2 size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-3 sm:mb-4 md:mb-6">
          <div className="sm:col-span-2 bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-blue-500/30 shadow-2xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
              <DollarSign className="text-blue-400" size={20} />
              <p className="text-blue-200 text-sm sm:text-base md:text-lg lg:text-xl font-semibold">Toplam Değer</p>
            </div>
            <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-2">{formatCurrency(totalValue, 0)} ₺</p>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mt-2 sm:mt-3 md:mt-4">
              <div className="flex items-center gap-1 sm:gap-2">
                {totalPnL >= 0 ? (
                  <ArrowUp className="text-green-400" size={16} />
                ) : (
                  <ArrowDown className="text-red-400" size={16} />
                )}
                <span className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold ${getColorClass(totalPnL)}`}>
                  {formatCurrency(Math.abs(totalPnL), 0)} ₺
                </span>
              </div>
              <span className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold ${getColorClass(totalPnL)}`}>
                {formatPercentage(totalPnLPercent)}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-purple-500/30 shadow-2xl">
            <p className="text-purple-200 text-xs sm:text-sm md:text-base lg:text-lg font-semibold mb-1 sm:mb-2">Yatırım</p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold">{formatCurrency(totalInvestment, 0)} ₺</p>
          </div>

          <div className="bg-gradient-to-br from-teal-600/20 to-teal-800/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-teal-500/30 shadow-2xl">
            <p className="text-teal-200 text-xs sm:text-sm md:text-base lg:text-lg font-semibold mb-1 sm:mb-2">Toplam Varlık</p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold">{holdings.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-3 sm:mb-4 md:mb-6">
          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-emerald-500/30 shadow-xl">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1 sm:gap-2">
                <Zap className="text-emerald-400" size={16} />
                <p className="text-emerald-200 text-xs sm:text-sm md:text-base font-semibold">Günlük</p>
              </div>
              {performance.daily >= 0 ? <ArrowUp className="text-emerald-400" size={16} /> : <ArrowDown className="text-red-400" size={16} />}
            </div>
            <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${getColorClass(performance.daily)}`}>
              {formatPercentage(performance.daily)}
            </p>
            <p className="text-emerald-200/60 text-xs sm:text-sm mt-1 sm:mt-2">Son 24 saat</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-800/20 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-cyan-500/30 shadow-xl">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1 sm:gap-2">
                <TrendingUp className="text-cyan-400" size={16} />
                <p className="text-cyan-200 text-xs sm:text-sm md:text-base font-semibold">Haftalık</p>
              </div>
              {performance.weekly >= 0 ? <ArrowUp className="text-cyan-400" size={16} /> : <ArrowDown className="text-red-400" size={16} />}
            </div>
            <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${getColorClass(performance.weekly)}`}>
              {formatPercentage(performance.weekly)}
            </p>
            <p className="text-cyan-200/60 text-xs sm:text-sm mt-1 sm:mt-2">Son 7 gün</p>
          </div>

          <div className="bg-gradient-to-br from-violet-600/20 to-violet-800/20 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-violet-500/30 shadow-xl">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1 sm:gap-2">
                <Target className="text-violet-400" size={16} />
                <p className="text-violet-200 text-xs sm:text-sm md:text-base font-semibold">Aylık</p>
              </div>
              {performance.monthly >= 0 ? <ArrowUp className="text-violet-400" size={16} /> : <ArrowDown className="text-red-400" size={16} />}
            </div>
            <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${getColorClass(performance.monthly)}`}>
              {formatPercentage(performance.monthly)}
            </p>
            <p className="text-violet-200/60 text-xs sm:text-sm mt-1 sm:mt-2">Son 30 gün</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-3 sm:mb-4 md:mb-6">
          <div className="bg-gray-800/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-gray-700/50 shadow-xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <PieChart className="text-orange-400" size={18} />
              <h3 className="text-base sm:text-lg md:text-xl font-bold">Varlık Dağılımı</h3>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {assetTypes.map((asset) => {
                const getTypeColor = (type: string) => {
                  switch (type) {
                    case 'stock': return 'bg-blue-500';
                    case 'crypto': return 'bg-yellow-500';
                    case 'commodity': return 'bg-orange-500';
                    case 'forex': return 'bg-green-500';
                    default: return 'bg-gray-500';
                  }
                };

                const getTypeName = (type: string) => {
                  switch (type) {
                    case 'stock': return 'Hisse';
                    case 'crypto': return 'Kripto';
                    case 'commodity': return 'Emtia';
                    case 'forex': return 'Forex';
                    default: return 'Diğer';
                  }
                };

                return (
                  <div key={asset.type}>
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${getTypeColor(asset.type)}`}></div>
                        <span className="text-gray-300 text-xs sm:text-sm font-semibold">{getTypeName(asset.type)}</span>
                      </div>
                      <span className="text-white text-xs sm:text-sm font-bold">{asset.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700/30 rounded-full h-1.5 sm:h-2">
                      <div
                        className={`h-1.5 sm:h-2 rounded-full ${getTypeColor(asset.type)}`}
                        style={{ width: `${asset.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{asset.count} adet</span>
                      <span className={getColorClass(asset.pnl)}>
                        {formatCurrency(asset.pnl)} ₺
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-800/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-gray-700/50 shadow-xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Activity className="text-blue-400" size={18} />
              <h3 className="text-base sm:text-lg md:text-xl font-bold">Piyasa İstatistikleri</h3>
            </div>
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              <div className="bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
                <p className="text-gray-400 text-xs sm:text-sm mb-1">Ortalama Getiri</p>
                <p className={`text-lg sm:text-xl md:text-2xl font-bold ${getColorClass(avgReturn)}`}>
                  {formatPercentage(avgReturn)}
                </p>
              </div>
              <div className="bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
                <p className="text-gray-400 text-xs sm:text-sm mb-1">Volatil Varlıklar</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-400">
                  {volatileAssets.length}
                </p>
                <p className="text-xs text-gray-400 mt-1">%10+ değişim</p>
              </div>
              <div className="bg-gray-700/30 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
                <p className="text-gray-400 text-xs sm:text-sm mb-1">Stabil Varlıklar</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-400">
                  {stableAssets.length}
                </p>
                <p className="text-xs text-gray-400 mt-1">±%5 aralığında</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-gray-700/50 shadow-xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <AlertTriangle className="text-red-400" size={18} />
              <h3 className="text-base sm:text-lg md:text-xl font-bold">Risk Göstergeleri</h3>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {volatileAssets.length > 5 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4">
                  <p className="text-red-400 text-xs sm:text-sm font-semibold mb-1">Yüksek Volatilite</p>
                  <p className="text-xs sm:text-sm text-gray-300">{volatileAssets.length} varlık %10+ değişim gösteriyor</p>
                </div>
              )}
              {totalPnLPercent < -10 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <p className="text-red-400 font-semibold mb-1">Portföy Kayıp</p>
                  <p className="text-sm text-gray-300">Toplam kayıp %10'un üzerinde</p>
                </div>
              )}
              {assetTypes.some(a => a.percentage > 60) && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <p className="text-yellow-400 font-semibold mb-1">Konsantrasyon Riski</p>
                  <p className="text-sm text-gray-300">Portföyün %60+ tek varlık tipinde</p>
                </div>
              )}
              {volatileAssets.length <= 2 && totalPnLPercent > 0 && !assetTypes.some(a => a.percentage > 60) && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-green-400 font-semibold mb-1">Düşük Risk</p>
                  <p className="text-sm text-gray-300">Portföy dengeli ve stabil görünüyor</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8 mb-3 sm:mb-4 md:mb-6">
          <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 border border-gray-700/50 shadow-2xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
              <TrendingUp className="text-green-400" size={20} />
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">En Çok Kazandıranlar</h2>
            </div>
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              {topGainers.map((holding, index) => (
                <div
                  key={holding.id}
                  className={`p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 ${getBgColorClass(holding.pnlPercent)} transition-all`}
                >
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
                      <span className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-400">#{index + 1}</span>
                      <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">{holding.symbol}</span>
                    </div>
                    <span className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-green-400">
                      {formatPercentage(holding.pnlPercent)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-400">
                      {formatCurrency(holding.current_price)} ₺
                    </span>
                    <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-green-400">
                      +{formatCurrency(holding.pnl)} ₺
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 border border-gray-700/50 shadow-2xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
              <TrendingDown className="text-red-400" size={20} />
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">En Çok Kaybedenler</h2>
            </div>
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              {topLosers.map((holding, index) => (
                <div
                  key={holding.id}
                  className={`p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border-2 ${getBgColorClass(holding.pnlPercent)} transition-all`}
                >
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
                      <span className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-400">#{index + 1}</span>
                      <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">{holding.symbol}</span>
                    </div>
                    <span className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-red-400">
                      {formatPercentage(holding.pnlPercent)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-400">
                      {formatCurrency(holding.current_price)} ₺
                    </span>
                    <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-red-400">
                      {formatCurrency(holding.pnl)} ₺
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 border border-gray-700/50 shadow-2xl mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Canlı Fiyat Hareketleri</h2>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm text-gray-400">Gerçek Zamanlı</span>
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="flex gap-2 sm:gap-3 md:gap-4 animate-scroll">
              {[...holdingsWithPnL, ...holdingsWithPnL].map((holding, index) => (
                <div
                  key={`${holding.id}-${index}`}
                  className={`flex-shrink-0 w-48 sm:w-56 md:w-64 rounded-lg sm:rounded-xl border-2 p-2 sm:p-3 md:p-4 ${getBgColorClass(holding.pnlPercent)}`}
                >
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <span className="text-sm sm:text-base md:text-lg font-bold">{holding.symbol}</span>
                    {holding.pnlPercent >= 0 ? (
                      <ArrowUp className="text-green-400" size={16} />
                    ) : (
                      <ArrowDown className="text-red-400" size={16} />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">{formatCurrency(holding.current_price)} ₺</span>
                    <span className={`text-sm sm:text-base md:text-lg font-bold ${getColorClass(holding.pnlPercent)}`}>
                      {formatPercentage(holding.pnlPercent)}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1 uppercase">{holding.asset_type}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 border border-gray-700/50 shadow-2xl">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6">Tüm Varlıklar - Isı Haritası</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {holdingsWithPnL.map((holding) => {
              const size = Math.max(Math.min(holding.weight * 2, 100), 40);
              return (
                <div
                  key={holding.id}
                  className={`relative rounded-xl sm:rounded-2xl border-2 ${getBgColorClass(holding.pnlPercent)} transition-all hover:scale-105 cursor-pointer overflow-hidden`}
                  style={{
                    height: `${Math.max(size + 60, 100)}px`,
                  }}
                >
                  <div className="absolute inset-0 p-2 sm:p-3 md:p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold mb-1">{holding.symbol}</p>
                      <p className="text-[10px] sm:text-xs text-gray-400 uppercase">{holding.asset_type}</p>
                    </div>
                    <div>
                      <p className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold ${getColorClass(holding.pnlPercent)}`}>
                        {formatPercentage(holding.pnlPercent)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                        {formatCurrency(holding.value, 0)} ₺
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 sm:mt-4 md:mt-6 lg:mt-8 bg-gray-800/20 backdrop-blur-xl rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 border border-gray-700/30">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 md:gap-8 text-xs sm:text-sm text-gray-400">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Canlı Veri Akışı Aktif</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Activity className="animate-pulse" size={14} />
              <span>Otomatik Güncelleme: 5 Saniye</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
