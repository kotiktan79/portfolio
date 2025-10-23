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

export function playAlertSound(): void {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 880;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
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

  playAlertSound();
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
