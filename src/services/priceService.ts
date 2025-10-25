import { AssetType } from '../lib/supabase';

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

const priceUpdateCallbacks: Array<(update: PriceUpdate) => void> = [];
const connectionStatusCallbacks: Array<(status: ConnectionStatus) => void> = [];

export async function fetchMultiplePrices(
  symbols: Array<{ symbol: string; assetType: AssetType }>
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  for (const { symbol, assetType } of symbols) {
    try {
      if (assetType === 'crypto') {
        prices[symbol] = await fetchCryptoPrice(symbol);
      } else if (assetType === 'stock') {
        prices[symbol] = await fetchStockPrice(symbol);
      }
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
    }
  }

  return prices;
}

async function fetchCryptoPrice(symbol: string): Promise<number> {
  const response = await fetch(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`
  );
  const data = await response.json();
  return parseFloat(data.price);
}

async function fetchStockPrice(symbol: string): Promise<number> {
  return 0;
}

export function initializeWebSocketConnection(symbols: string[]): void {
  console.log('WebSocket connection initialized for:', symbols);
}

export function closeWebSocketConnection(): void {
  console.log('WebSocket connection closed');
}

export function subscribeToPriceUpdates(
  callback: (update: PriceUpdate) => void
): () => void {
  priceUpdateCallbacks.push(callback);
  return () => {
    const index = priceUpdateCallbacks.indexOf(callback);
    if (index > -1) {
      priceUpdateCallbacks.splice(index, 1);
    }
  };
}

export function subscribeToConnectionStatus(
  callback: (status: ConnectionStatus) => void
): () => void {
  connectionStatusCallbacks.push(callback);
  return () => {
    const index = connectionStatusCallbacks.indexOf(callback);
    if (index > -1) {
      connectionStatusCallbacks.splice(index, 1);
    }
  };
}

export function formatCurrency(value: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
