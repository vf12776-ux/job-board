import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function PushNotifier() {
  const { user, token } = useAuth();

  useEffect(() => {
    if (!user || !token) return;

    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker зарегистрирован');

          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
            });

            await fetch(`${import.meta.env.VITE_API_URL}/api/subscribe`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                subscription,
                city: user.city || ''
              })
            });
            console.log('Подписка отправлена на сервер');
          }
        } catch (err) {
          console.error('Ошибка подписки:', err);
        }
      }
    };

    registerServiceWorker();
  }, [user, token]);

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return null;
}