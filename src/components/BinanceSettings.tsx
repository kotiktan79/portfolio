import React, { useState, useEffect } from 'react';
import { Key, RefreshCw, Database, ExternalLink, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import {
  saveBinanceApiKeys,
  getBinanceApiKeys,
  syncBinanceGlobalBalances,
  getBinanceBalances,
  getLastSyncTime,
  addBinanceAssetToPortfolio
} from '../services/binanceService';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export function BinanceSettings() {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [showKeys, setShowKeys] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadConfiguration();
    loadBalances();
    loadLastSync();
  }, []);

  const loadConfiguration = async () => {
    const keys = await getBinanceApiKeys();
    if (keys) {
      setIsConfigured(true);
      setApiKey(keys.apiKey);
      setApiSecret(keys.apiSecret);
    }
  };

  const loadBalances = async () => {
    const data = await getBinanceBalances();
    setBalances(data);
  };

  const loadLastSync = async () => {
    const time = await getLastSyncTime();
    setLastSync(time);
  };

  const handleSaveKeys = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setMessage({ type: 'error', text: 'API Key ve Secret alanları boş olamaz' });
      return;
    }

    const success = await saveBinanceApiKeys(apiKey, apiSecret);
    if (success) {
      setIsConfigured(true);
      setMessage({ type: 'success', text: 'API anahtarları başarıyla kaydedildi' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: 'API anahtarları kaydedilemedi' });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setMessage({ type: 'info', text: 'Binance Global hesabınız senkronize ediliyor...' });

    const result = await syncBinanceGlobalBalances();

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      await loadBalances();
      await loadLastSync();
    } else {
      setMessage({ type: 'error', text: result.message });
    }

    setIsSyncing(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAddToPortfolio = async (balance: any) => {
    const avgPrice = balance.usd_value / balance.total;
    const success = await addBinanceAssetToPortfolio(balance.symbol, balance.total, avgPrice);

    if (success) {
      setMessage({ type: 'success', text: `${balance.symbol} portföye eklendi` });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: `${balance.symbol} portföye eklenemedi` });
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
              : message.type === 'error'
              ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
              : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
          }`}
        >
          {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {message.type === 'info' && <RefreshCw className="w-5 h-5 animate-spin" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-semibold dark:text-white">Binance Global API Ayarları</h2>
        </div>

        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
            <strong>Bilgi:</strong> Binance Global API anahtarlarınızı kullanarak hesabınızdaki kripto varlıklarını otomatik olarak senkronize edebilirsiniz.
          </p>
          <a
            href="https://www.binance.com/en/my/settings/api-management"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            API Anahtarı Oluştur <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key
            </label>
            <input
              type={showKeys ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key'inizi girin"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Secret
            </label>
            <input
              type={showKeys ? 'text' : 'password'}
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="API Secret'ınızı girin"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showKeys"
              checked={showKeys}
              onChange={(e) => setShowKeys(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="showKeys" className="text-sm text-gray-700 dark:text-gray-300">
              Anahtarları göster
            </label>
          </div>

          <button
            onClick={handleSaveKeys}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            API Anahtarlarını Kaydet
          </button>
        </div>
      </div>

      {isConfigured && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-green-500" />
              <h2 className="text-xl font-semibold dark:text-white">Senkronizasyon</h2>
            </div>
            {lastSync && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>
                  Son: {formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: tr })}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Senkronize ediliyor...' : 'Binance Global\'den Veri Çek'}
          </button>

          {balances.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">
                Binance Global Bakiyeler
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                        Varlık
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        Toplam
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        Değer (₺)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {balances.map((balance) => (
                      <tr key={balance.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm font-medium dark:text-white">
                          {balance.symbol}
                        </td>
                        <td className="px-4 py-3 text-sm text-right dark:text-gray-300">
                          {balance.total.toFixed(8)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right dark:text-gray-300">
                          {balance.usd_value.toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} ₺
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleAddToPortfolio(balance)}
                            className="text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-1 rounded transition-colors"
                          >
                            Portföye Ekle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-300">
            <p className="font-medium mb-1">Güvenlik Uyarısı</p>
            <ul className="list-disc list-inside space-y-1">
              <li>API anahtarlarınız güvenli şekilde saklanır</li>
              <li>API ayarlarınızda sadece "Bakiye Görüntüleme" iznini aktif edin</li>
              <li>Withdrawal (Para Çekme) iznini asla vermeyin</li>
              <li>IP kısıtlaması eklemeniz önerilir</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
