const GEO_DB_RAPID_HOST = 'wft-geo-db.p.rapidapi.com';
const GEO_DB_FREE_BASE = 'https://geodb-free-service.wirefreethought.com';

let lastSearchNotice = '';

const RAPID_INACTIVE_KEY = 'weatherboard-geodb-rapid-inactive';

export function getLastCitySearchNotice() {
  return lastSearchNotice;
}

function getRapidApiKey() {
  const raw = process.env.REACT_APP_RAPIDAPI_KEY;
  if (!raw) return '';
  const key = raw.trim();
  if (!key || key === 'your_rapidapi_key_for_geodb') return '';
  return key;
}

export function hasRapidApiKey() {
  return Boolean(getRapidApiKey());
}

export function parseCitySearchInput(input) {
  const trimmed = input.trim();
  const namePrefix = trimmed.split(',')[0].trim();
  const countryCodeMatch = trimmed.match(/,\s*([A-Za-z]{2})\s*$/);
  return {
    trimmed,
    namePrefix: namePrefix || trimmed,
    countryCodeHint: countryCodeMatch?.[1]?.toUpperCase() ?? '',
    looksLikeCountryLabel: Boolean(countryCodeMatch) && namePrefix.length >= 2,
  };
}

function mapGeoDbCity(city) {
  return {
    id: city.id,
    name: city.name,
    country: city.country || city.countryCode,
    region: city.region,
    latitude: city.latitude,
    longitude: city.longitude,
    label: [city.name, city.region, city.country || city.countryCode]
      .filter(Boolean)
      .join(', '),
  };
}

async function searchGeoDbRapid(prefix, key) {
  const params = new URLSearchParams({
    namePrefix: prefix,
    limit: '8',
    sort: '-population',
  });

  const response = await fetch(
    `https://${GEO_DB_RAPID_HOST}/v1/geo/cities?${params}`,
    {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': GEO_DB_RAPID_HOST,
      },
    },
  );

  if (response.status === 429) {
    const err = new Error(
      'City search is rate-limited. Wait a moment and try typing again.',
    );
    err.noFallback = true;
    throw err;
  }

  if (!response.ok) {
    let rapidMessage = '';
    try {
      const body = await response.json();
      rapidMessage = body?.message ?? '';
    } catch {
      /* ignore */
    }

    const err = new Error(
      response.status === 403 && rapidMessage.includes('not subscribed')
        ? 'You are not subscribed to GeoDB Cities on RapidAPI. Subscribe to the free Basic plan, then restart npm start.'
        : `GeoDB city search failed (${response.status}). ${rapidMessage || 'Check your RapidAPI key, subscription, and quota.'}`,
    );
    err.allowFallback = response.status === 403 || response.status === 401;
    throw err;
  }

  const data = await response.json();
  return (data.data ?? []).map(mapGeoDbCity);
}

async function searchGeoDbFreePlaces(namePrefix) {
  const params = new URLSearchParams({
    namePrefix,
    limit: '8',
    sort: '-population',
  });

  const response = await fetch(`${GEO_DB_FREE_BASE}/v1/geo/places?${params}`);

  if (!response.ok) {
    throw new Error(`GeoDB free search failed (${response.status}).`);
  }

  const data = await response.json();
  return (data.data ?? []).map(mapGeoDbCity);
}

async function resolveCountryCode(namePrefix, countryCodeHint) {
  if (countryCodeHint) {
    return countryCodeHint;
  }

  const params = new URLSearchParams({
    namePrefix,
    limit: '5',
  });

  const response = await fetch(`${GEO_DB_FREE_BASE}/v1/geo/countries?${params}`);
  if (!response.ok) {
    return '';
  }

  const data = await response.json();
  const matches = data.data ?? [];
  const exact = matches.find(
    (c) => c.name?.toLowerCase() === namePrefix.toLowerCase(),
  );

  return exact?.code || matches[0]?.code || '';
}

async function searchGeoDbFreeTopCitiesInCountry(countryCode) {
  const params = new URLSearchParams({
    countryIds: countryCode,
    types: 'CITY',
    limit: '8',
    sort: '-population',
  });

  const response = await fetch(`${GEO_DB_FREE_BASE}/v1/geo/places?${params}`);
  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return (data.data ?? []).map(mapGeoDbCity);
}

async function searchGeoDbFreeExpanded(namePrefix, countryCodeHint) {
  const byName = await searchGeoDbFreePlaces(namePrefix);
  if (byName.length > 0) {
    return byName;
  }

  const countryCode = await resolveCountryCode(namePrefix, countryCodeHint);
  if (!countryCode) {
    return [];
  }

  return searchGeoDbFreeTopCitiesInCountry(countryCode);
}

async function searchOpenMeteoGeocoding(namePrefix) {
  const params = new URLSearchParams({
    name: namePrefix,
    count: '8',
    language: 'en',
    format: 'json',
  });

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
  );

  if (!response.ok) {
    throw new Error(
      `City search failed (${response.status}). Check your network connection and try again.`,
    );
  }

  const data = await response.json();
  const results = data.results ?? [];

  return results.map((place) => ({
    id: place.id,
    name: place.name,
    country: place.country_code,
    region: place.admin1,
    latitude: place.latitude,
    longitude: place.longitude,
    label: [place.name, place.admin1, place.country_code].filter(Boolean).join(', '),
  }));
}

function isRapidApiMarkedInactive() {
  try {
    return sessionStorage.getItem(RAPID_INACTIVE_KEY) === '1';
  } catch {
    return false;
  }
}

function markRapidApiInactive() {
  try {
    sessionStorage.setItem(RAPID_INACTIVE_KEY, '1');
  } catch {
    /* storage blocked */
  }
}

function clearRapidApiInactive() {
  try {
    sessionStorage.removeItem(RAPID_INACTIVE_KEY);
  } catch {
    /* storage blocked */
  }
}

async function searchWithFallbacks(parsed, rapidKey) {
  lastSearchNotice = '';
  const { namePrefix, countryCodeHint } = parsed;

  const tryRapid = rapidKey && !isRapidApiMarkedInactive();

  if (tryRapid) {
    try {
      const cities = await searchGeoDbRapid(namePrefix, rapidKey);
      clearRapidApiInactive();
      return cities;
    } catch (err) {
      if (err.noFallback) {
        throw err;
      }
      if (!err.allowFallback) {
        throw err;
      }
      markRapidApiInactive();
    }
  }

  try {
    const freeResults = await searchGeoDbFreeExpanded(namePrefix, countryCodeHint);
    if (freeResults.length > 0) {
      return freeResults;
    }
  } catch {
    /* Open-Meteo last resort */
  }

  const meteoResults = await searchOpenMeteoGeocoding(namePrefix);
  if (meteoResults.length > 0) {
    lastSearchNotice =
      'Showing Open-Meteo suggestions (GeoDB RapidAPI optional for this project).';
  }
  return meteoResults;
}

export async function searchCities(input) {
  const parsed = parseCitySearchInput(input);

  if (parsed.namePrefix.length < 2) {
    return [];
  }

  const rapidKey = getRapidApiKey();

  if (rapidKey) {
    return searchWithFallbacks(parsed, rapidKey);
  }

  try {
    const freeResults = await searchGeoDbFreeExpanded(
      parsed.namePrefix,
      parsed.countryCodeHint,
    );
    if (freeResults.length > 0) {
      return freeResults;
    }
  } catch {
    /* fall through */
  }

  return searchOpenMeteoGeocoding(parsed.namePrefix);
}

export function isUsingGeoDb() {
  return hasRapidApiKey();
}
