import { AssetType } from '../lib/supabase';

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
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

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
  const binanceSymbol = CRYPTO_SYMBOLS[symbol];
  if (!binanceSymbol) return null;

  try {
    const response = await fetch(`${BINANCE_API}?symbol=${binanceSymbol}`);
    if (!response.ok) throw new Error('Binance API failed');

    const data = await response.json();
    const usdPrice = parseFloat(data.price);
    const usdTryRate = await fetchUSDTRYRate();
    return usdPrice * usdTryRate;
  } catch (error) {
    console.warn(`Binance failed for ${symbol}, trying CoinGecko...`);
    return await fetchCryptoFromCoinGecko(symbol);
  }
}

export async function fetchCryptoFromCoinGecko(symbol: string): Promise<number | null> {
  try {
    const coinId = COINGECKO_IDS[symbol];
    if (!coinId) return null;

    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=try`
    );

    if (!response.ok) throw new Error('CoinGecko API failed');

    const data = await response.json();
    return data[coinId]?.try || null;
  } catch (error) {
    console.error(`Error fetching from CoinGecko for ${symbol}:`, error);
    return null;
  }
}

export async function fetchUSDTRYRate(): Promise<number> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!response.ok) throw new Error('ExchangeRate-API failed');

    const data = await response.json();
    return data.rates.TRY || 41.96;
  } catch (error) {
    console.warn('ExchangeRate-API failed, trying alternative...');
    return await fetchUSDTRYFromAlternative();
  }
}

export async function fetchUSDTRYFromAlternative(): Promise<number> {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error('Alternative API failed');

    const data = await response.json();
    return data.rates?.TRY || 41.96;
  } catch (error) {
    console.error('All USD/TRY APIs failed:', error);
    return 41.96;
  }
}

export async function fetchEURTRYRate(): Promise<number> {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    if (!response.ok) throw new Error('ExchangeRate-API failed');

    const data = await response.json();
    return data.rates.TRY || 48.8;
  } catch (error) {
    console.warn('EUR/TRY primary API failed, trying alternative...');
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/EUR');
      if (!response.ok) throw new Error('Alternative API failed');

      const data = await response.json();
      return data.rates?.TRY || 48.8;
    } catch (altError) {
      console.error('All EUR/TRY APIs failed:', altError);
      return 48.8;
    }
  }
}

export async function fetchGoldPrice(): Promise<number> {
  try {
    const response = await fetch('https://api.metals.live/v1/spot/gold', {
      cache: 'no-cache'
    });

    if (!response.ok) throw new Error('Metals.live API failed');

    const data = await response.json();
    console.log('Gold API Response:', data);

    const goldPricePerOunce = data[0]?.price || data.price || 2650;
    const gramPerOunce = 31.1035;
    const usdTryRate = await fetchUSDTRYRate();

    const tryPrice = (goldPricePerOunce / gramPerOunce) * usdTryRate;
    console.log(`Gold: $${goldPricePerOunce}/oz -> ${tryPrice.toFixed(2)} ₺/gram`);

    return tryPrice;
  } catch (error) {
    console.warn('Metals.live failed, trying alternative sources...');
    return await fetchGoldFromAlternative();
  }
}

export async function fetchGoldFromAlternative(): Promise<number> {
  try {
    const response = await fetch('https://data-asg.goldprice.org/dbXRates/USD', {
      cache: 'no-cache'
    });

    if (!response.ok) throw new Error('GoldPrice.org API failed');

    const data = await response.json();
    const goldPricePerOunce = data.items?.[0]?.xauPrice || 2650;
    const gramPerOunce = 31.1035;
    const usdTryRate = await fetchUSDTRYRate();

    const tryPrice = (goldPricePerOunce / gramPerOunce) * usdTryRate;
    console.log(`Gold (alt): $${goldPricePerOunce}/oz -> ${tryPrice.toFixed(2)} ₺/gram`);

    return tryPrice;
  } catch (altError) {
    console.warn('Alternative gold API failed, trying CoinGecko...');
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=try',
        { cache: 'no-cache' }
      );

      if (!response.ok) throw new Error('CoinGecko gold failed');

      const data = await response.json();
      const goldPriceTRY = data['tether-gold']?.try || 5837;

      console.log(`Gold (CoinGecko): ${goldPriceTRY.toFixed(2)} ₺/gram`);
      return goldPriceTRY;
    } catch (cgError) {
      console.error('All gold price APIs failed:', cgError);
      return 5837;
    }
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
    const stockSymbol = EURONEXT_STOCKS[symbol];
    if (!stockSymbol) return null;

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${stockSymbol}`,
      {
        cache: 'no-cache',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      }
    );

    if (!response.ok) {
      console.warn(`Yahoo Finance failed for ${symbol}, using Finnhub...`);
      return await fetchFromFinnhub(symbol, stockSymbol);
    }

    const data = await response.json();
    const priceEUR = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (!priceEUR) {
      return await fetchFromFinnhub(symbol, stockSymbol);
    }

    const eurTryRate = await fetchEURTRYRate();
    const priceTRY = priceEUR * eurTryRate;

    console.log(`${symbol}: €${priceEUR.toFixed(2)} -> ${priceTRY.toFixed(2)} ₺`);
    return priceTRY;
  } catch (error) {
    console.warn(`European stock price fetch failed for ${symbol}:`, error);
    return await fetchFromFinnhub(symbol, EURONEXT_STOCKS[symbol]);
  }
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
    const response = await fetch(
      `https://api.scraperapi.com?api_key=demo&url=https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/default.aspx?hisse=${symbol}`,
      { cache: 'no-cache' }
    );

    if (response.ok) {
      const html = await response.text();
      const priceMatch = html.match(/Son Fiyat[^0-9]*([0-9.,]+)/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(',', '.'));
        console.log(`${symbol} (İş Yatırım): ${price} ₺`);
        return price;
      }
    }
  } catch (error) {
    console.warn(`İş Yatırım scraping failed for ${symbol}`);
  }

  try {
    const response = await fetch(
      `https://api.twelvedata.com/price?symbol=${symbol}.IS&apikey=demo`,
      { cache: 'no-cache' }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.price) {
        const price = parseFloat(data.price);
        console.log(`${symbol} (TwelveData): ${price} ₺`);
        return price;
      }
    }
  } catch (error) {
    console.warn(`TwelveData failed for ${symbol}`);
  }

  return await fetchBISTFromYahoo(symbol);
}

