# WeatherBoard

Responsive, installable weather dashboard (PWA) built with Create React App. Search cities with live autocomplete, view current conditions and a 5-day forecast, save favorites, work offline with the last city, and schedule a daily morning reminder.

## Live demo

_Add your deployment URL after publishing to Vercel or Netlify._

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root and add API keys:

```env
REACT_APP_OPENWEATHER_API_KEY=your_openweathermap_key
REACT_APP_RAPIDAPI_KEY=your_rapidapi_key_for_geodb
```

| Variable | Source |
| --- | --- |
| `REACT_APP_OPENWEATHER_API_KEY` | [OpenWeatherMap](https://openweathermap.org/api) (free tier) |
| `REACT_APP_RAPIDAPI_KEY` | [GeoDB Cities on RapidAPI](https://rapidapi.com/wirefreethought/api/geodb-cities) — subscribe to the **Basic (free)** plan on the **same RapidAPI account** as your key |

3. Start the dev server:

```bash
npm start
```

4. Production build:

```bash
npm run build
```

Service worker and install prompt work best over **HTTPS** (or `localhost`). Use `npm run build` + a static server, or deploy to Vercel/Netlify.

## Architecture

- **UI:** React single-page app (`src/App.js`) with focused components under `src/components/`.
- **City search:** GeoDB via RapidAPI, debounced at 300ms (`src/services/geodb.js`).
- **Weather:** OpenWeatherMap primary; automatic Open-Meteo fallback on rate limit (`src/services/weather.js`).
- **State:** Favorites, unit, theme, reminder time, and last weather in `localStorage` with graceful degradation (`src/services/storage.js`).
- **PWA:** `public/manifest.json` + `public/sw.js` caches the app shell and the last weather payload; offline banner when `navigator.onLine` is false.
- **Notifications:** Explains value before `Notification.requestPermission()`; reminder schedule is sent to the service worker, which shows a daily local notification (see limitations).

## APIs used

- OpenWeatherMap — current weather + 5-day/3h forecast
- Open-Meteo — fallback forecast (no key)
- GeoDB Cities (RapidAPI) — autocomplete

## Known limitations

- **Push when the tab is closed:** True Web Push with a remote push server is not included (client-only scope). Reminders use the service worker’s `showNotification` on a scheduled timer, which works for installed PWAs but may be paused aggressively on some browsers/OS versions.
- **Open-Meteo fallback** requires coordinates from a GeoDB suggestion (not free-text submit).
- **OpenWeather free tier** has request limits; the UI surfaces rate-limit fallback to Open-Meteo.

## IDE

Built with **Cursor**; see `PROMPTS.md` for agent prompt history.
