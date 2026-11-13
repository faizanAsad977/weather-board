/* eslint-disable no-restricted-globals */

const CACHE_SHELL = 'weatherboard-shell-v1';
const CACHE_WEATHER = 'weatherboard-weather-v1';
const WEATHER_CACHE_URL = '/__weather_cache__';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
];

let reminderTimer = null;

function msUntilNext(hour, minute) {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function showDailyReminder() {
  const cache = await caches.open(CACHE_WEATHER);
  const cached = await cache.match(WEATHER_CACHE_URL);
  let body = 'Open WeatherBoard for your local forecast.';
  let title = 'Good morning';

  if (cached) {
    try {
      const data = await cached.json();
      const city = data.city?.label || data.city?.name || 'your city';
      const temp = data.current?.temperature;
      const unit = data.current?.unit === 'imperial' ? '°F' : '°C';
      title = `Weather for ${city}`;
      body =
        temp != null
          ? `Current temperature: ${Math.round(temp)}${unit}. Tap to open the dashboard.`
          : body;
    } catch {
      /* use defaults */
    }
  }

  await self.registration.showNotification(title, {
    body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'weatherboard-daily-reminder',
    renotify: true,
    data: { url: '/' },
  });
}

function scheduleReminder({ enabled, hour, minute }) {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }

  if (!enabled) return;

  const delay = msUntilNext(hour, minute);
  reminderTimer = setTimeout(async () => {
    await showDailyReminder();
    scheduleReminder({ enabled: true, hour, minute });
  }, delay);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_SHELL && key !== CACHE_WEATHER)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'CACHE_WEATHER' && payload) {
    event.waitUntil(
      caches.open(CACHE_WEATHER).then((cache) =>
        cache.put(
          WEATHER_CACHE_URL,
          new Response(JSON.stringify(payload), {
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );
  }

  if (type === 'SCHEDULE_REMINDER' && payload) {
    scheduleReminder(payload);
  }

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_SHELL).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_SHELL).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
