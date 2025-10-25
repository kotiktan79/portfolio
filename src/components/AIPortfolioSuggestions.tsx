import { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Target, Lightbulb } from 'lucide-react';
import { Holding } from '../lib/supabase';
import { calculateVolatility } from '../services/technicalIndicators';

interface Suggestion {
  type: 'warning' | 'opportunity' | 'rebalance' | 'risk';
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIPortfolioSuggestionsProps {
  holdings: Holding[];
  totalValue: number;
}

export function AIPortfolioSuggestions({ holdings, totalValue }: AIPortfolioSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generateSuggestions();
  }, [holdings, totalValue]);

  function generateSuggestions() {
    setLoading(true);
    const newSuggestions: Suggestion[] = [];

    const totalPnL = holdings.reduce((sum, h) => {
      const invested = h.purchase_price * h.quantity;
      const current = h.current_price * h.quantity;
      return sum + (current - invested);
    }, 0);

    const pnlPercent = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;

    if (holdings.length < 5) {
      newSuggestions.push({
        type: 'warning',
        title: 'Düşük Çeşitlendirme',
        description: `Portföyünüzde sadece ${holdings.length} varlık var. Riski azaltmak için en az 8-10 farklı varlık tutmanız önerilir.`,
        action: 'Farklı sektörlerden varlık ekleyin',
        priority: 'high',
      });
    }

    const assetTypes = new Set(holdings.map(h => h.asset_type));
    if (assetTypes.size === 1) {
      newSuggestions.push({
        type: 'risk',
        title: 'Tek Varlık Sınıfı',
        description: 'Tüm yatırımlarınız tek bir varlık sınıfında. Kripto, hisse ve döviz arasında dağıtım yapmanız önerilir.',
        action: 'Varlık sınıfı çeşitliliği ekleyin',
        priority: 'high',
      });
    }

    const dominantHolding = holdings.reduce((max, h) => {
      const value = h.current_price * h.quantity;
      const maxValue = max.current_price * max.quantity;
      return value > maxValue ? h : max;
    }, holdings[0]);

    const dominantPercent = (dominantHolding.current_price * dominantHolding.quantity / totalValue) * 100;

    if (dominantPercent > 40) {
      newSuggestions.push({
        type: 'rebalance',
        title: 'Yüksek Konsantrasyon',
        description: `${dominantHolding.symbol} portföyünüzün %${dominantPercent.toFixed(1)}'ini oluşturuyor. Tek varlığa bu kadar bağımlılık risklidir.`,
        action: 'Pozisyon küçültmeyi düşünün',
        priority: 'medium',
      });
    }

    const losingPositions = holdings.filter(h => {
      const pnl = (h.current_price - h.purchase_price) * h.quantity;
      return pnl < 0 && Math.abs(pnl) > (h.purchase_price * h.quantity * 0.2);
    });

    if (losingPositions.length > 0) {
      newSuggestions.push({
        type: 'warning',
        title: 'Büyük Kayıplar',
        description: `${losingPositions.length} varlıkta %20'den fazla kayıp var. Stop-loss stratejisi belirlemelisiniz.`,
        action: 'Kayıp sınırı belirleyin',
        priority: 'high',
      });
    }

    if (pnlPercent > 50) {
      newSuggestions.push({
        type: 'opportunity',
        title: 'Kar Realizasyonu',
        description: `Portföyünüz %${pnlPercent.toFixed(1)} kar etti. Karınızın bir kısmını realize etmeyi düşünebilirsiniz.`,
        action: 'Kısmi kar satışı yapın',
        priority: 'medium',
      });
    }

    const cryptoHoldings = holdings.filter(h => h.asset_type === 'crypto');
    if (cryptoHoldings.length > 0) {
      const cryptoValue = cryptoHoldings.reduce((sum, h) => sum + h.current_price * h.quantity, 0);
      const cryptoPercent = (cryptoValue / totalValue) * 100;

      if (cryptoPercent > 50) {
        newSuggestions.push({
          type: 'risk',
          title: 'Yüksek Kripto Oranı',
          description: `Portföyünüzün %${cryptoPercent.toFixed(1)}'i kriptoda. Volatilite riski yüksek.`,
          action: 'Stabil varlık oranını artırın',
          priority: 'medium',
        });
      }
    }

    if (holdings.length >= 3) {
      const prices = holdings.map(h => h.current_price);
      const volatility = calculateVolatility(prices);

      if (volatility > 30) {
        newSuggestions.push({
          type: 'risk',
          title: 'Yüksek Volatilite',
          description: `Portföy volatilitesi %${volatility.toFixed(1)}. Daha stabil varlıklar eklemeyi düşünün.`,
          action: 'Düşük riskli varlık ekleyin',
          priority: 'low',
        });
      }
    }

    const holdingsWithoutStopLoss = holdings.filter(h => {
      const pnl = (h.current_price - h.purchase_price) * h.quantity;
      const invested = h.purchase_price * h.quantity;
      return pnl / invested < -0.05;
    });

    if (holdingsWithoutStopLoss.length > 2) {
      newSuggestions.push({
        type: 'warning',
        title: 'Stop-Loss Eksikliği',
        description: 'Kayıp veren pozisyonlarınız için stop-loss belirlemelisiniz.',
        action: 'Risk yönetimi menüsünü kontrol edin',
        priority: 'high',
      });
    }

    setSuggestions(newSuggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }));

    setLoading(false);
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="text-amber-600" size={20} />;
      case 'opportunity':
        return <Lightbulb className="text-green-600" size={20} />;
      case 'rebalance':
        return <Target className="text-blue-600" size={20} />;
      case 'risk':
        return <AlertTriangle className="text-red-600" size={20} />;
      default:
        return <Brain className="text-purple-600" size={20} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20';
      case 'opportunity':
        return 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20';
      case 'rebalance':
        return 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20';
      case 'risk':
        return 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20';
      default:
        return 'border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="text-purple-600" size={24} />
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              AI Portföy Önerileri
            </h3>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              Yapay zeka destekli analiz
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <TrendingUp className="text-purple-600" size={16} />
          <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
            {suggestions.length} Öneri
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="mx-auto text-slate-300 dark:text-gray-600 mb-4" size={48} />
          <p className="text-slate-500 dark:text-gray-400">
            Harika! Portföyünüz dengeli görünüyor.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${getColor(suggestion.type)} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">{getIcon(suggestion.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {suggestion.title}
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded whitespace-nowrap ${getPriorityBadge(
                        suggestion.priority
                      )}`}
                    >
                      {suggestion.priority === 'high'
                        ? 'Yüksek'
                        : suggestion.priority === 'medium'
                        ? 'Orta'
                        : 'Düşük'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-gray-400 mb-2">
                    {suggestion.description}
                  </p>
                  {suggestion.action && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-gray-300">
                      <Target size={14} />
                      {suggestion.action}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
