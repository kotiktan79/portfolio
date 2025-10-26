import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../services/priceService';

interface PnLCardProps {
  title: string;
  totalValue: number;
  totalInvestment: number;
  pnl: number;
  pnlPercentage: number;
  className?: string;
}

export function PnLCard({ title, totalValue, totalInvestment, pnl, pnlPercentage, className = '' }: PnLCardProps) {
  const isProfit = pnl >= 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Toplam Değer</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Yatırım</span>
          <span className="text-gray-900 dark:text-white">{formatCurrency(totalInvestment)}</span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Kar/Zarar</span>
            <div className={`flex items-center gap-2 text-lg font-bold ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span>{formatCurrency(Math.abs(pnl))}</span>
              <span className="text-base">({pnlPercentage.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
