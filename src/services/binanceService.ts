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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('binance_api_keys')
      .upsert({
        user_id: user.id,
        exchange: 'binance_global',
        api_key: apiKey,
        api_secret: apiSecret,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving API keys:', error);
    return false;
  }
}

export async function getBinanceApiKeys(): Promise<{ apiKey: string; apiSecret: string } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('binance_api_keys')
      .select('api_key, api_secret')
      .eq('user_id', user.id)
      .eq('exchange', 'binance_global')
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;

    return {
      apiKey: data.api_key,
      apiSecret: data.api_secret,
    };
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const keys = await getBinanceApiKeys();
    if (!keys) {
      return { success: false, message: 'Binance API keys not found. Please add them first.' };
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

    for (const balance of nonZeroBalances) {
      const free = parseFloat(balance.free);
      const locked = parseFloat(balance.locked);
      const total = free + locked;

      const priceUSDT = cryptoPrices[balance.asset] || 0;
      const usdValue = total * priceUSDT * usdtPrice;

      const { error: balanceError } = await supabase
        .from('binance_balances')
        .upsert({
          user_id: user.id,
          exchange: 'binance_global',
          symbol: balance.asset,
          free,
          locked,
          total,
          usd_value: usdValue,
          synced_at: new Date().toISOString(),
        });

      if (balanceError) {
        console.error(`Error saving balance for ${balance.asset}:`, balanceError);
      }
    }

    const { error: updateError } = await supabase
      .from('binance_api_keys')
      .update({ last_sync: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('exchange', 'binance_global');

    if (updateError) console.error('Error updating last sync:', updateError);

    await supabase.from('sync_history').insert({
      user_id: user.id,
      exchange: 'binance_global',
      sync_type: 'manual',
      status: 'success',
      assets_synced: nonZeroBalances.length,
      synced_at: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Successfully synced ${nonZeroBalances.length} assets from Binance Global`,
      assetsCount: nonZeroBalances.length
    };
  } catch (error: any) {
    console.error('Binance sync error:', error);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('sync_history').insert({
          user_id: user.id,
          exchange: 'binance_global',
          sync_type: 'manual',
          status: 'failed',
          error_message: error.message,
          synced_at: new Date().toISOString(),
        });
      }
    } catch (logError) {
      console.error('Error logging sync failure:', logError);
    }

    return {
      success: false,
      message: error.message || 'Failed to sync Binance data'
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('binance_balances')
      .select('*')
      .eq('user_id', user.id)
      .eq('exchange', 'binance_global')
      .order('usd_value', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching Binance balances:', error);
    return [];
  }
}

export async function getLastSyncTime(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('binance_api_keys')
      .select('last_sync')
      .eq('user_id', user.id)
      .eq('exchange', 'binance_global')
      .maybeSingle();

    if (error || !data) return null;
    return data.last_sync;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const assetType = 'crypto';
    const currentPrice = await fetchCurrentPrice(symbol);

    const { error } = await supabase
      .from('holdings')
      .insert({
        user_id: user.id,
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
