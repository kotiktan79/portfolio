export type Language = 'tr' | 'en';

interface Translations {
  [key: string]: {
    tr: string;
    en: string;
  };
}

export const translations: Translations = {
  'app.title': {
    tr: 'Portföy Takip',
    en: 'Portfolio Tracker',
  },
  'app.subtitle': {
    tr: 'Canlı fiyat güncellemeleri',
    en: 'Live price updates',
  },
  'holdings.add': {
    tr: 'Varlık Ekle',
    en: 'Add Asset',
  },
  'holdings.edit': {
    tr: 'Düzenle',
    en: 'Edit',
  },
  'holdings.delete': {
    tr: 'Sil',
    en: 'Delete',
  },
  'holdings.symbol': {
    tr: 'Sembol',
    en: 'Symbol',
  },
  'holdings.asset': {
    tr: 'Varlık',
    en: 'Asset',
  },
  'holdings.quantity': {
    tr: 'Miktar',
    en: 'Quantity',
  },
  'holdings.purchasePrice': {
    tr: 'Alış Fiyatı',
    en: 'Purchase Price',
  },
  'holdings.currentPrice': {
    tr: 'Güncel Fiyat',
    en: 'Current Price',
  },
  'holdings.totalValue': {
    tr: 'Toplam Değer',
    en: 'Total Value',
  },
  'holdings.profitLoss': {
    tr: 'Kar/Zarar',
    en: 'Profit/Loss',
  },
  'holdings.actions': {
    tr: 'İşlemler',
    en: 'Actions',
  },
  'portfolio.totalInvestment': {
    tr: 'Toplam Yatırım',
    en: 'Total Investment',
  },
  'portfolio.currentValue': {
    tr: 'Güncel Değer',
    en: 'Current Value',
  },
  'portfolio.performance': {
    tr: 'Portföy Performansı',
    en: 'Portfolio Performance',
  },
  'portfolio.allocation': {
    tr: 'Varlık Dağılımı',
    en: 'Asset Allocation',
  },
  'status.connected': {
    tr: 'Canlı',
    en: 'Live',
  },
  'status.connecting': {
    tr: 'Bağlanıyor...',
    en: 'Connecting...',
  },
  'status.disconnected': {
    tr: 'Bağlantı Yok',
    en: 'Disconnected',
  },
  'status.error': {
    tr: 'Hata',
    en: 'Error',
  },
  'button.refresh': {
    tr: 'Yenile',
    en: 'Refresh',
  },
  'button.rebalance': {
    tr: 'Rebalance',
    en: 'Rebalance',
  },
  'button.save': {
    tr: 'Kaydet',
    en: 'Save',
  },
  'button.cancel': {
    tr: 'İptal',
    en: 'Cancel',
  },
  'button.close': {
    tr: 'Kapat',
    en: 'Close',
  },
  'button.download': {
    tr: 'İndir',
    en: 'Download',
  },
  'pnl.daily': {
    tr: 'Günlük',
    en: 'Daily',
  },
  'pnl.weekly': {
    tr: 'Haftalık',
    en: 'Weekly',
  },
  'pnl.monthly': {
    tr: 'Aylık',
    en: 'Monthly',
  },
  'chart.rsi': {
    tr: 'RSI Göstergesi',
    en: 'RSI Indicator',
  },
  'chart.macd': {
    tr: 'MACD Göstergesi',
    en: 'MACD Indicator',
  },
  'chart.bollinger': {
    tr: 'Bollinger Bantları',
    en: 'Bollinger Bands',
  },
  'risk.stopLoss': {
    tr: 'Stop-Loss',
    en: 'Stop-Loss',
  },
  'risk.takeProfit': {
    tr: 'Take-Profit',
    en: 'Take-Profit',
  },
  'risk.management': {
    tr: 'Risk Yönetimi',
    en: 'Risk Management',
  },
  'automation.title': {
    tr: 'Otomasyon Ayarları',
    en: 'Automation Settings',
  },
  'automation.autoRebalance': {
    tr: 'Otomatik Rebalance',
    en: 'Auto Rebalance',
  },
  'automation.dca': {
    tr: 'Dollar Cost Averaging',
    en: 'Dollar Cost Averaging',
  },
  'report.portfolio': {
    tr: 'Portföy Raporu',
    en: 'Portfolio Report',
  },
  'report.tax': {
    tr: 'Vergi Raporu',
    en: 'Tax Report',
  },
  'alert.priceAlert': {
    tr: 'Fiyat Alarmı',
    en: 'Price Alert',
  },
  'alert.notifications': {
    tr: 'Bildirimler',
    en: 'Notifications',
  },
};

let currentLanguage: Language = 'tr';

export function setLanguage(lang: Language) {
  currentLanguage = lang;
  localStorage.setItem('app_language', lang);
}

export function getLanguage(): Language {
  const stored = localStorage.getItem('app_language');
  return (stored === 'en' || stored === 'tr') ? stored : 'tr';
}

export function t(key: string): string {
  const translation = translations[key];
  if (!translation) return key;
  return translation[currentLanguage] || translation.tr || key;
}

export function initLanguage() {
  currentLanguage = getLanguage();
}
