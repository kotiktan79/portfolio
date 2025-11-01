import { useState, useEffect, memo } from 'react';
import { Pencil, Trash2, TrendingUp, TrendingDown, Edit3, Lock } from 'lucide-react';
import { Holding } from '../lib/supabase';
import { formatCurrency, formatCurrencyUSD, formatPercentage, getCachedUSDRate } from '../services/priceService';
import { BuySellModal } from './BuySellModal';
import { ManualPriceUpdateModal } from './ManualPriceUpdateModal';
import { detectCurrency, calculatePnLWithCurrency, getCurrencySymbol } from '../services/currencyService';

interface HoldingRowProps {
  holding: Holding;
  onEdit: (holding: Holding) => void;
  onDelete: (id: string) => void;
  onTransactionComplete: () => void;
}

export const HoldingRow = memo(function HoldingRow({ holding, onEdit, onDelete, onTransactionComplete }: HoldingRowProps) {
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showPriceUpdateModal, setShowPriceUpdateModal] = useState(false);
  const [usdRate, setUsdRate] = useState(42);
  const [pnlData, setPnlData] = useState({ pnl: 0, pnlPercent: 0, currentValue: 0 });

  useEffect(() => {
    getCachedUSDRate().then(setUsdRate);
    calculatePnL();
  }, [holding]);

  async function calculatePnL() {
    const currency = (holding as any).currency || detectCurrency(holding.symbol, holding.asset_type);
    const purchaseCurrency = (holding as any).purchase_currency || currency;

    const result = await calculatePnLWithCurrency(
      holding.purchase_price,
      purchaseCurrency,
      holding.current_price,
      currency,
      holding.quantity,
      'TRY'
    );

    setPnlData({
      pnl: result.pnl,
      pnlPercent: result.pnlPercent,
      currentValue: result.currentValue,
    });
  }

  const isPositive = pnlData.pnl >= 0;

  const getAssetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      stock: 'Hisse',
      crypto: 'Kripto',
      currency: 'Döviz',
      fund: 'Fon',
      eurobond: 'Eurobond',
      commodity: 'Emtia',
    };
    return labels[type] || type;
  };

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4">
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">{holding.symbol}</span>
            <span className="text-sm text-gray-500">{getAssetTypeLabel(holding.asset_type)}</span>
          </div>
        </td>
        <td className="px-6 py-4 text-right text-gray-700">
          {formatCurrency(holding.purchase_price, 4)}
        </td>
        <td className="px-6 py-4 text-right text-gray-700">
          {formatCurrency(holding.quantity, 8)}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-gray-900">
                  {formatCurrency(holding.current_price, 4)} {getCurrencySymbol((holding as any).currency || detectCurrency(holding.symbol, holding.asset_type))}
                </span>
                {holding.manual_price && (
                  <Lock size={12} className="text-blue-600" />
                )}
              </div>
              {holding.manual_price && holding.manual_price_updated_at && (
                <span className="text-xs text-blue-600">
                  {new Date(holding.manual_price_updated_at).toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
              {holding.price_notes && (
                <span className="text-xs text-gray-500 italic max-w-[150px] truncate" title={holding.price_notes}>
                  {holding.price_notes}
                </span>
              )}
            </div>
            {(holding.asset_type === 'fund' || holding.asset_type === 'eurobond') && (
              <button
                onClick={() => setShowPriceUpdateModal(true)}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Fiyat Güncelle"
              >
                <Edit3 size={14} />
              </button>
            )}
          </div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex flex-col items-end">
            <span className="font-bold text-gray-900 dark:text-white">
              {formatCurrency(pnlData.currentValue)} ₺
            </span>
            <span className="text-sm text-blue-600 dark:text-blue-400">
              ${formatCurrencyUSD(pnlData.currentValue, usdRate)}
            </span>
            {((holding as any).currency && (holding as any).currency !== 'TRY') && (
              <span className="text-xs text-blue-600">
                {getCurrencySymbol((holding as any).currency)} bazlı
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex flex-col items-end">
            <span className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(pnlData.pnl)} ₺
            </span>
            <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              ${formatCurrencyUSD(pnlData.pnl, usdRate)}
            </span>
            <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(pnlData.pnlPercent)}
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowBuyModal(true)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Alış Yap"
            >
              <TrendingUp size={18} />
            </button>
            <button
              onClick={() => setShowSellModal(true)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Satış Yap"
            >
              <TrendingDown size={18} />
            </button>
            <button
              onClick={() => onEdit(holding)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Düzenle"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => onDelete(holding.id)}
              className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              title="Sil"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </td>
      </tr>

      {showBuyModal && (
        <BuySellModal
          holding={holding}
          type="buy"
          onClose={() => setShowBuyModal(false)}
          onComplete={() => {
            setShowBuyModal(false);
            onTransactionComplete();
          }}
        />
      )}

      {showSellModal && (
        <BuySellModal
          holding={holding}
          type="sell"
          onClose={() => setShowSellModal(false)}
          onComplete={() => {
            setShowSellModal(false);
            onTransactionComplete();
          }}
        />
      )}

      {showPriceUpdateModal && (
        <ManualPriceUpdateModal
          isOpen={showPriceUpdateModal}
          onClose={() => setShowPriceUpdateModal(false)}
          symbol={holding.symbol}
          currentPrice={holding.current_price}
          onUpdatePrice={async (_symbol, newPrice, notes) => {
            const { supabase } = await import('../lib/supabase');
            const { error } = await supabase
              .from('holdings')
              .update({
                current_price: newPrice,
                manual_price: true,
                manual_price_updated_at: new Date().toISOString(),
                price_notes: notes || null,
                updated_at: new Date().toISOString()
              })
              .eq('id', holding.id);

            if (error) throw error;
            onTransactionComplete();
          }}
        />
      )}
    </>
  );
});
