import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatCurrencyUSD, getCachedUSDRate } from '../services/priceService';

interface ProfitSummaryProps {
  unrealizedProfit: number;
  unrealizedProfitPercent: number;
}

export function ProfitSummary({ unrealizedProfit, unrealizedProfitPercent }: ProfitSummaryProps) {
  const [realizedProfit, setRealizedProfit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usdRate, setUsdRate] = useState(42);

  useEffect(() => {
    fetchRealizedProfit();
    getCachedUSDRate().then(setUsdRate);
  }, []);

  async function fetchRealizedProfit() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('realized_profit')
        .eq('transaction_type', 'sell');

      if (error) throw error;

      const total = data?.reduce((sum, t) => sum + (t.realized_profit || 0), 0) || 0;
      setRealizedProfit(total);
    } catch (error) {
      console.error('Error fetching realized profit:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalProfit = realizedProfit + unrealizedProfit;
  const isPositive = totalProfit >= 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse">
          <div className="h-20 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-sm border border-green-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-green-700">Gerçekleşen Kar/Zarar</h3>
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="text-green-600" size={20} />
          </div>
        </div>
        <p className={`text-2xl font-bold ${realizedProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
          {formatCurrency(realizedProfit)} ₺
        </p>
        <p className={`text-lg font-semibold ${realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${formatCurrencyUSD(realizedProfit, usdRate)}
        </p>
        <p className="text-xs text-green-600 mt-1">Satışlardan elde edilen</p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl shadow-sm border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-blue-700">Gerçekleşmeyen Kar/Zarar</h3>
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="text-blue-600" size={20} />
          </div>
        </div>
        <p className={`text-2xl font-bold ${unrealizedProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
          {formatCurrency(unrealizedProfit)} ₺
        </p>
        <p className={`text-lg font-semibold ${unrealizedProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
          ${formatCurrencyUSD(unrealizedProfit, usdRate)}
        </p>
        <p className={`text-xs mt-1 ${unrealizedProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
          {unrealizedProfit >= 0 ? '+' : ''}{unrealizedProfitPercent.toFixed(2)}% (Mevcut pozisyonlar)
        </p>
      </div>

      <div className={`bg-gradient-to-br ${
        isPositive ? 'from-emerald-50 to-teal-50 border-emerald-200' : 'from-red-50 to-rose-50 border-red-200'
      } p-6 rounded-xl shadow-sm border`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-sm font-medium ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
            Toplam Kar/Zarar
          </h3>
          <div className={`p-2 rounded-lg ${isPositive ? 'bg-emerald-100' : 'bg-red-100'}`}>
            {isPositive ? (
              <TrendingUp className="text-emerald-600" size={20} />
            ) : (
              <TrendingDown className="text-red-600" size={20} />
            )}
          </div>
        </div>
        <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
          {formatCurrency(totalProfit)} ₺
        </p>
        <p className={`text-lg font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          ${formatCurrencyUSD(totalProfit, usdRate)}
        </p>
        <p className={`text-xs mt-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          Gerçekleşen + Gerçekleşmeyen
        </p>
      </div>
    </div>
  );
}
