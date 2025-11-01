import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PortfolioData {
  holdings: Array<{
    symbol: string;
    asset_type: string;
    quantity: number;
    avg_price: number;
    current_price: number;
    total_value: number;
    profit_loss: number;
    profit_loss_percent: number;
  }>;
  total_value: number;
  total_invested: number;
  total_profit_loss: number;
  total_profit_loss_percent: number;
}

interface AIRequest {
  portfolio: PortfolioData;
  analysisType: 'overview' | 'risk' | 'diversification' | 'suggestions';
  riskProfile?: 'conservative' | 'moderate' | 'aggressive';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { portfolio, analysisType, riskProfile = 'moderate' }: AIRequest = await req.json();

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OpenAI API key not configured',
          suggestions: getStaticSuggestions(portfolio, analysisType, riskProfile)
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const prompt = buildPrompt(portfolio, analysisType, riskProfile);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Sen profesyonel bir yatırım danışmanısın. Türk yatırımcılara portföy analizi ve önerileri sunuyorsun. Yanıtlarını Türkçe, net, anlaşılır ve uygulanabilir şekilde ver. Risk analizi, diversifikasyon ve piyasa trendlerini göz önünde bulundur.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'AI service temporarily unavailable',
          suggestions: getStaticSuggestions(portfolio, analysisType, riskProfile)
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({
        success: true,
        analysis: aiResponse,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        suggestions: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function buildPrompt(portfolio: PortfolioData, analysisType: string, riskProfile: string): string {
  const { holdings, total_value, total_invested, total_profit_loss_percent } = portfolio;

  const assetDistribution = holdings.reduce((acc, h) => {
    acc[h.asset_type] = (acc[h.asset_type] || 0) + h.total_value;
    return acc;
  }, {} as Record<string, number>);

  const distText = Object.entries(assetDistribution)
    .map(([type, value]) => `${type}: ${((value / total_value) * 100).toFixed(1)}%`)
    .join(', ');

  const topHoldings = holdings
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, 5)
    .map(h => `${h.symbol} (${h.asset_type}): ${((h.total_value / total_value) * 100).toFixed(1)}%`)
    .join(', ');

  const baseInfo = `
Portföy Özeti:
- Toplam Değer: ${total_value.toFixed(2)} TL
- Yatırılan: ${total_invested.toFixed(2)} TL
- Kar/Zarar: %${total_profit_loss_percent.toFixed(2)}
- Varlık Dağılımı: ${distText}
- En Büyük 5 Holding: ${topHoldings}
- Risk Profili: ${riskProfile}
- Toplam ${holdings.length} pozisyon
`;

  switch (analysisType) {
    case 'overview':
      return `${baseInfo}\n\nBu portföy hakkında genel bir değerlendirme yap. Güçlü ve zayıf yönlerini belirt. 3-4 madde halinde özetle.`;
    
    case 'risk':
      return `${baseInfo}\n\nBu portföyün risk analizini yap. Konsantrasyon riski, volatilite, korelasyon gibi faktörleri değerlendir. Risk azaltma önerileri sun. 4-5 madde halinde.`;
    
    case 'diversification':
      return `${baseInfo}\n\nDiversifikasyon açısından portföyü değerlendir. Hangi varlık sınıflarında eksiklik var? Daha iyi bir dağılım için ne önerirsin? 4-5 madde halinde.`;
    
    case 'suggestions':
      return `${baseInfo}\n\nBu portföy için somut yatırım önerileri ver. Hangi varlıkları almayı/satmayı önerirsin? Hedef ağırlıklar belirt. Risk profiline uygun 5-6 öneri sun.`;
    
    default:
      return baseInfo;
  }
}

function getStaticSuggestions(portfolio: PortfolioData, analysisType: string, riskProfile: string): string[] {
  const cryptoRatio = portfolio.holdings
    .filter(h => h.asset_type === 'crypto')
    .reduce((sum, h) => sum + h.total_value, 0) / portfolio.total_value;

  const stockRatio = portfolio.holdings
    .filter(h => h.asset_type === 'stock')
    .reduce((sum, h) => sum + h.total_value, 0) / portfolio.total_value;

  const goldRatio = portfolio.holdings
    .filter(h => h.asset_type === 'commodity')
    .reduce((sum, h) => sum + h.total_value, 0) / portfolio.total_value;

  const suggestions: string[] = [];

  if (cryptoRatio > 0.5) {
    suggestions.push('⚠️ Kripto ağırlığı yüksek - Risk azaltmak için hisse veya altına geçiş yapabilirsiniz');
  }

  if (goldRatio < 0.1) {
    suggestions.push('💰 Altın pozisyonu düşük - Hedge olarak %10-15 altın eklemeyi düşünün');
  }

  if (stockRatio > 0.7) {
    suggestions.push('📊 Hisse yoğunluğu fazla - Portföyü dengeli hale getirmek için diversifikasyon öneriyoruz');
  }

  if (portfolio.holdings.length < 5) {
    suggestions.push('🎯 Pozisyon sayısı az - En az 8-10 farklı varlığa yayılım yapın');
  }

  if (portfolio.total_profit_loss_percent < -15) {
    suggestions.push('📉 Yüksek zarar - Pozisyonlarınızı gözden geçirin, stop-loss belirleyin');
  }

  if (suggestions.length === 0) {
    suggestions.push('✅ Portföyünüz dengeli görünüyor');
    suggestions.push('📈 Düzenli rebalancing yapmayı unutmayın');
    suggestions.push('💡 Risk yönetimi için stop-loss kullanın');
  }

  return suggestions;
}
