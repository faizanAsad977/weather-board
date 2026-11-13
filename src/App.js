import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { CitySearch } from './components/CitySearch';
import { ConfirmDialog } from './components/ConfirmDialog';
import { FavoritesPanel } from './components/FavoritesPanel';
import { NotificationSettings } from './components/NotificationSettings';
import { OfflineBanner } from './components/OfflineBanner';
import { WeatherDisplay } from './components/WeatherDisplay';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useTheme } from './hooks/useTheme';
import {
  getFavorites,
  getLastCity,
  getLastWeather,
  getReminderSettings,
  getUnit,
  isStorageAvailable,
  setFavorites,
  setLastCity,
  setLastWeather,
  setReminderSettings,
  setUnit,
} from './services/storage';
import {
  scheduleReminderInServiceWorker,
  getRegistration,
} from './services/serviceWorkerRegistration';
import { fetchWeatherForCity } from './services/weather';

const MAX_FAVORITES = 5;

function App() {
  const online = useOnlineStatus();
  const { preference, resolved, setPreference, toggle: toggleTheme } = useTheme();
  const [unit, setUnitState] = useState(() => getUnit());
  const [favorites, setFavoritesState] = useState(() => getFavorites());
  const storageAvailable = isStorageAvailable();

  const [selectedCity, setSelectedCity] = useState(() => getLastCity());
  const [weather, setWeather] = useState(() => getLastWeather());
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [fromCache, setFromCache] = useState(false);

  const [removeTarget, setRemoveTarget] = useState(null);

  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );
  const [reminderSettings, setReminderState] = useState(() => getReminderSettings());

  const notificationsSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator;

  const weatherRequestRef = useRef(0);
  const lastFetchedKeyRef = useRef('');

  const loadWeather = useCallback(
    async (city, options = {}) => {
      if (!city) return;

      const fetchKey = `${city.id ?? city.label}:${unit}`;
      if (!options.forceNetwork && lastFetchedKeyRef.current === fetchKey) {
        return;
      }

      if (!online && !options.forceNetwork) {
        const cached = getLastWeather();
        if (cached && cached.city?.id === city.id) {
          setWeather(cached);
          setFromCache(true);
          setWeatherError('');
          return;
        }
        setWeatherError(
          'You’re offline and we don’t have a saved forecast for this city. Reconnect or open your last viewed city.',
        );
        return;
      }

      const requestId = ++weatherRequestRef.current;
      setWeatherLoading(true);
      setWeatherError('');
      setFromCache(false);

      try {
        const data = await fetchWeatherForCity(city, unit);
        if (requestId !== weatherRequestRef.current) {
          return;
        }
        lastFetchedKeyRef.current = fetchKey;
        setWeather(data);
        setLastCity(city);
        setLastWeather(data);
      } catch (err) {
        if (requestId !== weatherRequestRef.current) {
          return;
        }
        const cached = getLastWeather();
        if (cached) {
          setWeather(cached);
          setFromCache(true);
          setWeatherError(
            `${err.message} Showing the last saved forecast instead.`,
          );
        } else {
          setWeather(null);
          setWeatherError(err.message || 'Weather request failed. Try again.');
        }
      } finally {
        if (requestId === weatherRequestRef.current) {
          setWeatherLoading(false);
        }
      }
    },
    [online, unit],
  );

  useEffect(() => {
    if (selectedCity) {
      loadWeather(selectedCity);
    }
  }, [selectedCity, unit, loadWeather]);

  const handleCitySelect = (city) => {
    setSelectedCity((prev) => {
      if (prev?.id === city.id && prev?.label === city.label) {
        return prev;
      }
      lastFetchedKeyRef.current = '';
      return city;
    });
  };

  const handleUnitToggle = () => {
    const next = unit === 'metric' ? 'imperial' : 'metric';
    lastFetchedKeyRef.current = '';
    setUnitState(next);
    setUnit(next);
  };

  const handleAddFavorite = () => {
    if (!selectedCity) {
      return;
    }
    if (!storageAvailable) return;
    if (favorites.length >= MAX_FAVORITES) return;
    if (favorites.some((f) => f.id === selectedCity.id)) return;

    const next = [...favorites, selectedCity];
    setFavoritesState(next);
    setFavorites(next);
  };

  const confirmRemoveFavorite = () => {
    if (!removeTarget) return;
    const next = favorites.filter((f) => f.id !== removeTarget.id);
    setFavoritesState(next);
    setFavorites(next);
    setRemoveTarget(null);
  };

  const handleReminderChange = async (next) => {
    setReminderState(next);
    setReminderSettings(next);
    scheduleReminderInServiceWorker(next);
    const reg = await getRegistration();
    reg?.active?.postMessage({ type: 'SCHEDULE_REMINDER', payload: next });
  };

  const enableNotifications = async () => {
    if (!notificationsSupported) return;
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      if (result === 'granted') {
        const next = { ...reminderSettings, enabled: true };
        await handleReminderChange(next);
      }
    } catch {
      setNotificationPermission('denied');
    }
  };

  useEffect(() => {
    if (reminderSettings.enabled) {
      scheduleReminderInServiceWorker(reminderSettings);
      getRegistration().then((reg) => {
        reg?.active?.postMessage({
          type: 'SCHEDULE_REMINDER',
          payload: reminderSettings,
        });
      });
    }
  }, [reminderSettings]);

  return (
    <div className="app">
      <OfflineBanner visible={!online} />

      <header className="app-header">
        <div className="app-header__brand">
          <h1 className="app-header__title">WeatherBoard</h1>
          <p className="app-header__tagline">Your calm daily weather dashboard</p>
        </div>
        <div className="app-header__actions">
          <button
            type="button"
            className="btn btn--ghost toolbar-btn"
            onClick={handleUnitToggle}
            aria-label={`Switch to ${unit === 'metric' ? 'Fahrenheit' : 'Celsius'}`}
          >
            {unit === 'metric' ? '°C' : '°F'}
          </button>
          <button
            type="button"
            className="btn btn--ghost toolbar-btn"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
          >
            {resolved === 'dark' ? 'Light' : 'Dark'}
          </button>
          <select
            className="toolbar-select"
            aria-label="Theme preference"
            value={preference}
            onChange={(e) => setPreference(e.target.value)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </header>

      <main className="app-main">
        <div className="app-main__primary">
          <CitySearch onCitySelect={handleCitySelect} disabled={weatherLoading && online} />
          <WeatherDisplay
            weather={weather}
            loading={weatherLoading}
            error={weatherError}
            unit={unit}
            fromCache={fromCache}
          />
        </div>

        <aside className="app-main__sidebar">
          <FavoritesPanel
            favorites={favorites}
            storageAvailable={storageAvailable}
            activeCityId={selectedCity?.id}
            onSelect={handleCitySelect}
            onRemoveRequest={setRemoveTarget}
            onAddCurrent={handleAddFavorite}
            canAddCurrent={Boolean(selectedCity) && storageAvailable}
          />
          <NotificationSettings
            supported={notificationsSupported}
            permission={notificationPermission}
            settings={reminderSettings}
            onChange={handleReminderChange}
            onEnable={enableNotifications}
          />
        </aside>
      </main>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove favorite?"
        message={
          removeTarget
            ? `Remove ${removeTarget.label || removeTarget.name} from your favorites?`
            : ''
        }
        confirmLabel="Remove"
        onConfirm={confirmRemoveFavorite}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}

export default App;
