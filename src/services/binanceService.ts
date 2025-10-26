import { supabase } from '../lib/supabase';

interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

interface BinanceAccount {
  balances: BinanceBalance[];
}

export async function saveBinanceApiKeys(apiKey: string, apiSecret: string): Promise<boolean> {
  try {
    localStorage.setItem('binance_api_key', apiKey);
    localStorage.setItem('binance_api_secret', apiSecret);
    localStorage.setItem('binance_keys_saved_at', new Date().toISOString());
    return true;
  } catch (error) {
    console.error('Error saving API keys:', error);
    return false;
  }
}

export async function getBinanceApiKeys(): Promise<{ apiKey: string; apiSecret: string } | null> {
  try {
    const apiKey = localStorage.getItem('binance_api_key');
    const apiSecret = localStorage.getItem('binance_api_secret');

    if (!apiKey || !apiSecret) return null;

    return { apiKey, apiSecret };
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return null;
  }
}

async function createBinanceSignature(queryString: string, apiSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(queryString);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

export async function syncBinanceGlobalBalances(): Promise<{ success: boolean; message: string; assetsCount?: number }> {
  try {
    const keys = await getBinanceApiKeys();
    if (!keys) {
      return { success: false, message: 'Binance API anahtarları bulunamadı. Lütfen önce ekleyin.' };
    }

    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = await createBinanceSignature(queryString, keys.apiSecret);

    const response = await fetch(
      `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`,
      {
        headers: {
          'X-MBX-APIKEY': keys.apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.msg || 'Failed to fetch Binance account data');
    }

    const accountData: BinanceAccount = await response.json();

    const usdtPrice = await fetchUSDTRYRate();
    const nonZeroBalances = accountData.balances.filter(b =>
      parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
    );

    const cryptoPrices = await fetchBinancePrices(nonZeroBalances.map(b => b.asset));

    const balancesData = nonZeroBalances.map(balance => {
      const free = parseFloat(balance.free);
      const locked = parseFloat(balance.locked);
      const total = free + locked;
      const priceUSDT = cryptoPrices[balance.asset] || 0;
      const usdValue = total * priceUSDT * usdtPrice;

      return {
        id: `${balance.asset}-${Date.now()}`,
        symbol: balance.asset,
        free,
        locked,
        total,
        usd_value: usdValue,
        synced_at: new Date().toISOString(),
      };
    });

    localStorage.setItem('binance_balances', JSON.stringify(balancesData));
    localStorage.setItem('binance_last_sync', new Date().toISOString());

    return {
      success: true,
      message: `Binance Global'den ${nonZeroBalances.length} varlık başarıyla senkronize edildi`,
      assetsCount: nonZeroBalances.length
    };
  } catch (error: any) {
    console.error('Binance sync error:', error);
    return {
      success: false,
      message: error.message || 'Binance verisi senkronize edilemedi'
    };
  }
}

async function fetchBinancePrices(symbols: string[]): Promise<Record<string, number>> {
  try {
    const prices: Record<string, number> = {};

    for (const symbol of symbols) {
      if (symbol === 'USDT') {
        prices[symbol] = 1;
        continue;
      }

      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`
        );

        if (response.ok) {
          const data = await response.json();
          prices[symbol] = parseFloat(data.price);
        } else {
          prices[symbol] = 0;
        }
      } catch (err) {
        prices[symbol] = 0;
      }
    }

    return prices;
  } catch (error) {
    console.error('Error fetching Binance prices:', error);
    return {};
  }
}

async function fetchUSDTRYRate(): Promise<number> {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (response.ok) {
      const data = await response.json();
      return data.rates?.TRY || 42.0;
    }
  } catch (error) {
    console.error('Error fetching USD/TRY rate:', error);
  }
  return 42.0;
}

export async function getBinanceBalances(): Promise<any[]> {
  try {
    const balancesStr = localStorage.getItem('binance_balances');
    if (!balancesStr) return [];

    const balances = JSON.parse(balancesStr);
    return balances.sort((a: any, b: any) => b.usd_value - a.usd_value);
  } catch (error) {
    console.error('Error fetching Binance balances:', error);
    return [];
  }
}

export async function getLastSyncTime(): Promise<string | null> {
  try {
    return localStorage.getItem('binance_last_sync');
  } catch (error) {
    console.error('Error fetching last sync time:', error);
    return null;
  }
}

export async function addBinanceAssetToPortfolio(
  symbol: string,
  quantity: number,
  avgPrice: number
): Promise<boolean> {
  try {
    const assetType = 'crypto';
    const currentPrice = await fetchCurrentPrice(symbol);

    const { error } = await supabase
      .from('holdings')
      .insert({
        symbol,
        asset_type: assetType,
        quantity,
        purchase_price: avgPrice,
        current_price: currentPrice,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding asset to portfolio:', error);
    return false;
  }
}

async function fetchCurrentPrice(symbol: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`
    );

    if (response.ok) {
      const data = await response.json();
      const usdPrice = parseFloat(data.price);
      const usdtryRate = await fetchUSDTRYRate();
      return usdPrice * usdtryRate;
    }
  } catch (error) {
    console.error('Error fetching current price:', error);
  }
  return 0;
}
