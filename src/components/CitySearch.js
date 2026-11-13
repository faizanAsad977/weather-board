import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  getLastCitySearchNotice,
  parseCitySearchInput,
  searchCities,
} from '../services/geodb';
import { debounce } from '../utils/debounce';

const DEBOUNCE_MS = 300;

export function CitySearch({ onCitySelect, disabled }) {
  const listId = useId();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchNotice, setSearchNotice] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [listOpen, setListOpen] = useState(false);
  const skipNextSearchRef = useRef(false);
  const selectedLabelRef = useRef('');

  const runSearch = useCallback(async (value) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSearchError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setSearchError('');
    setSearchNotice('');

    try {
      const results = await searchCities(trimmed);
      setSearchNotice(getLastCitySearchNotice());
      setSuggestions(results);
      if (results.length === 0) {
        const parsed = parseCitySearchInput(trimmed);
        if (parsed.looksLikeCountryLabel) {
          setSearchError(
            `“${trimmed}” looks like a country. Type a city name (e.g. Karachi, Lahore) or wait for city suggestions to load.`,
          );
        } else {
          setSearchError(
            `No cities found for “${trimmed}”. Type a city name and pick a suggestion from the list.`,
          );
        }
      }
      if (skipNextSearchRef.current || trimmed === selectedLabelRef.current) {
        setListOpen(false);
      } else {
        setListOpen(true);
      }
    } catch (err) {
      setSuggestions([]);
      setSearchError(err.message || 'City search failed. Check your connection and API keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useRef(debounce(runSearch, DEBOUNCE_MS)).current;

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (query === selectedLabelRef.current) {
      return;
    }
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const validate = () => {
    if (!query.trim()) {
      setFieldError('Enter a city name to search.');
      return false;
    }
    if (query.trim().length < 2) {
      setFieldError('Type at least 2 characters, then choose a suggestion.');
      return false;
    }
    setFieldError('');
    return true;
  };

  const handleBlur = () => {
    validate();
    // Delay closing so mousedown on suggestion registers
    setTimeout(() => setListOpen(false), 150);
  };

  const selectCity = (city) => {
    skipNextSearchRef.current = true;
    selectedLabelRef.current = city.label;
    setSuggestions([]);
    setSearchError('');
    setSearchNotice('');
    setFieldError('');
    setListOpen(false);
    setActiveIndex(-1);
    setQuery(city.label);
    onCitySelect(city);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (suggestions.length === 1) {
      selectCity(suggestions[0]);
      return;
    }
    setFieldError('Select a city from the suggestions—don’t submit plain text.');
  };

  const onKeyDown = (e) => {
    if (!listOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectCity(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setListOpen(false);
    }
  };

  return (
    <form className="search" onSubmit={handleSubmit} noValidate>
      <label className="field" htmlFor="city-search">
        <span className="field__label">City</span>
        <p className="field__hint">Start typing—suggestions appear after you pause.</p>
        <SearchInput
          ref={inputRef}
          id="city-search"
          disabled={disabled}
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            if (next !== selectedLabelRef.current) {
              selectedLabelRef.current = '';
            }
            setQuery(next);
            setFieldError('');
            if (next.trim().length >= 2) {
              setListOpen(true);
            } else {
              setSuggestions([]);
              setListOpen(false);
            }
          }}
          onBlur={handleBlur}
          onFocus={() => suggestions.length > 0 && setListOpen(true)}
          onKeyDown={onKeyDown}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={`${listId}-errors`}
          aria-expanded={listOpen && suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          role="combobox"
          autoComplete="off"
        />
      </label>

      <SearchFeedback
        id={`${listId}-errors`}
        fieldError={fieldError}
        searchError={searchError}
        searchNotice={searchNotice}
        loading={loading}
      />

      {listOpen && suggestions.length > 0 && (
        <ul id={listId} className="search__suggestions" role="listbox">
          {suggestions.map((city, index) => (
            <li key={city.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`search__option${index === activeIndex ? ' is-active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCity(city)}
              >
                {city.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

function SearchInput(props) {
  const { ref, ...rest } = props;
  return <input ref={ref} className="field__input search__input" type="text" placeholder="e.g. London, UK" {...rest} />;
}

function SearchFeedback({ id, fieldError, searchError, searchNotice, loading }) {
  return (
    <div id={id} className="search__feedback">
      {loading && <p className="search__status" aria-live="polite">Searching cities…</p>}
      {fieldError && <p className="field-error">{fieldError}</p>}
      {!loading && searchNotice && (
        <p className="search__notice" role="status">
          {searchNotice}
        </p>
      )}
      {!loading && searchError && <p className="field-error" role="status">{searchError}</p>}
    </div>
  );
}
