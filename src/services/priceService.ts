import { AssetType } from '../lib/supabase';
import { getCachedPrice, setCachedPrice } from './persistentCache';

interface PriceData {
  [symbol: string]: number;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  source: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

const BINANCE_API = 'https://api.binance.com/api/v3/ticker/price';
const BINANCE_WS = 'wss://stream.binance.com:9443/ws';

// Rate limiting
interface RateLimitInfo {
  requests: number[];
  limit: number;
  window: number; // milliseconds
}

const rateLimits: { [key: string]: RateLimitInfo } = {
  'binance': { requests: [], limit: 50, window: 60000 }, // 50/min
  'coingecko': { requests: [], limit: 10, window: 60000 }, // 10/min free tier
  'exchangerate': { requests: [], limit: 100, window: 3600000 }, // 100/hour
  'yahoo': { requests: [], limit: 100, window: 3600000 }, // Conservative limit
  'proxy': { requests: [], limit: 200, window: 60000 }, // 200/min
};

function canMakeRequest(service: string): boolean {
  const limit = rateLimits[service];
  if (!limit) return true;

  const now = Date.now();
  // Clean old requests
  limit.requests = limit.requests.filter(time => now - time < limit.window);

  if (limit.requests.length >= limit.limit) {
    console.warn(`⚠️ Rate limit reached for ${service}. Waiting...`);
    return false;
  }

  limit.requests.push(now);
  return true;
}

async function waitForRateLimit(service: string): Promise<void> {
  const limit = rateLimits[service];
  if (!limit) return;

  const now = Date.now();
  const oldestRequest = limit.requests[0];
  if (oldestRequest) {
    const waitTime = limit.window - (now - oldestRequest);
    if (waitTime > 0) {
      console.log(`⏳ Waiting ${Math.ceil(waitTime / 1000)}s for ${service} rate limit...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Retry wrapper for API calls (currently unused but kept for future use)
// @ts-ignore - unused function kept for future use
async function retryFetch<T>(
  fetchFn: () => Promise<T>,
  retries: number = 2,
  delay: number = 1000
): Promise<T | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      if (i === retries) {
        console.error(`All ${retries + 1} attempts failed`);
        return null;
      }
      console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  return null;
}

const CRYPTO_SYMBOLS: { [key: string]: string } = {
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

// CoinGecko IDs mapping (currently unused but kept for future use)
// @ts-ignore - unused constant kept for future use
const COINGECKO_IDS: { [key: string]: string } = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'XRP': 'ripple',
  'LINK': 'chainlink',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'BNB': 'binancecoin',
  'DOGE': 'dogecoin',
};

export async function fetchCryptoPrice(symbol: string): Promise<number | null> {
  if (!canMakeRequest('proxy')) {
    await waitForRateLimit('proxy');
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/price-proxy?type=crypto&symbols=${symbol}`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.[symbol]) {
          const usdPrice = result.data[symbol];
          const usdTryRate = await fetchUSDTRYRate();
          return usdPrice * usdTryRate;
        }
      }
    }
  } catch (error) {
    console.warn(`Proxy failed for ${symbol}, trying CoinGecko...`);
  }

  return await fetchCryptoFromCoinGecko(symbol);
}

export async function fetchCryptoFromCoinGecko(symbol: string): Promise<number | null> {
  // Use Binance instead of CoinGecko for better reliability
  try {
    if (!canMakeRequest('binance')) {
      await waitForRateLimit('binance');
    }

    const binanceSymbol = CRYPTO_SYMBOLS[symbol];
    if (!binanceSymbol) return null;

    const response = await fetch(`${BINANCE_API}?symbol=${binanceSymbol}`);
    if (!response.ok) throw new Error('Binance API failed');

    const data = await response.json();
    const priceUSD = parseFloat(data.price);

    // Convert to TRY
    const usdTryRate = await fetchUSDTRYRate();
    const priceTRY = priceUSD * usdTryRate;

    console.log(`💰 ${symbol}: $${priceUSD} → ${priceTRY.toFixed(2)} ₺`);
    return priceTRY;
  } catch (error) {
    console.error(`Error fetching from Binance for ${symbol}:`, error);
    return null;
  }
}

