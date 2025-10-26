export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

let connectionStatus: ConnectionStatus = 'disconnected';
const statusCallbacks: Array<(status: ConnectionStatus) => void> = [];
const priceCallbacks: Array<(update: PriceUpdate) => void> = [];

export async function fetchMultiplePrices(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  for (const symbol of symbols) {
    prices[symbol] = Math.random() * 1000 + 100;
  }

  return prices;
}

export function formatCurrency(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function initializeWebSocketConnection() {
  connectionStatus = 'connected';
  statusCallbacks.forEach(cb => cb('connected'));
}

export function closeWebSocketConnection() {
  connectionStatus = 'disconnected';
  statusCallbacks.forEach(cb => cb('disconnected'));
}

export function subscribeToConnectionStatus(callback: (status: ConnectionStatus) => void) {
  statusCallbacks.push(callback);
  return () => {
    const index = statusCallbacks.indexOf(callback);
    if (index > -1) statusCallbacks.splice(index, 1);
  };
}

export function subscribeToPriceUpdates(callback: (update: PriceUpdate) => void) {
  priceCallbacks.push(callback);
  return () => {
    const index = priceCallbacks.indexOf(callback);
    if (index > -1) priceCallbacks.splice(index, 1);
  };
}
