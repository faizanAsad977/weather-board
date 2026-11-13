const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/),
);

export function register(config) {
  if (process.env.NODE_ENV !== 'production' && !isLocalhost) {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registerSW = () => {
    const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        if (config?.onSuccess) {
          config.onSuccess(registration);
        }
      })
      .catch((error) => {
        if (config?.onError) {
          config.onError(error);
        }
      });
  };

  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

export function getRegistration() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.ready.catch(() => null);
}

export function cacheWeatherInServiceWorker(weatherPayload) {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_WEATHER',
    payload: weatherPayload,
  });
}

export function scheduleReminderInServiceWorker(settings) {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: 'SCHEDULE_REMINDER',
    payload: settings,
  });
}