export async function fetchUSDTRYRate(): Promise<number> {
  if (!canMakeRequest('proxy')) {
    await waitForRateLimit('proxy');
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/price-proxy?type=usd`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.rate) {
          return result.data.rate;
        }
      }
    }
  } catch (error) {
    console.warn('Proxy failed for USD/TRY, trying alternative...');
  }

  return await fetchUSDTRYFromAlternative();
}

export async function fetchUSDTRYFromAlternative(): Promise<number> {
  if (!canMakeRequest('exchangerate')) {
    await waitForRateLimit('exchangerate');
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error('Alternative API failed');

    const data = await response.json();
    return data.rates?.TRY || 42.0;
  } catch (error) {
    console.error('All USD/TRY APIs failed, using fallback:', error);
    return 42.0;
  }
}

export async function fetchEURTRYRate(): Promise<number> {
  if (!canMakeRequest('proxy')) {
    await waitForRateLimit('proxy');
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/price-proxy?type=eur`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.rate) {
          return result.data.rate;
        }
      }
    }
  } catch (error) {
    console.warn('Proxy failed for EUR/TRY, trying alternative...');
  }

  // Fallback: Calculate from USD/TRY and EUR/USD
  try {
    if (!canMakeRequest('exchangerate')) {
      await waitForRateLimit('exchangerate');
    }
    const response = await fetch('https://open.er-api.com/v6/latest/EUR');
    if (response.ok) {
      const data = await response.json();
      return data.rates?.TRY || 48.8;
    }
  } catch (error) {
    console.warn('Alternative EUR/TRY failed, using static fallback');
  }

  return 48.8;
}

export async function fetchGoldPrice(): Promise<number> {
  if (!canMakeRequest('proxy')) {
    await waitForRateLimit('proxy');
  }

  console.log('🔍 Fetching gold price...');

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/price-proxy?type=gold`,
        {
          cache: 'no-cache',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('📦 Proxy response:', result);
        if (result.success && result.data?.pricePerGramTRY) {
          const tryPrice = result.data.pricePerGramTRY;
          console.log(`🥇 Gold from proxy: ${tryPrice.toFixed(2)} ₺/gram`);
          return tryPrice;
        } else if (result.success && result.data?.pricePerOz) {
          const goldPricePerOunce = result.data.pricePerOz;
          const gramPerOunce = 31.1035;
          const usdTryRate = await fetchUSDTRYRate();
          const pricePerGram = goldPricePerOunce / gramPerOunce;
          const tryPrice = pricePerGram * usdTryRate;
          console.log(`🥇 Gold Calculation:
  - Price per oz: $${goldPricePerOunce}
  - Price per gram: $${pricePerGram.toFixed(2)}
  - USD/TRY rate: ${usdTryRate}
  - Final TL price: ${tryPrice.toFixed(2)} ₺/gram`);
          return tryPrice;
        }
      }
    }
  } catch (error) {
    console.warn('❌ Proxy failed for gold, trying alternative...', error);
  }

  return await fetchGoldFromAlternative();
}

export async function fetchGoldFromAlternative(): Promise<number> {
  console.log('🔄 Trying alternative gold API...');
  try {
    const response = await fetch('https://api.metals.live/v1/spot/gold', {
      cache: 'no-cache'
    });

    if (!response.ok) throw new Error('Metals.live API failed');

    const data = await response.json();
    console.log('📦 Metals.live response:', data);
    const goldPricePerOunce = data[0]?.price || data.price || 2650;
    const gramPerOunce = 31.1035;
    const usdTryRate = await fetchUSDTRYRate();
    const pricePerGram = goldPricePerOunce / gramPerOunce;
    const tryPrice = pricePerGram * usdTryRate;

    console.log(`🥇 Gold (alternative):
  - Price per oz: $${goldPricePerOunce}
  - Price per gram: $${pricePerGram.toFixed(2)}
  - USD/TRY rate: ${usdTryRate}
  - Final TL price: ${tryPrice.toFixed(2)} ₺/gram`);

    return tryPrice;
  } catch (altError) {
    console.warn('❌ All gold APIs failed, using fallback...');
    const usdTryRate = await fetchUSDTRYRate();
    const fallbackOzPrice = 2650;
    const fallbackGramPrice = fallbackOzPrice / 31.1035;
    const fallbackPrice = fallbackGramPrice * usdTryRate;
    console.log(`🥇 Gold (fallback):
  - Fallback oz price: $${fallbackOzPrice}
  - Fallback gram price: $${fallbackGramPrice.toFixed(2)}
  - USD/TRY rate: ${usdTryRate}
  - Final TL price: ${fallbackPrice.toFixed(2)} ₺/gram`);
    return fallbackPrice;
  }
}

const EURONEXT_STOCKS: { [key: string]: string } = {
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

export async function fetchEuropeanStockPrice(symbol: string): Promise<number | null> {
  try {
    if (!EURONEXT_STOCKS[symbol]) return null;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/price-proxy?type=european&symbols=${symbol}`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.price) {
          const priceEUR = result.data.price;
          const eurTryRate = await fetchEURTRYRate();
          const priceTRY = priceEUR * eurTryRate;
          console.log(`${symbol}: €${priceEUR.toFixed(2)} -> ${priceTRY.toFixed(2)} ₺`);
          return priceTRY;
        }
      }
    }
  } catch (error) {
    console.warn(`Proxy failed for ${symbol}, trying Finnhub...`);
  }

  return await fetchFromFinnhub(symbol, EURONEXT_STOCKS[symbol]);
}

