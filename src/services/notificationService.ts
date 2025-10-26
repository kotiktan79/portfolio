export async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

export function notifyAchievementUnlocked(title: string, description: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: description,
      icon: '/icon.png'
    });
  }
}

export function getNotificationPermissionStatus() {
  if ('Notification' in window) {
    return Notification.permission;
  }
  return 'denied';
}
