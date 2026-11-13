const FAVORITES_KEY = 'weatherboard_favorites';
const LAST_CITY_KEY = 'weatherboard_last_city';
const LAST_WEATHER_KEY = 'weatherboard_last_weather';
const UNIT_KEY = 'weatherboard_unit';
const THEME_KEY = 'weatherboard_theme';
const REMINDER_KEY = 'weatherboard_reminder';

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function isStorageAvailable() {
  try {
    const test = '__storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function read(key, fallback) {
  if (!isStorageAvailable()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw == null) return fallback;
  return safeParse(raw, fallback);
}

function write(key, value) {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getFavorites() {
  return read(FAVORITES_KEY, []);
}

export function setFavorites(favorites) {
  return write(FAVORITES_KEY, favorites);
}

export function getLastCity() {
  return read(LAST_CITY_KEY, null);
}

export function setLastCity(city) {
  return write(LAST_CITY_KEY, city);
}

export function getLastWeather() {
  return read(LAST_WEATHER_KEY, null);
}

export function setLastWeather(weather) {
  return write(LAST_WEATHER_KEY, weather);
}

export function getUnit() {
  return read(UNIT_KEY, 'metric');
}

export function setUnit(unit) {
  return write(UNIT_KEY, unit);
}

export function getTheme() {
  return read(THEME_KEY, 'system');
}

export function setTheme(theme) {
  return write(THEME_KEY, theme);
}

export function getReminderSettings() {
  return read(REMINDER_KEY, { enabled: false, hour: 8, minute: 0 });
}

export function setReminderSettings(settings) {
  return write(REMINDER_KEY, settings);
}
