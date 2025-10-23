import { useEffect, useState } from 'react';
import { supabase, Holding, AssetType } from './lib/supabase';
import { LiveDashboard } from './components/LiveDashboard';
import {
  fetchMultiplePrices,
  initializeWebSocketConnection,
  closeWebSocketConnection,
  subscribeToPriceUpdates,
  PriceUpdate,
} from './services/priceService';

function DashboardApp() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHoldings();

    const unsubscribePrices = subscribeToPriceUpdates((update: PriceUpdate) => {
      setHoldings(prev =>
        prev.map(h =>
          h.symbol === update.symbol
            ? { ...h, current_price: update.price, updated_at: new Date().toISOString() }
            : h
        )
      );
    });

    return () => {
      unsubscribePrices();
      closeWebSocketConnection();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      updatePrices();
    }, 3000);

    return () => clearInterval(interval);
  }, [holdings]);

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
    } catch (error) {
      console.error('Error updating prices:', error);
    }
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Dashboard için veri yok</h1>
          <p className="text-xl text-gray-400">Ana uygulamadan varlık ekleyin</p>
        </div>
      </div>
    );
  }

  return (
    <LiveDashboard
      holdings={holdings}
      totalValue={totalCurrentValue}
      totalInvestment={totalInvestment}
      totalPnL={totalProfitLoss}
      totalPnLPercent={totalProfitLossPercent}
    />
  );
}

export default DashboardApp;
