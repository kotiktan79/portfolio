import { Holding } from '../lib/supabase';

interface LiveDashboardProps {
  holdings: Holding[];
  totalValue: number;
  totalInvestment: number;
  totalPnL: number;
  totalPnLPercent: number;
}

export function LiveDashboard({
  holdings,
  totalValue,
  totalInvestment,
  totalPnL,
  totalPnLPercent
}: LiveDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Live Dashboard</h1>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-2">Total Value</div>
          <div className="text-3xl font-bold">${totalValue.toFixed(2)}</div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-2">Total Investment</div>
          <div className="text-3xl font-bold">${totalInvestment.toFixed(2)}</div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-gray-400 text-sm mb-2">P&L</div>
          <div className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${totalPnL.toFixed(2)} ({totalPnLPercent.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {holdings.map(holding => (
          <div key={holding.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
            <div>
              <div className="text-xl font-bold">{holding.symbol}</div>
              <div className="text-gray-400">{holding.name}</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">${holding.current_price.toFixed(2)}</div>
              <div className="text-gray-400">Qty: {holding.quantity}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