export async function fetchBISTFromYahoo(symbol: string): Promise<number | null> {
  try {
    const yahooSymbol = `${symbol}.IS`;
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
      {
        cache: 'no-cache',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      }
    );

    if (!response.ok) throw new Error('Yahoo Finance BIST failed');

    const data = await response.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (price) {
      console.log(`${symbol} (Yahoo): ${price} ₺`);
      return parseFloat(price);
    }

    return null;
  } catch (error) {
    console.error(`Yahoo Finance BIST failed for ${symbol}:`, error);
    return null;
  }
}


const FALLBACK_PRICES: PriceData = {
  'AKSEN': 48.14,
  'ALTIN': 5837,
  'ASELS': 207.6,
  'BIMAS': 538,
  'BTC': 4479604.569,
  'CCOLA': 51.45,
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
  'EKGYO': 19.34,
  'ENKAI': 74.6,
  'EREGL': 26.84,
  'ETH': 157118.928,
  'EURO': 48.8,
  'GPA': 19.4199,
  'IPV': 64.9325,
  'LINK': 710.568,
  'SAHOL': 77.45,
  'SISE': 34.1,
  'SOL': 7481.814,
  'TCELL': 97.6,
  'THYAO': 288,
  'TOASO': 260.5,
  'TUPRS': 181.7,
  'US900123CJ75': 42496,
  'USD': 41.96,
  'XRP': 97.8449,
};

const priceCache: { [key: string]: { price: number; timestamp: number; source: string } } = {};
const CACHE_DURATION = 30000;

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

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.price;
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
        if (symbol === 'ALTIN') {
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
    console.error(`Error fetching price for ${symbol}:`, error);
  }

  const finalPrice = price || FALLBACK_PRICES[symbol] || 100;
  const source = price ? 'api' : 'fallback';

  priceCache[symbol] = {
    price: finalPrice,
    timestamp: now,
    source,
  };

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

  await Promise.all(
    symbols.map(async ({ symbol, assetType }) => {
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
