import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { PortfolioSnapshot } from '../services/analyticsService';

interface PortfolioChartProps {
  data: PortfolioSnapshot[];
  type?: 'line' | 'area';
}

export function PortfolioChart({ data, type = 'area' }: PortfolioChartProps) {
  const chartData = data
    .filter((snapshot) => snapshot.date)
    .map((snapshot) => {
      try {
        return {
          date: format(new Date(snapshot.date), 'dd MMM'),
          value: Number(snapshot.total_value) || 0,
          investment: Number(snapshot.total_investment) || 0,
          pnl: Number(snapshot.total_pnl) || 0,
        };
      } catch (error) {
        console.error('Error formatting date:', snapshot.date, error);
        return null;
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const valueData = payload.find((p: any) => p.dataKey === 'value');
      const investmentData = payload.find((p: any) => p.dataKey === 'investment');

      if (!valueData || !investmentData) return null;

      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-slate-700 dark:text-gray-200 mb-2">{payload[0].payload.date}</p>
          <div className="space-y-1">
            <p className="text-sm text-slate-600 dark:text-gray-400">
              Değer: <span className="font-bold text-slate-900 dark:text-gray-100">{valueData.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-gray-400">
              Yatırım: <span className="font-bold text-slate-900 dark:text-gray-100">{investmentData.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-gray-400">
              PnL: <span className={`font-bold ${(valueData.value - investmentData.value) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {(valueData.value - investmentData.value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#64748b" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
          <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
            name="Portföy Değeri"
          />
          <Area
            type="monotone"
            dataKey="investment"
            stroke="#64748b"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorInvestment)"
            name="Yatırım"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
        <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
          name="Portföy Değeri"
        />
        <Line
          type="monotone"
          dataKey="investment"
          stroke="#64748b"
          strokeWidth={2}
          dot={{ fill: '#64748b', r: 4 }}
          activeDot={{ r: 6 }}
          name="Yatırım"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
