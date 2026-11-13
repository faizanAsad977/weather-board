import { cacheWeatherInServiceWorker } from './serviceWorkerRegistration';

const OWM_ICON_BASE = 'https://openweathermap.org/img/wn';

function wmoToOwmIcon(code) {
  if (code === 0) return '01d';
  if (code <= 3) return '02d';
  if (code <= 48) return '50d';
  if (code <= 57) return '09d';
  if (code <= 67) return '10d';
  if (code <= 77) return '13d';
  if (code <= 82) return '09d';
  if (code <= 86) return '13d';
  return '11d';
}

function normalizeOwmCurrent(data, unit) {
  return {
    source: 'openweathermap',
    cityName: data.name,
    temperature: data.main.temp,
    humidity: data.main.humidity,
    windSpeed: data.wind.speed,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    iconUrl: `${OWM_ICON_BASE}/${data.weather[0].icon}@2x.png`,
    unit,
  };
}

function normalizeOwmForecast(list, unit) {
  const byDay = new Map();
  for (const item of list) {
    const date = item.dt_txt.split(' ')[0];
    if (!byDay.has(date)) {
      byDay.set(date, {
        date,
        tempMin: item.main.temp_min,
        tempMax: item.main.temp_max,
        humidity: item.main.humidity,
        windSpeed: item.wind.speed,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        iconUrl: `${OWM_ICON_BASE}/${item.weather[0].icon}@2x.png`,
        unit,
      });
    }
  }
  return Array.from(byDay.values()).slice(0, 5);
}

function getOpenWeatherApiKey() {
  const raw = process.env.REACT_APP_OPENWEATHER_API_KEY;
  if (!raw) return '';
  const key = raw.trim();
  if (!key || key === 'your_openweathermap_key') return '';
  return key;
}

async function fetchOpenWeather(city, unit) {
  const key = getOpenWeatherApiKey();
  if (!key) {
    const err = new Error('OPENWEATHER_KEY_MISSING');
    err.code = 'OPENWEATHER_KEY_MISSING';
    throw err;
  }

  const units = unit === 'imperial' ? 'imperial' : 'metric';

  const query =
    city.latitude != null && city.longitude != null
      ? `lat=${city.latitude}&lon=${city.longitude}`
      : `q=${encodeURIComponent(city.name)}`;

  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?${query}&units=${units}&appid=${key}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?${query}&units=${units}&appid=${key}`;

  const [currentRes, forecastRes] = await Promise.all([
    fetch(currentUrl),
    fetch(forecastUrl),
  ]);

  if (currentRes.status === 429 || forecastRes.status === 429) {
    const err = new Error('RATE_LIMIT');
    err.code = 'RATE_LIMIT';
    throw err;
  }

  if (!currentRes.ok || !forecastRes.ok) {
    throw new Error(
      `OpenWeatherMap returned an error (weather ${currentRes.status}, forecast ${forecastRes.status}). Verify the city and API key.`,
    );
  }

  const currentJson = await currentRes.json();
  const forecastJson = await forecastRes.json();

  return {
    current: normalizeOwmCurrent(currentJson, unit),
    forecast: normalizeOwmForecast(forecastJson.list ?? [], unit),
    fetchedAt: Date.now(),
  };
}

async function fetchOpenMeteo(city, unit) {
  const lat = city.latitude;
  const lon = city.longitude;
  if (lat == null || lon == null) {
    throw new Error(
      'Open-Meteo needs coordinates. Pick a city from the autocomplete suggestions.',
    );
  }

  const tempUnit = unit === 'imperial' ? 'fahrenheit' : 'celsius';
  const windUnit = unit === 'imperial' ? 'mph' : 'kmh';

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('forecast_days', '5');
  url.searchParams.set('temperature_unit', tempUnit);
  url.searchParams.set('wind_speed_unit', windUnit);
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Open-Meteo failed (${response.status}). Try again or pick another city.`,
    );
  }

  const data = await response.json();
  const code = data.current?.weather_code ?? 0;
  const icon = wmoToOwmIcon(code);

  const current = {
    source: 'open-meteo',
    cityName: city.name,
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    description: `Weather code ${code}`,
    icon,
    iconUrl: `${OWM_ICON_BASE}/${icon}@2x.png`,
    unit,
  };

  const forecast = (data.daily?.time ?? []).map((date, i) => {
    const fCode = data.daily.weather_code[i];
    const fIcon = wmoToOwmIcon(fCode);
    return {
      date,
      tempMin: data.daily.temperature_2m_min[i],
      tempMax: data.daily.temperature_2m_max[i],
      humidity: null,
      windSpeed: null,
      description: `Weather code ${fCode}`,
      icon: fIcon,
      iconUrl: `${OWM_ICON_BASE}/${fIcon}@2x.png`,
      unit,
    };
  });

  return { current, forecast, fetchedAt: Date.now() };
}

export async function fetchWeatherForCity(city, unit) {
  let weather;
  let usedFallback = false;
  let missingOwmKey = false;

  try {
    weather = await fetchOpenWeather(city, unit);
  } catch (err) {
    if (
      err.code === 'RATE_LIMIT' ||
      err.message === 'RATE_LIMIT' ||
      err.code === 'OPENWEATHER_KEY_MISSING'
    ) {
      if (err.code === 'OPENWEATHER_KEY_MISSING') {
        missingOwmKey = true;
      }
      usedFallback = true;
      try {
        weather = await fetchOpenMeteo(city, unit);
      } catch (fallbackErr) {
        if (missingOwmKey) {
          const keyErr = new Error(
            'OpenWeatherMap key is not loaded and Open-Meteo fallback failed. Add REACT_APP_OPENWEATHER_API_KEY to .env.local and restart npm start.',
          );
          keyErr.code = 'OPENWEATHER_KEY_MISSING';
          throw keyErr;
        }
        throw fallbackErr;
      }
    } else {
      throw err;
    }
  }

  const payload = {
    ...weather,
    city,
    meta: {
      usedFallback,
      missingOwmKey,
    },
  };

  cacheWeatherInServiceWorker(payload);
  return payload;
}

export function formatTemp(value, unit) {
  if (value == null || Number.isNaN(value)) return '—';
  const suffix = unit === 'imperial' ? '°F' : '°C';
  return `${Math.round(value)}${suffix}`;
}

export function formatWind(value, unit) {
  if (value == null) return '—';
  const suffix = unit === 'imperial' ? 'mph' : 'm/s';
  return `${Math.round(value)} ${suffix}`;
}
