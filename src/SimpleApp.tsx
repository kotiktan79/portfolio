import { BinanceSettings } from './components/BinanceSettings';

export default function SimpleApp() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Binance Global Entegrasyonu
        </h1>
        <BinanceSettings />
      </div>
    </div>
  );
}
