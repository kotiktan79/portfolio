import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BISTPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
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
    const symbols = url.searchParams.get('symbols')?.split(',') || [];

    if (symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No symbols provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const prices: Record<string, BISTPrice> = {};

    for (const symbol of symbols) {
      const price = await fetchBISTPrice(symbol.trim());
      if (price) {
        prices[symbol] = price;
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: prices }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function fetchBISTPrice(symbol: string): Promise<BISTPrice | null> {
  try {
    const yahooSymbol = `${symbol}.IS`;
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!response.ok) {
      console.log(`Yahoo failed for ${symbol}, trying alternative...`);
      return await fetchFromAlternative(symbol);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    
    if (!meta) {
      return await fetchFromAlternative(symbol);
    }

    const currentPrice = meta.regularMarketPrice || meta.previousClose;
    const previousClose = meta.chartPreviousClose || meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol,
      price: currentPrice,
      change,
      changePercent,
      volume: meta.regularMarketVolume || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return await fetchFromAlternative(symbol);
  }
}

async function fetchFromAlternative(symbol: string): Promise<BISTPrice | null> {
  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}.IS?modules=price`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!response.ok) {
      console.log(`Alternative Yahoo failed for ${symbol}`);
      return null;
    }

    const data = await response.json();
    const price = data?.quoteSummary?.result?.[0]?.price;

    if (!price) {
      return null;
    }

    const currentPrice = price.regularMarketPrice?.raw || price.previousClose?.raw;
    const previousClose = price.regularMarketPreviousClose?.raw;
    const change = price.regularMarketChange?.raw || 0;
    const changePercent = price.regularMarketChangePercent?.raw || 0;

    return {
      symbol,
      price: currentPrice,
      change,
      changePercent,
      volume: price.regularMarketVolume?.raw || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Alternative fetch failed for ${symbol}:`, error);
    return null;
  }
}
