import { formatTemp, formatWind } from '../services/weather';

export function WeatherDisplay({ weather, loading, error, unit, fromCache }) {
  if (loading) {
    return (
      <section className="weather weather--loading" aria-live="polite" aria-busy="true">
        <WeatherSkeleton />
      </section>
    );
  }

  if (error && !weather) {
    return (
      <section className="weather weather--error" role="alert">
        <h2 className="weather__heading">Couldn’t load weather</h2>
        <p>{error}</p>
      </section>
    );
  }

  if (!weather) {
    return (
      <section className="weather weather--empty">
        <h2 className="weather__heading">Search for a city</h2>
        <p>Type at least two characters and pick a suggestion to see current conditions and a 5-day
          forecast.</p>
      </section>
    );
  }

  const { current, forecast, meta } = weather;

  return (
    <section className="weather" aria-labelledby="weather-heading">
      {error && (
        <p className="weather--error weather__inline-error" role="alert">
          {error}
        </p>
      )}
      {fromCache && (
        <p className="weather__cached" role="status">
          Cached forecast
          {meta?.usedFallback ? ' (via Open-Meteo fallback)' : ''}
        </p>
      )}
      {meta?.usedFallback && !fromCache && (
        <p className="weather__fallback" role="status">
          {meta?.missingOwmKey
            ? 'OpenWeatherMap key not loaded in this build — using Open-Meteo. Add the key to .env.local and restart npm start for OpenWeatherMap data.'
            : 'OpenWeatherMap was rate-limited. Showing data from Open-Meteo.'}
        </p>
      )}

      <div className="weather__current card">
        <WeatherHeader
          id="weather-heading"
          city={weather.city?.label || current.cityName}
          description={current.description}
        />
        <div className="weather__current-body">
          <img
            className="weather__icon weather__icon--animated"
            src={current.iconUrl}
            alt=""
            width={96}
            height={96}
          />
          <div>
            <p className="weather__temp">{formatTemp(current.temperature, unit)}</p>
            <ul className="weather__stats">
              <li>Humidity: {current.humidity != null ? `${current.humidity}%` : '—'}</li>
              <li>Wind: {formatWind(current.windSpeed, unit)}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="weather__forecast">
        <h3 className="weather__subheading">5-day forecast</h3>
        <div className="forecast-grid">
          {forecast.map((day) => (
            <article key={day.date} className="forecast-card card">
              <p className="forecast-card__date">{formatDay(day.date)}</p>
              <img src={day.iconUrl} alt="" width={48} height={48} className="forecast-card__icon" />
              <p className="forecast-card__temps">
                <span>{formatTemp(day.tempMax, unit)}</span>
                <span className="forecast-card__low">{formatTemp(day.tempMin, unit)}</span>
              </p>
              <p className="forecast-card__desc">{day.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatDay(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function WeatherHeader({ id, city, description }) {
  return (
    <header>
      <h2 id={id} className="weather__heading">
        {city}
      </h2>
      <p className="weather__description">{description}</p>
    </header>
  );
}

function WeatherSkeleton() {
  return (
    <>
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--card" />
      <div className="forecast-grid">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton skeleton--forecast" />
        ))}
      </div>
    </>
  );
}