export async function fetchFromFinnhub(symbol: string, tickerSymbol: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${tickerSymbol}&token=demo`,
      { cache: 'no-cache' }
    );

    if (!response.ok) throw new Error('Finnhub API failed');

    const data = await response.json();
    const priceEUR = data.c;

    if (!priceEUR || priceEUR === 0) return null;

    const eurTryRate = await fetchEURTRYRate();
    const priceTRY = priceEUR * eurTryRate;

    console.log(`${symbol} (Finnhub): €${priceEUR.toFixed(2)} -> ${priceTRY.toFixed(2)} ₺`);
    return priceTRY;
  } catch (error) {
    console.error(`Finnhub failed for ${symbol}:`, error);
    return null;
  }
}

export async function fetchBISTPrice(symbol: string): Promise<number | null> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/bist-live-prices?symbols=${symbol}`,
        {
          cache: 'no-cache',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data[symbol]) {
          const price = data.data[symbol].price;
          console.log(`${symbol} (Edge Function): ${price} ₺`);
          return price;
        }
      }
    }
  } catch (error) {
    console.warn(`Edge Function failed for ${symbol}, trying direct fetch...`);
  }

  return await fetchBISTFromYahoo(symbol);
}

export async function fetchBISTFromYahoo(symbol: string): Promise<number | null> {
  try {
    const yahooSymbol = `${symbol}.IS`;
    const response = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`,
      {
        cache: 'no-cache',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.warn(`Yahoo Finance failed for ${symbol}, trying alternative...`);
      return await fetchBISTFromAlternative(symbol);
    }

    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice || meta?.previousClose;

    if (price && price > 0) {
      console.log(`${symbol} (Yahoo): ${price} ₺`);
      return parseFloat(price);
    }

    return await fetchBISTFromAlternative(symbol);
  } catch (error) {
    console.warn(`Yahoo error for ${symbol}:`, error);
    return await fetchBISTFromAlternative(symbol);
  }
}

export async function fetchBISTFromAlternative(symbol: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}.IS&fields=regularMarketPrice`,
      {
        cache: 'no-cache',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Origin': 'https://finance.yahoo.com',
          'Referer': 'https://finance.yahoo.com/',
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      const quote = data?.quoteResponse?.result?.[0];
      if (quote?.regularMarketPrice) {
        const price = parseFloat(quote.regularMarketPrice);
        console.log(`${symbol} (Yahoo v7 Alt): ${price} ₺`);
        return price;
      }
    }
  } catch (error) {
    console.warn(`Yahoo v7 alternative failed for ${symbol}`);
  }

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}.IS?modules=price`,
      {
        cache: 'no-cache',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          'Accept': 'application/json',
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      const price = data?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;
      if (price) {
        console.log(`${symbol} (Yahoo QuoteSummary Alt): ${price} ₺`);
        return parseFloat(price);
      }
    }
  } catch (error) {
    console.warn(`Yahoo QuoteSummary alternative failed for ${symbol}`);
  }

  try {
    const response = await fetch(
      `https://api.collectapi.com/economy/hisseSenedi?code=${symbol}`,
      {
        cache: 'no-cache',
        headers: {
          'authorization': 'apikey demo',
          'content-type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.result && data.result.price) {
        const price = parseFloat(data.result.price);
        console.log(`${symbol} (CollectAPI): ${price} ₺`);
        return price;
      }
    }
  } catch (error) {
    console.warn(`CollectAPI failed for ${symbol}`);
  }

  console.log(`${symbol}: All APIs failed, will use fallback`);
  return null;
}


