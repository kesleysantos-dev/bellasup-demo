import { useEffect } from 'react';

const useServiceWorkerUpdate = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.update();

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New SW is ready but waiting — it will activate on the next natural
                // app open, without forcing a reload that would disrupt the session.
                console.info('[SW] Update ready — will apply on next app launch.');
              }
            });
          });
        }
      } catch (err) {
        console.warn('SW update check failed:', err);
      }
    };

    checkForUpdates();

    const interval = setInterval(checkForUpdates, 60_000);

    const onFocus = () => checkForUpdates();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
};

export default useServiceWorkerUpdate;
