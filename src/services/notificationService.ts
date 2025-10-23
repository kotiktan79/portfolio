export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function showNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });
  }
}

export function notifyPriceAlert(symbol: string, currentPrice: number, targetPrice: number, direction: 'above' | 'below'): void {
  const title = `🔔 ${symbol} Fiyat Alarmı!`;
  const body = direction === 'above'
    ? `${symbol} hedef fiyatın üzerine çıktı: ${currentPrice.toFixed(2)} ₺ (Hedef: ${targetPrice.toFixed(2)} ₺)`
    : `${symbol} hedef fiyatın altına düştü: ${currentPrice.toFixed(2)} ₺ (Hedef: ${targetPrice.toFixed(2)} ₺)`;

  showNotification(title, {
    body,
    tag: `price-alert-${symbol}`,
    requireInteraction: true,
  });
}

export function notifyAchievementUnlocked(title: string, description: string): void {
  showNotification('🏆 Yeni Başarı Kazanıldı!', {
    body: `${title}: ${description}`,
    tag: 'achievement-unlock',
  });
}

export function notifyPortfolioMilestone(message: string): void {
  showNotification('📈 Portföy Kilometre Taşı!', {
    body: message,
    tag: 'portfolio-milestone',
  });
}

export function getNotificationPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}
