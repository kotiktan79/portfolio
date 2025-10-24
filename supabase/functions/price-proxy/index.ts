import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PriceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const symbols = url.searchParams.get('symbols')?.split(',') || [];

    let result: PriceResponse;

    switch (type) {
      case 'usd':
        result = await fetchUSDTRY();
        break;
      case 'eur':
        result = await fetchEURTRY();
        break;
      case 'gold':
        result = await fetchGold();
        break;
      case 'crypto':
        result = await fetchCrypto(symbols);
        break;
      case 'bist':
        result = await fetchBIST(symbols);
        break;
      case 'european':
        result = await fetchEuropeanStock(symbols[0]);
        break;
      default:
        result = { success: false, error: 'Invalid type parameter' };
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function fetchUSDTRY(): Promise<PriceResponse> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!response.ok) throw new Error('Exchange rate API failed');
    
    const data = await response.json();
    return { success: true, data: { rate: data.rates.TRY } };
  } catch (error) {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) throw new Error('Alternative API failed');
      
      const data = await response.json();
      return { success: true, data: { rate: data.rates?.TRY || 42.0 } };
    } catch (altError) {
      return { success: false, error: altError.message };
    }
  }
}

async function fetchEURTRY(): Promise<PriceResponse> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    if (!response.ok) throw new Error('Exchange rate API failed');
    
    const data = await response.json();
    return { success: true, data: { rate: data.rates.TRY } };
  } catch (error) {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/EUR');
      if (!response.ok) throw new Error('Alternative API failed');
      
      const data = await response.json();
      return { success: true, data: { rate: data.rates?.TRY || 48.8 } };
    } catch (altError) {
      return { success: false, error: altError.message };
    }
  }
}

async function fetchGold(): Promise<PriceResponse> {
  try {
    const response = await fetch('https://data-asg.goldprice.org/dbXRates/USD');
    if (!response.ok) throw new Error('Gold API failed');
    
    const data = await response.json();
    const pricePerOz = data.items?.[0]?.xauPrice;
    
    if (!pricePerOz) throw new Error('No gold price data');
    
    return { success: true, data: { pricePerOz } };
  } catch (error) {
    try {
      const response = await fetch('https://api.metals.live/v1/spot/gold');
      if (!response.ok) throw new Error('Alternative gold API failed');
      
      const data = await response.json();
      const pricePerOz = data[0]?.price || data.price;
      
      if (!pricePerOz) throw new Error('No gold price data');
      
      return { success: true, data: { pricePerOz } };
    } catch (altError) {
      return { success: false, error: altError.message };
    }
  }
}

async function fetchCrypto(symbols: string[]): Promise<PriceResponse> {
  try {
    const CRYPTO_MAP: Record<string, string> = {
      'BTC': 'BTCUSDT',
      'ETH': 'ETHUSDT',
      'SOL': 'SOLUSDT',
      'XRP': 'XRPUSDT',
      'LINK': 'LINKUSDT',
      'ADA': 'ADAUSDT',
      'AVAX': 'AVAXUSDT',
      'DOT': 'DOTUSDT',
      'MATIC': 'MATICUSDT',
      'BNB': 'BNBUSDT',
      'DOGE': 'DOGEUSDT',
    };

    const prices: Record<string, number> = {};
    
    for (const symbol of symbols) {
      const binanceSymbol = CRYPTO_MAP[symbol];
      if (!binanceSymbol) continue;

      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`);
      if (response.ok) {
        const data = await response.json();
        prices[symbol] = parseFloat(data.price);
      }
    }

    return { success: true, data: prices };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function fetchBIST(symbols: string[]): Promise<PriceResponse> {
  try {
    const prices: Record<string, any> = {};
    const results = await Promise.allSettled(
      symbols.map(symbol => fetchBISTPrice(symbol.trim()))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        prices[symbols[index].trim()] = result.value;
      }
    });

    return { success: true, data: prices };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function fetchBISTPrice(symbol: string): Promise<any> {
  const timestamp = Date.now();

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}.IS&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,regularMarketPreviousClose&_=${timestamp}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const quote = data?.quoteResponse?.result?.[0];

      if (quote?.regularMarketPrice) {
        return {
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          volume: quote.regularMarketVolume || 0,
        };
      }
    }

    return await fetchBISTFromV8(symbol);
  } catch (error) {
    return await fetchBISTFromV8(symbol);
  }
}

async function fetchBISTFromV8(symbol: string): Promise<any> {
  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}.IS?interval=1m&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          'Accept': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;

      if (meta?.regularMarketPrice) {
        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
        
        return {
          price: currentPrice,
          change: currentPrice - previousClose,
          changePercent: ((currentPrice - previousClose) / previousClose) * 100,
          volume: meta.regularMarketVolume || 0,
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function fetchEuropeanStock(symbol: string): Promise<PriceResponse> {
  try {
    const STOCK_MAP: Record<string, string> = {
      'ASML': 'ASML.AS',
      'LVMH': 'MC.PA',
      'SAP': 'SAP.DE',
      'TTE': 'TTE.PA',
      'OR': 'OR.PA',
      'SAN': 'SAN.PA',
      'AIR': 'AIR.PA',
      'SU': 'SU.PA',
      'NOKIA': 'NOKIA.HE',
      'BMW': 'BMW.DE',
      'SIEMENS': 'SIE.DE',
      'ADYEN': 'ADYEN.AS',
      'PROSUS': 'PRX.AS',
    };

    const tickerSymbol = STOCK_MAP[symbol];
    if (!tickerSymbol) {
      return { success: false, error: 'Unknown European stock symbol' };
    }

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${tickerSymbol}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      }
    );

    if (!response.ok) throw new Error('Yahoo Finance failed');

    const data = await response.json();
    const priceEUR = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (!priceEUR) throw new Error('No price data');

    return { success: true, data: { price: priceEUR } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}