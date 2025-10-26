import React from 'react';
import { Edit2, TrendingUp, TrendingDown } from 'lucide-react';
import { Holding } from '../lib/supabase';
import { formatCurrency } from '../services/priceService';

interface HoldingRowProps {
  holding: Holding;
  onEdit: (holding: Holding) => void;
  onDelete?: (id: string) => void;
  onTransactionComplete?: () => void;
}

export function HoldingRow({ holding, onEdit }: HoldingRowProps) {
  const currentValue = holding.current_price * holding.quantity;
  const investedValue = holding.purchase_price * holding.quantity;
  const pnl = currentValue - investedValue;
  const pnlPercentage = ((pnl / investedValue) * 100);
  const isProfit = pnl >= 0;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-6 py-4">
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{holding.symbol}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{holding.asset_type}</div>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="text-gray-900 dark:text-white">{holding.quantity.toFixed(4)}</div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="text-gray-900 dark:text-white">{formatCurrency(holding.purchase_price)}</div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="text-gray-900 dark:text-white">{formatCurrency(holding.current_price)}</div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="text-gray-900 dark:text-white font-medium">{formatCurrency(currentValue)}</div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className={`flex items-center justify-end gap-1 font-medium ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{formatCurrency(Math.abs(pnl))}</span>
          <span className="text-sm">({pnlPercentage.toFixed(2)}%)</span>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={() => onEdit(holding)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <Edit2 className="w-5 h-5" />
        </button>
      </td>
    </tr>
  );
}
