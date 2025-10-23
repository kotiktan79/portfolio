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
    const results = await Promise.allSettled(
      symbols.map(symbol => fetchBISTPrice(symbol.trim()))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        prices[symbols[index].trim()] = result.value;
      }
    });

    return new Response(
      JSON.stringify({ success: true, data: prices, count: Object.keys(prices).length }),
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
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}.IS&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,regularMarketPreviousClose`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }
    );

    if (!response.ok) {
      console.log(`Yahoo v7 failed for ${symbol}, trying v8...`);
      return await fetchFromYahooV8(symbol);
    }

    const data = await response.json();
    const quote = data?.quoteResponse?.result?.[0];
    
    if (!quote || !quote.regularMarketPrice) {
      return await fetchFromYahooV8(symbol);
    }

    const currentPrice = quote.regularMarketPrice;
    const previousClose = quote.regularMarketPreviousClose || currentPrice;
    const change = quote.regularMarketChange || 0;
    const changePercent = quote.regularMarketChangePercent || 0;

    console.log(`✅ ${symbol}: ${currentPrice} TRY (Yahoo v7)`);

    return {
      symbol,
      price: currentPrice,
      change,
      changePercent,
      volume: quote.regularMarketVolume || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Yahoo v7 error for ${symbol}:`, error);
    return await fetchFromYahooV8(symbol);
  }
}

async function fetchFromYahooV8(symbol: string): Promise<BISTPrice | null> {
  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}.IS?interval=1m&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }
    );

    if (!response.ok) {
      console.log(`Yahoo v8 failed for ${symbol}, trying quoteSummary...`);
      return await fetchFromQuoteSummary(symbol);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    
    if (!meta || !meta.regularMarketPrice) {
      return await fetchFromQuoteSummary(symbol);
    }

    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    console.log(`✅ ${symbol}: ${currentPrice} TRY (Yahoo v8)`);

    return {
      symbol,
      price: currentPrice,
      change,
      changePercent,
      volume: meta.regularMarketVolume || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Yahoo v8 error for ${symbol}:`, error);
    return await fetchFromQuoteSummary(symbol);
  }
}

async function fetchFromQuoteSummary(symbol: string): Promise<BISTPrice | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}.IS?modules=price,summaryDetail`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }
    );

    if (!response.ok) {
      console.log(`QuoteSummary failed for ${symbol}`);
      return null;
    }

    const data = await response.json();
    const price = data?.quoteSummary?.result?.[0]?.price;

    if (!price || !price.regularMarketPrice?.raw) {
      return null;
    }

    const currentPrice = price.regularMarketPrice.raw;
    const previousClose = price.regularMarketPreviousClose?.raw || currentPrice;
    const change = price.regularMarketChange?.raw || 0;
    const changePercent = price.regularMarketChangePercent?.raw || 0;

    console.log(`✅ ${symbol}: ${currentPrice} TRY (QuoteSummary)`);

    return {
      symbol,
      price: currentPrice,
      change,
      changePercent,
      volume: price.regularMarketVolume?.raw || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`QuoteSummary error for ${symbol}:`, error);
    return null;
  }
}