const FALLBACK_PRICES: PriceData = {
  'AKSEN': 51.20,
  'ALTIN': 5837,
  'GOLD': 5837,
  'ASELS': 215.40,
  'BIMAS': 565.00,
  'BTC': 4479604.569,
  'CCOLA': 55.30,
  'ASML': 3500,
  'LVMH': 3800,
  'SAP': 9800,
  'TTE': 3200,
  'OR': 2400,
  'SAN': 2100,
  'AIR': 7500,
  'SU': 1800,
  'NOKIA': 180,
  'BMW': 4200,
  'SIEMENS': 8900,
  'ADYEN': 6200,
  'PROSUS': 1650,
  'EKGYO': 20.15,
  'ENKAI': 78.20,
  'EREGL': 28.50,
  'ETH': 157118.928,
  'EURO': 48.8,
  'GARAN': 152.30,
  'HALKB': 58.40,
  'ISCTR': 28.75,
  'KCHOL': 156.80,
  'KOZAL': 45.60,
  'PGSUS': 312.50,
  'PETKM': 165.70,
  'GPA': 19.4199,
  'IPV': 64.9325,
  'LINK': 710.568,
  'SAHOL': 82.10,
  'SISE': 36.20,
  'SOL': 7481.814,
  'TCELL': 102.30,
  'THYAO': 305.50,
  'TOASO': 275.80,
  'TUPRS': 195.40,
  'VAKBN': 42.50,
  'YKBNK': 38.90,
  'US900123CJ75': 42496,
  'USD': 41.96,
  'XRP': 97.8449,
};

const priceCache: { [key: string]: { price: number; timestamp: number; source: string } } = {};
const CACHE_DURATION = 800;

let connectionStatus: ConnectionStatus = 'disconnected';
const statusListeners: ((status: ConnectionStatus) => void)[] = [];

export function subscribeToConnectionStatus(callback: (status: ConnectionStatus) => void) {
  statusListeners.push(callback);
  callback(connectionStatus);
  return () => {
    const index = statusListeners.indexOf(callback);
    if (index > -1) statusListeners.splice(index, 1);
  };
}

function updateConnectionStatus(status: ConnectionStatus) {
  connectionStatus = status;
  statusListeners.forEach(listener => listener(status));
}

