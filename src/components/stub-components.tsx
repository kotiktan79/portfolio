import React from 'react';
import { Holding } from '../lib/supabase';

export function RebalanceModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Portföy Dengeleme</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Bu özellik yakında eklenecek</p>
        <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Kapat</button>
      </div>
    </div>
  );
}

export function TransactionHistory() {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">İşlem Geçmişi</h3><p className="text-gray-500 dark:text-gray-400 mt-2">Henüz işlem yok</p></div>;
}

export function AchievementBadges() {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">Başarılar</h3><p className="text-gray-500 dark:text-gray-400 mt-2">Başarılar kilitli</p></div>;
}

export function PriceAlertModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Fiyat Alarmı</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Fiyat alarmı özelliği yakında</p>
        <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Kapat</button>
      </div>
    </div>
  );
}

export function RiskMetrics({ holdings }: { holdings: Holding[] }) {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">Risk Metrikleri</h3><p className="text-gray-500 dark:text-gray-400 mt-2">Varlık sayısı: {holdings.length}</p></div>;
}

export function ScenarioAnalysis() {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">Senaryo Analizi</h3></div>;
}

export function ProfitSummary() {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">Kar Özeti</h3></div>;
}

export function WithdrawalCalculator() {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">Çekim Hesaplayıcı</h3></div>;
}

export function ExportImportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">İçe/Dışa Aktar</h2>
        <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Kapat</button>
      </div>
    </div>
  );
}

export function HoldingsFilter({ searchQuery, setSearchQuery, selectedAssetType, setSelectedAssetType, sortBy, setSortBy, sortOrder, setSortOrder }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
      <input
        type="text"
        placeholder="Ara..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
      />
    </div>
  );
}

export function TradingSignals() {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">Alım-Satım Sinyalleri</h3></div>;
}

export function AdvancedChart() {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">Gelişmiş Grafik</h3></div>;
}

export function BackupRestore({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Yedekleme & Geri Yükleme</h2>
        <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Kapat</button>
      </div>
    </div>
  );
}

export function AIPortfolioSuggestions() {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">AI Önerileri</h3></div>;
}

export function MultiBenchmark() {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">Benchmark Karşılaştırma</h3></div>;
}

export function AdvancedAnalytics() {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">Gelişmiş Analizler</h3></div>;
}

export function CashDashboard() {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">Nakit Yönetimi</h3></div>;
}

export function Security2FA({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">2FA Güvenlik</h2>
        <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Kapat</button>
      </div>
    </div>
  );
}

export function LanguageSwitcher() {
  return <div className="text-sm text-gray-600 dark:text-gray-400">TR</div>;
}

export function AutoRebalanceSettings({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Otomatik Dengeleme</h2>
        <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Kapat</button>
      </div>
    </div>
  );
}

export function PerformanceDashboard() {
  return <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h3 className="text-lg font-semibold dark:text-white">Performans Göstergeleri</h3></div>;
}

export function AssetAllocationPage({ holdings, onBack }: { holdings: Holding[]; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <button onClick={onBack} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg">← Geri</button>
      <h1 className="text-2xl font-bold dark:text-white mb-4">Varlık Dağılımı</h1>
      <div className="grid gap-4">
        {holdings.map(h => <div key={h.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg"><span className="dark:text-white">{h.symbol}</span></div>)}
      </div>
    </div>
  );
}
