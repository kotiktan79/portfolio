import { useEffect, useState } from 'react';
import { Plus, TrendingUp, RefreshCw, Target, Moon, Sun, Bell, BarChart3, Wifi, WifiOff, Activity, Download, Tv, DollarSign } from 'lucide-react';
import { supabase, Holding, AssetType } from './lib/supabase';
import { AddHoldingModal } from './components/AddHoldingModal';
import { EditHoldingModal } from './components/EditHoldingModal';
import { HoldingRow } from './components/HoldingRow';
import { PnLCard } from './components/PnLCard';
import { RebalanceModal } from './components/RebalanceModal';
import { PortfolioChart } from './components/PortfolioChart';
import { AllocationChart } from './components/AllocationChart';
import { TransactionHistory } from './components/TransactionHistory';
import { AchievementBadges } from './components/AchievementBadges';
import { PriceAlertModal } from './components/PriceAlertModal';
import { RiskMetrics } from './components/RiskMetrics';
import { ScenarioAnalysis } from './components/ScenarioAnalysis';
import { ProfitSummary } from './components/ProfitSummary';
import { WithdrawalCalculator } from './components/WithdrawalCalculator';
import { ExportImportModal } from './components/ExportImportModal';
import { HoldingsFilter } from './components/HoldingsFilter';
import { TradingSignals } from './components/TradingSignals';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { useDarkMode } from './hooks/useDarkMode';
import {
  fetchMultiplePrices,
  formatCurrency,
  initializeWebSocketConnection,
  closeWebSocketConnection,
  subscribeToConnectionStatus,
  subscribeToPriceUpdates,
  ConnectionStatus,
  PriceUpdate
} from './services/priceService';
import {
  getPnLData,
  savePortfolioSnapshot,
  calculateRebalance,
  getDefaultTargetAllocations,
  getHistoricalSnapshots,
  PnLData,
} from './services/analyticsService';
import { checkAndUnlockAchievements } from './services/achievementService';
import { getAllTransactions, getTotalDividends } from './services/transactionService';
import { requestNotificationPermission, notifyAchievementUnlocked, getNotificationPermissionStatus } from './services/notificationService';