let binanceWS: WebSocket | null = null;
const wsSubscriptions = new Set<string>();
const priceUpdateListeners: ((update: PriceUpdate) => void)[] = [];

export function subscribeToPriceUpdates(callback: (update: PriceUpdate) => void) {
  priceUpdateListeners.push(callback);
  return () => {
    const index = priceUpdateListeners.indexOf(callback);
    if (index > -1) priceUpdateListeners.splice(index, 1);
  };
}

function notifyPriceUpdate(update: PriceUpdate) {
  priceUpdateListeners.forEach(listener => listener(update));
}

export function initializeWebSocketConnection(symbols: string[]) {
  if (binanceWS && binanceWS.readyState === WebSocket.OPEN) {
    return;
  }

  const cryptoSymbols = symbols
    .filter(s => CRYPTO_SYMBOLS[s])
    .map(s => CRYPTO_SYMBOLS[s].toLowerCase());

  if (cryptoSymbols.length === 0) return;

  updateConnectionStatus('connecting');

  const streams = cryptoSymbols.map(s => `${s}@ticker`).join('/');
  const wsUrl = `${BINANCE_WS}/${streams}`;

  binanceWS = new WebSocket(wsUrl);

  binanceWS.onopen = () => {
    console.log('✅ WebSocket connected to Binance');
    updateConnectionStatus('connected');
    cryptoSymbols.forEach(s => wsSubscriptions.add(s));
  };

  binanceWS.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.e === '24hrTicker') {
        const symbol = Object.keys(CRYPTO_SYMBOLS).find(
          key => CRYPTO_SYMBOLS[key].toLowerCase() === data.s.toLowerCase()
        );

        if (symbol) {
          const usdPrice = parseFloat(data.c);
          const usdTryRate = await fetchUSDTRYRate();
          const tryPrice = usdPrice * usdTryRate;

          priceCache[symbol] = {
            price: tryPrice,
            timestamp: Date.now(),
            source: 'websocket',
          };

          notifyPriceUpdate({
            symbol,
            price: tryPrice,
            timestamp: Date.now(),
            source: 'Binance WebSocket',
          });
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  };

  binanceWS.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateConnectionStatus('error');
  };

  binanceWS.onclose = () => {
    console.log('❌ WebSocket disconnected');
    updateConnectionStatus('disconnected');
    wsSubscriptions.clear();

    setTimeout(() => {
      if (binanceWS?.readyState === WebSocket.CLOSED) {
        console.log('🔄 Attempting to reconnect...');
        initializeWebSocketConnection(symbols);
      }
    }, 5000);
  };
}

export function closeWebSocketConnection() {
  if (binanceWS) {
    binanceWS.close();
    binanceWS = null;
    wsSubscriptions.clear();
    updateConnectionStatus('disconnected');
  }
}

