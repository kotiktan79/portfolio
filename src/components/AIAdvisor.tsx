import { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, Activity, Shield, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  analyzeRiskProfile,
  generateAIRecommendations,
  analyzeMarketSentiment,
  generatePortfolioInsights,
  type RiskProfile,
  type AIRecommendation,
  type MarketSentiment,
  type PortfolioInsight,
} from '../services/aiAdvisorService';

export default function AIAdvisor() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null);
  const [insights, setInsights] = useState<PortfolioInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data } = await supabase.from('holdings').select('*').gt('quantity', 0);
      if (data) {
        setHoldings(data);
        await runAnalysis(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis(holdingsData: any[]) {
    setAnalyzing(true);
    try {
      const profile = await analyzeRiskProfile(holdingsData);
      setRiskProfile(profile);

      const recs = await generateAIRecommendations(holdingsData, profile);
      setRecommendations(recs);

      const sent = await analyzeMarketSentiment(holdingsData);
      setSentiment(sent);

      const insightsData = await generatePortfolioInsights(holdingsData, profile, sent);
      setInsights(insightsData);
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setAnalyzing(false);
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'conservative':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'aggressive':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'very_aggressive':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'bearish':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium':
        return <Lightbulb className="w-5 h-5 text-yellow-600" />;
      default:
        return <Target className="w-5 h-5 text-blue-600" />;
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'buy':
        return 'bg-green-50 border-green-200';
      case 'sell':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'rebalance':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          AI Analiz için varlık gerekli
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Portföyünüze varlık ekleyin ve AI danışmanınızı kullanmaya başlayın.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Brain className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">AI Portföy Danışmanı</h2>
            <p className="text-blue-100">Kişiselleştirilmiş öneriler ve analizler</p>
          </div>
        </div>
        <button
          onClick={() => runAnalysis(holdings)}
          disabled={analyzing}
          className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 font-semibold transition-colors"
        >
          <Sparkles className="w-5 h-5" />
          {analyzing ? 'Analiz ediliyor...' : 'Yeniden Analiz Et'}
        </button>
      </div>

      {riskProfile && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Risk Profili</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${getRiskColor(
                  riskProfile.level
                )} font-bold text-lg mb-4`}
              >
                {riskProfile.level === 'conservative' && '🛡️ Muhafazakar'}
                {riskProfile.level === 'moderate' && '⚖️ Dengeli'}
                {riskProfile.level === 'aggressive' && '🚀 Agresif'}
                {riskProfile.level === 'very_aggressive' && '⚡ Çok Agresif'}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Genel Risk Skoru
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {riskProfile.score.toFixed(0)}/100
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${riskProfile.score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Çeşitlendirme</span>
                  <span className="text-sm font-bold">
                    {riskProfile.factors.diversification.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${riskProfile.factors.diversification}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Volatilite</span>
                  <span className="text-sm font-bold">
                    {riskProfile.factors.volatility.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${riskProfile.factors.volatility}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Konsantrasyon</span>
                  <span className="text-sm font-bold">
                    {riskProfile.factors.concentration.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{ width: `${riskProfile.factors.concentration}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Varlık Dağılımı</span>
                  <span className="text-sm font-bold">
                    {riskProfile.factors.asset_allocation.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{ width: `${riskProfile.factors.asset_allocation}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {sentiment && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Piyasa Sentiment</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${getSentimentColor(
                  sentiment.overall
                )} font-bold text-lg mb-4`}
              >
                {sentiment.overall === 'bullish' && (
                  <>
                    <TrendingUp className="w-5 h-5" /> Yükseliş
                  </>
                )}
                {sentiment.overall === 'bearish' && (
                  <>
                    <TrendingDown className="w-5 h-5" /> Düşüş
                  </>
                )}
                {sentiment.overall === 'neutral' && '↔️ Nötr'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Genel piyasa skoru: {sentiment.score.toFixed(0)}/100
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Teknik</span>
                <span className="text-sm font-bold">
                  {sentiment.signals.technical.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Fundamental</span>
                <span className="text-sm font-bold">
                  {sentiment.signals.fundamental.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Sentiment</span>
                <span className="text-sm font-bold">
                  {sentiment.signals.sentiment.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="w-6 h-6 text-yellow-600" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              AI Önerileri ({recommendations.length})
            </h3>
          </div>

          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${getRecommendationColor(rec.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getPriorityIcon(rec.priority)}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                      {rec.title}
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {rec.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        <strong>Sebep:</strong> {rec.reason}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        <strong>Etki:</strong> {rec.impact}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        <strong>Güven:</strong> %{rec.confidence}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Portföy İçgörüleri
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  insight.severity === 'critical'
                    ? 'bg-red-50 border-red-200'
                    : insight.severity === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                  {insight.title}
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