function App() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showExportImportModal, setShowExportImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'pnl' | 'pnl_percent'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const toast = useToast();
  const [showCharts, setShowCharts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pnlData, setPnlData] = useState<{
    daily: PnLData;
    weekly: PnLData;
    monthly: PnLData;
  } | null>(null);
  const [livePnlData, setLivePnlData] = useState<{
    daily: PnLData;
    weekly: PnLData;
    monthly: PnLData;
  } | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [targetAllocations, setTargetAllocations] = useState(getDefaultTargetAllocations());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  useEffect(() => {
    loadHoldings();
    loadPnLData();
    loadHistoricalData();
    checkNotificationPermission();

    const unsubscribeStatus = subscribeToConnectionStatus((status) => {
      setConnectionStatus(status);
    });

    const unsubscribePrices = subscribeToPriceUpdates((update: PriceUpdate) => {
      setLastUpdate(`${update.symbol}: ${formatCurrency(update.price)} ₺ (${update.source})`);

      setHoldings(prev =>
        prev.map(h =>
          h.symbol === update.symbol
            ? { ...h, current_price: update.price, updated_at: new Date().toISOString() }
            : h
        )
      );
    });

    return () => {
      unsubscribeStatus();
      unsubscribePrices();
      closeWebSocketConnection();
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isPageVisible) return;

    const interval = setInterval(() => {
      updatePrices();
    }, 1000);

    return () => clearInterval(interval);
  }, [holdings, isPageVisible]);

  useEffect(() => {
    if (holdings.length > 0) {
      calculateAndUpdatePnL();
      calculateLivePnL();
    }
  }, [holdings]);

  function calculateLivePnL() {
    if (holdings.length === 0 || !pnlData) {
      setLivePnlData(null);
      return;
    }

    const currentTotalValue = holdings.reduce(
      (sum, h) => sum + h.current_price * h.quantity,
      0
    );

    const dailyBase = pnlData.daily.value - pnlData.daily.change;
    const weeklyBase = pnlData.weekly.value - pnlData.weekly.change;
    const monthlyBase = pnlData.monthly.value - pnlData.monthly.change;

    const dailyChange = currentTotalValue - dailyBase;
    const weeklyChange = currentTotalValue - weeklyBase;
    const monthlyChange = currentTotalValue - monthlyBase;

    setLivePnlData({
      daily: {
        period: 'Günlük',
        value: currentTotalValue,
        change: dailyChange,
        percentage: dailyBase > 0 ? (dailyChange / dailyBase) * 100 : 0,
      },
      weekly: {
        period: 'Haftalık',
        value: currentTotalValue,
        change: weeklyChange,
        percentage: weeklyBase > 0 ? (weeklyChange / weeklyBase) * 100 : 0,
      },
      monthly: {
        period: 'Aylık',
        value: currentTotalValue,
        change: monthlyChange,
        percentage: monthlyBase > 0 ? (monthlyChange / monthlyBase) * 100 : 0,
      },
    });
  }

  async function loadHoldings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .order('symbol', { ascending: true });

    if (error) {
      console.error('Error loading holdings:', error);
    } else {
      setHoldings(data || []);
      if (data && data.length > 0) {
        updatePricesForHoldings(data);

        const cryptoSymbols = data
          .filter(h => h.asset_type === 'crypto')
          .map(h => h.symbol);

        if (cryptoSymbols.length > 0) {
          initializeWebSocketConnection(cryptoSymbols);
        }
      }
    }
    setLoading(false);
  }

  async function updatePrices() {
    if (holdings.length === 0) return;
    await updatePricesForHoldings(holdings);
  }

  async function updatePricesForHoldings(holdingsToUpdate: Holding[]) {
    try {
      const symbols = holdingsToUpdate.map(h => ({
        symbol: h.symbol,
        assetType: h.asset_type,
      }));

      const prices = await fetchMultiplePrices(symbols);

      const updates = holdingsToUpdate.map(async (holding) => {
        const newPrice = prices[holding.symbol];
        if (newPrice && Math.abs(newPrice - holding.current_price) > 0.01) {
          await supabase
            .from('holdings')
            .update({ current_price: newPrice, updated_at: new Date().toISOString() })
            .eq('id', holding.id);

          return { ...holding, current_price: newPrice };
        }
        return holding;
      });

      const updatedHoldings = await Promise.all(updates);
      setHoldings(updatedHoldings);

      await calculateAndUpdatePnL(updatedHoldings);
    } catch (error) {
      console.error('Error updating prices:', error);
    }
  }

  async function calculateAndUpdatePnL(currentHoldings = holdings) {
    if (currentHoldings.length === 0) return;

    const totalValue = currentHoldings.reduce(
      (sum, h) => sum + h.current_price * h.quantity,
      0
    );
    const totalInv = currentHoldings.reduce(
      (sum, h) => sum + h.purchase_price * h.quantity,
      0
    );
    const pnl = totalValue - totalInv;
    const pnlPercent = totalInv > 0 ? (pnl / totalInv) * 100 : 0;

    await savePortfolioSnapshot(totalValue, totalInv, pnl, pnlPercent);
    const data = await getPnLData();
    setPnlData(data);
  }

  async function loadPnLData() {
    const data = await getPnLData();
    setPnlData(data);
    setLivePnlData(data);
  }

  async function loadHistoricalData() {
    const data = await getHistoricalSnapshots(30);
    setHistoricalData(data);
  }

  async function checkNotificationPermission() {
    const status = getNotificationPermissionStatus();
    setNotificationsEnabled(status === 'granted');
  }

  async function enableNotifications() {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      toast.success('Bildirimler etkinleştirildi! Fiyat alarmları için bildirim alacaksınız.');
    } else {
      toast.error('Bildirim izni reddedildi.');
    }
  }

  async function checkAchievements() {
    const assetTypes = [...new Set(holdings.map((h) => h.asset_type))];
    const transactions = await getAllTransactions();
    const totalDividends = await getTotalDividends();

    const unlocked = await checkAndUnlockAchievements({
      totalHoldings: holdings.length,
      totalValue: totalCurrentValue,
      totalPnL: totalProfitLoss,
      assetTypes,
      positiveDays: 0,
      totalDividends,
      totalTransactions: transactions.length,
    });

    if (unlocked && unlocked.length > 0 && notificationsEnabled) {
      unlocked.forEach((achievement: any) => {
        notifyAchievementUnlocked(achievement.title, achievement.description);
      });
    }
  }

  async function handleAddHolding(newHolding: {
    symbol: string;
    asset_type: AssetType;
    purchase_price: number;
    quantity: number;
    current_price: number;
  }) {
    const { data, error } = await supabase
      .from('holdings')
      .insert([newHolding])
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error adding holding:', error);
      toast.error('Varlık eklenirken hata oluştu!');
    } else if (data) {
      setHoldings([...holdings, data]);
      toast.success(`${newHolding.symbol} başarıyla eklendi!`);
    }
  }

  async function handleUpdateHolding(
    id: string,
    updates: {
      symbol: string;
      asset_type: AssetType;
      purchase_price: number;
      quantity: number;
    }
  ) {
    const { error } = await supabase
      .from('holdings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating holding:', error);
      toast.error('Varlık güncellenirken hata oluştu!');
    } else {
      setHoldings(
        holdings.map((h) =>
          h.id === id ? { ...h, ...updates } : h
        )
      );
      toast.success('Varlık başarıyla güncellendi!');
    }
  }

  async function handleDeleteHolding(id: string) {
    const confirmed = window.confirm('Bu varlığı silmek istediğinize emin misiniz?');
    if (!confirmed) return;

    const { error } = await supabase.from('holdings').delete().eq('id', id);

    if (error) {
      console.error('Error deleting holding:', error);
      toast.error('Varlık silinirken hata oluştu!');
    } else {
      setHoldings(holdings.filter((h) => h.id !== id));
      toast.success('Varlık başarıyla silindi!');
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await updatePrices();
    await loadPnLData();
    await loadHistoricalData();
    await checkAchievements();
    setTimeout(() => setRefreshing(false), 500);
  }


  const totalInvestment = holdings.reduce(
    (sum, h) => sum + h.purchase_price * h.quantity,
    0
  );

  const totalCurrentValue = holdings.reduce(
    (sum, h) => sum + h.current_price * h.quantity,
    0
  );

  const totalProfitLoss = totalCurrentValue - totalInvestment;
  const totalProfitLossPercent = totalInvestment > 0
    ? (totalProfitLoss / totalInvestment) * 100
    : 0;

  const usdRate = holdings.find(h => h.symbol === 'USD')?.current_price || 41.96;
  const totalInvestmentUSD = totalInvestment / usdRate;
  const totalCurrentValueUSD = totalCurrentValue / usdRate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200/50 dark:border-gray-700/50">
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-4 md:px-8 py-4 md:py-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-md shadow-lg">
                  <TrendingUp className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Portföy Takip</h1>
                  <p className="text-blue-100 text-xs md:text-sm mt-1 font-medium">Canlı fiyat güncellemeleri</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto relative z-10">
                <a
                  href="/dashboard.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 font-medium"
                  title="Canlı Dashboard'u Yeni Sekmede Aç"
                >
                  <Tv size={18} />
                  <span className="hidden sm:inline">Dashboard</span>
                </a>
                <div className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-15 rounded-lg backdrop-blur-md shadow-md border border-white/20">
                  {connectionStatus === 'connected' ? (
                    <>
                      <Activity className="text-green-400 animate-pulse" size={18} />
                      <span className="text-white text-sm font-semibold">Canlı</span>
                    </>
                  ) : connectionStatus === 'connecting' ? (
                    <>
                      <Wifi className="text-yellow-400 animate-pulse" size={18} />
                      <span className="text-white text-sm">Bağlanıyor...</span>
                    </>
                  ) : connectionStatus === 'error' ? (
                    <>
                      <WifiOff className="text-red-400" size={18} />
                      <span className="text-white text-sm">Hata</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="text-gray-400" size={18} />
                      <span className="text-white text-sm">Bağlantı Yok</span>
                    </>
                  )}
                </div>
                <button
                  onClick={toggleDarkMode}
                  className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-15 hover:bg-opacity-25 text-white rounded-lg transition-all backdrop-blur-md shadow-md border border-white/20 hover:scale-105"
                >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button
                  onClick={() => setShowCharts(!showCharts)}
                  className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-15 hover:bg-opacity-25 text-white rounded-lg transition-all backdrop-blur-md shadow-md border border-white/20 hover:scale-105"
                >
                  <BarChart3 size={18} />
                </button>
                <button
                  onClick={() => setShowAlertModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-15 hover:bg-opacity-25 text-white rounded-lg transition-all backdrop-blur-md shadow-md border border-white/20 hover:scale-105"
                >
                  <Bell size={18} />
                </button>
                {!notificationsEnabled && (
                  <button
                    onClick={enableNotifications}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-xl hover:scale-105"
                    title="Bildirimleri Etkinleştir"
                  >
                    <Bell size={18} />
                  </button>
                )}
                <button
                  onClick={() => setShowExportImportModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-15 hover:bg-opacity-25 text-white rounded-lg transition-all backdrop-blur-md shadow-md border border-white/20 hover:scale-105"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white bg-opacity-15 hover:bg-opacity-25 text-white rounded-lg transition-all backdrop-blur-md shadow-md border border-white/20 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                  <span className="font-medium hidden sm:inline">Yenile</span>
                </button>
                <button
                  onClick={() => setShowRebalanceModal(true)}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white bg-opacity-15 hover:bg-opacity-25 text-white rounded-lg transition-all backdrop-blur-md shadow-md border border-white/20 hover:scale-105"
                >
                  <Target size={18} />
                  <span className="font-medium hidden sm:inline">Rebalance</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 md:px-6 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <Plus size={20} />
                  <span className="hidden sm:inline">Varlık Ekle</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-slate-200 dark:border-gray-700 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="group relative bg-gradient-to-br from-white via-blue-50 to-blue-100/50 dark:from-gray-800 dark:via-gray-800 dark:to-blue-900/20 p-6 md:p-8 rounded-2xl shadow-xl border border-blue-200/60 dark:border-blue-500/30 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
                <div className="relative z-10">
                  <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <DollarSign size={16} />
                    Toplam Yatırım
                  </p>
                  <p className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
                    {formatCurrency(totalInvestment)} ₺
                  </p>
                  <p className="text-sm md:text-base text-blue-600/80 dark:text-blue-400/80 font-semibold">
                    ${formatCurrency(totalInvestmentUSD)}
                  </p>
                </div>
              </div>
              <div className="group relative bg-gradient-to-br from-white via-green-50 to-emerald-100/50 dark:from-gray-800 dark:via-gray-800 dark:to-green-900/20 p-6 md:p-8 rounded-2xl shadow-xl border border-green-200/60 dark:border-green-500/30 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-all duration-500"></div>
                <div className="relative z-10">
                  <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                    <TrendingUp size={16} />
                    Güncel Değer
                  </p>
                  <p className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
                    {formatCurrency(totalCurrentValue)} ₺
                  </p>
                  <p className="text-sm md:text-base text-green-600/80 dark:text-green-400/80 font-semibold">
                    ${formatCurrency(totalCurrentValueUSD)}
                  </p>
                </div>
              </div>
            </div>

            <ProfitSummary
              unrealizedProfit={totalProfitLoss}
              unrealizedProfitPercent={totalProfitLossPercent}
            />


            {livePnlData && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <TrendingUp className="text-blue-600" size={20} />
                  Periyodik PnL
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <PnLCard data={livePnlData.daily} />
                  <PnLCard data={livePnlData.weekly} />
                  <PnLCard data={livePnlData.monthly} />
                </div>
              </div>
            )}

            {showCharts && holdings.length > 0 && (
              <>
                <TradingSignals holdings={holdings} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <BarChart3 className="text-blue-600" size={20} />
                      Portföy Performansı
                    </h3>
                    <div className="h-80">
                      {historicalData.length > 0 ? (
                        <PortfolioChart data={historicalData} type="area" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-500">
                          <p>Henüz geçmiş veri yok. Lütfen bekleyin...</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <Target className="text-blue-600" size={20} />
                      Varlık Dağılımı
                    </h3>
                    <div className="h-80">
                      <AllocationChart holdings={holdings} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RiskMetrics />
                  <ScenarioAnalysis holdings={holdings} currentValue={totalCurrentValue} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TransactionHistory />
                  <AchievementBadges
                    stats={{
                      totalHoldings: holdings.length,
                      totalValue: totalCurrentValue,
                      totalPnL: totalProfitLoss,
                      assetTypes: [...new Set(holdings.map((h) => h.asset_type))],
                      positiveDays: 0,
                      totalDividends: 0,
                      totalTransactions: 0,
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 dark:border-gray-300"></div>
                <p className="mt-4 text-slate-600 dark:text-gray-400">Yükleniyor...</p>
              </div>
            ) : holdings.length === 0 ? (
              <div className="text-center py-20 px-4">
                <TrendingUp className="mx-auto text-slate-300 dark:text-gray-600 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-slate-700 dark:text-gray-300 mb-2">
                  Henüz varlık eklemediniz
                </h3>
                <p className="text-slate-500 dark:text-gray-500 mb-6">
                  Portföyünüzü takip etmeye başlamak için ilk varlığınızı ekleyin
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <Plus size={20} />
                  İlk Varlığı Ekle
                </button>
              </div>
            ) : (
              <>
                <div className="px-4 md:px-8 pt-6">
                  <HoldingsFilter
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedType={selectedAssetType}
                    onTypeChange={setSelectedAssetType}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                  />
                </div>
                <table className="w-full">
                <thead className="bg-slate-50 dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-700 dark:text-gray-300">
                      Varlık
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-700 dark:text-gray-300 hidden sm:table-cell">
                      Alış Fiyatı
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-700 dark:text-gray-300 hidden md:table-cell">
                      Miktar
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-700 dark:text-gray-300">
                      Güncel Fiyat
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-700 dark:text-gray-300 hidden lg:table-cell">
                      Toplam Değer
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-700 dark:text-gray-300">
                      Kar/Zarar
                    </th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-700 dark:text-gray-300">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {holdings
                    .filter((holding) => {
                      const matchesSearch =
                        searchQuery === '' ||
                        holding.symbol.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesType =
                        selectedAssetType === 'all' || holding.asset_type === selectedAssetType;
                      return matchesSearch && matchesType;
                    })
                    .sort((a, b) => {
                      const aValue = a.current_price * a.quantity;
                      const bValue = b.current_price * b.quantity;
                      const aPnl = aValue - a.purchase_price * a.quantity;
                      const bPnl = bValue - b.purchase_price * b.quantity;
                      const aPnlPercent = ((aPnl / (a.purchase_price * a.quantity)) * 100);
                      const bPnlPercent = ((bPnl / (b.purchase_price * b.quantity)) * 100);

                      let comparison = 0;
                      if (sortBy === 'name') {
                        comparison = a.symbol.localeCompare(b.symbol);
                      } else if (sortBy === 'value') {
                        comparison = aValue - bValue;
                      } else if (sortBy === 'pnl') {
                        comparison = aPnl - bPnl;
                      } else if (sortBy === 'pnl_percent') {
                        comparison = aPnlPercent - bPnlPercent;
                      }

                      return sortOrder === 'asc' ? comparison : -comparison;
                    })
                    .map((holding) => (
                      <HoldingRow
                        key={holding.id}
                        holding={holding}
                        onEdit={setEditingHolding}
                        onDelete={handleDeleteHolding}
                        onTransactionComplete={handleRefresh}
                      />
                    ))}
                </tbody>
              </table>
              </>
            )}
          </div>
        </div>

        {holdings.length > 0 && (
          <div className="mt-8">
            <WithdrawalCalculator holdings={holdings} />
          </div>
        )}

        <div className="mt-8 mb-4">
          <div className="bg-gradient-to-r from-slate-100 via-blue-50 to-slate-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-gray-700">
            <div className="text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">Fiyatlar her 3 saniyede otomatik güncellenir</p>
              {lastUpdate && (
                <p className="text-xs text-slate-500 dark:text-gray-500">
                  Son Güncelleme: {lastUpdate}
                </p>
              )}
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Activity className="text-green-600 dark:text-green-400 animate-pulse" size={16} />
                  <span className="text-xs font-semibold text-green-700 dark:text-green-300">WebSocket Aktif</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <RefreshCw className="text-blue-600 dark:text-blue-400" size={16} />
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">REST API (3sn)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddHoldingModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddHolding}
        />
      )}

      {editingHolding && (
        <EditHoldingModal
          holding={editingHolding}
          onClose={() => setEditingHolding(null)}
          onUpdate={handleUpdateHolding}
        />
      )}

      {showRebalanceModal && (
        <RebalanceModal
          allocations={calculateRebalance(holdings, targetAllocations)}
          onClose={() => setShowRebalanceModal(false)}
          onUpdateTargets={(targets) => setTargetAllocations(targets)}
        />
      )}

      {showExportImportModal && (
        <ExportImportModal
          isOpen={showExportImportModal}
          onClose={() => setShowExportImportModal(false)}
          onImportComplete={handleRefresh}
        />
      )}

      {showAlertModal && (
        <PriceAlertModal
          onClose={() => setShowAlertModal(false)}
          onAdd={() => {
            setShowAlertModal(false);
            handleRefresh();
          }}
        />
      )}

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}

export default App;