export async function fetchRealTimePrice(symbol: string, assetType: AssetType): Promise<number> {
  const now = Date.now();
  const cached = priceCache[symbol];

  // Smart cache duration based on asset type and volatility
  let cacheDuration = CACHE_DURATION;

  if (assetType === 'stock') {
    cacheDuration = 30000; // 30 seconds for stocks
  } else if (assetType === 'crypto') {
    cacheDuration = 15000; // 15 seconds for crypto (more volatile)
  } else if (assetType === 'commodity') {
    cacheDuration = 60000; // 1 minute for commodities
  } else if (assetType === 'currency') {
    cacheDuration = 300000; // 5 minutes for forex (less volatile)
  } else {
    cacheDuration = 60000; // 1 minute for others
  }

  // Check memory cache first
  if (cached && now - cached.timestamp < cacheDuration) {
    return cached.price;
  }

  // Check persistent cache (localStorage) if memory cache expired
  const persistentPrice = getCachedPrice(symbol, cacheDuration);
  if (persistentPrice !== null) {
    priceCache[symbol] = { price: persistentPrice, timestamp: now, source: 'persistent' };
    return persistentPrice;
  }

  let price: number | null = null;

  try {
    switch (assetType) {
      case 'crypto':
        price = await fetchCryptoPrice(symbol);
        break;

      case 'currency':
        if (symbol === 'USD') {
          price = await fetchUSDTRYRate();
        } else if (symbol === 'EURO') {
          price = await fetchEURTRYRate();
        }
        break;

      case 'commodity':
        if (symbol === 'ALTIN' || symbol === 'GOLD') {
          price = await fetchGoldPrice();
        }
        break;

      case 'stock':
        price = await fetchEuropeanStockPrice(symbol);
        if (!price) {
          price = await fetchBISTPrice(symbol);
        }
        break;

      case 'fund':
      case 'eurobond':
        break;
    }
  } catch (error) {
  }

  const finalPrice = price || FALLBACK_PRICES[symbol] || 100;
  const source = price ? 'api' : 'fallback';

  priceCache[symbol] = {
    price: finalPrice,
    timestamp: now,
    source,
  };

  // Save to persistent cache if from API
  if (price) {
    setCachedPrice(symbol, finalPrice);
  }

  if (source === 'fallback') {
    console.log(`${symbol}: Using fallback price ${finalPrice} ₺`);
  }

  notifyPriceUpdate({
    symbol,
    price: finalPrice,
    timestamp: now,
    source: source === 'api' ? 'REST API' : 'Fallback',
  });

  return finalPrice;
}

export async function fetchMultiplePrices(symbols: { symbol: string; assetType: AssetType }[]): Promise<PriceData> {
  const prices: PriceData = {};

  const bistStocks = symbols.filter(s => s.assetType === 'stock' && !EURONEXT_STOCKS[s.symbol]);
  const otherAssets = symbols.filter(s => s.assetType !== 'stock' || EURONEXT_STOCKS[s.symbol]);

  if (bistStocks.length > 0) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const symbolList = bistStocks.map(s => s.symbol).join(',');
        const response = await fetch(
          `${supabaseUrl}/functions/v1/price-proxy?type=bist&symbols=${symbolList}`,
          {
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
            }
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            Object.entries(result.data).forEach(([symbol, priceData]: [string, any]) => {
              const price = priceData.price;
              prices[symbol] = price;

              priceCache[symbol] = {
                price,
                timestamp: Date.now(),
                source: 'api',
              };

              notifyPriceUpdate({
                symbol,
                price,
                timestamp: Date.now(),
                source: 'Price Proxy',
              });

              console.log(`${symbol}: ${price} ₺ (Proxy)`);
            });
          }
        }
      }
    } catch (error) {
      console.warn('Bulk BIST fetch failed, falling back to individual requests');
    }

    const missingSymbols = bistStocks.filter(s => !prices[s.symbol]);
    if (missingSymbols.length > 0) {
      await Promise.all(
        missingSymbols.map(async ({ symbol, assetType }) => {
          prices[symbol] = await fetchRealTimePrice(symbol, assetType);
        })
      );
    }
  }

  await Promise.all(
    otherAssets.map(async ({ symbol, assetType }) => {
      prices[symbol] = await fetchRealTimePrice(symbol, assetType);
    })
  );

  return prices;
}

export function formatCurrency(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCurrencyUSD(valueTRY: number, usdRate: number, decimals: number = 2): string {
  const valueUSD = valueTRY / usdRate;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(valueUSD);
}

export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

let cachedUSDRate: { rate: number; timestamp: number } | null = null;
const USD_RATE_CACHE_DURATION = 5 * 60 * 1000;

export async function getCachedUSDRate(): Promise<number> {
  if (cachedUSDRate && Date.now() - cachedUSDRate.timestamp < USD_RATE_CACHE_DURATION) {
    return cachedUSDRate.rate;
  }

  const rate = await fetchUSDTRYRate();
  cachedUSDRate = { rate, timestamp: Date.now() };
  return rate;
}
