interface CacheEntry {
  price: number;
  timestamp: number;
}

interface CacheData {
  [symbol: string]: CacheEntry;
}

const CACHE_KEY = 'portfolio_price_cache';
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

export function loadPriceCache(): CacheData {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};

    const data: CacheData = JSON.parse(cached);
    const now = Date.now();

    // Clean expired entries
    const cleaned: CacheData = {};
    for (const [symbol, entry] of Object.entries(data)) {
      if (now - entry.timestamp < MAX_CACHE_AGE) {
        cleaned[symbol] = entry;
      }
    }

    return cleaned;
  } catch (error) {
    console.error('Failed to load cache from localStorage:', error);
    return {};
  }
}

export function savePriceCache(cache: CacheData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save cache to localStorage:', error);
  }
}

export function getCachedPrice(symbol: string, maxAge: number): number | null {
  try {
    const cache = loadPriceCache();
    const entry = cache[symbol];

    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp < maxAge) {
      console.log(`📦 Using persistent cache for ${symbol}: ${entry.price}`);
      return entry.price;
    }

    return null;
  } catch (error) {
    return null;
  }
}

export function setCachedPrice(symbol: string, price: number): void {
  try {
    const cache = loadPriceCache();
    cache[symbol] = {
      price,
      timestamp: Date.now()
    };
    savePriceCache(cache);
  } catch (error) {
    console.error('Failed to cache price:', error);
  }
}

export function clearPriceCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('🧹 Price cache cleared');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}
