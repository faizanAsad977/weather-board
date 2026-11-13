export function FavoritesPanel({
  favorites,
  storageAvailable,
  activeCityId,
  onSelect,
  onRemoveRequest,
  onAddCurrent,
  canAddCurrent,
}) {
  return (
    <section className="panel favorites" aria-labelledby="favorites-heading">
      <PanelHeader id="favorites-heading" title="Favorites" count={favorites.length} max={5} />

      {!storageAvailable && (
        <p className="panel__notice" role="status">
          Favorites are unavailable because local storage is blocked in this browser. You can
          still search for cities during this session.
        </p>
      )}

      {favorites.length === 0 ? (
        <p className="panel__empty">Save up to 5 cities for quick access.</p>
      ) : (
        <ul className="favorites__list">
          {favorites.map((city) => (
            <li key={city.id ?? city.label} className="favorites__item">
              <button
                type="button"
                className={`favorites__city${activeCityId === city.id ? ' is-active' : ''}`}
                onClick={() => onSelect(city)}
              >
                <span className="favorites__name">{city.label || city.name}</span>
              </button>
              <button
                type="button"
                className="favorites__remove"
                aria-label={`Remove ${city.label || city.name} from favorites`}
                onClick={() => onRemoveRequest(city)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="btn btn--secondary favorites__add"
        disabled={!canAddCurrent || favorites.length >= 5}
        onClick={onAddCurrent}
      >
        Add current city to favorites
      </button>
      {favorites.length >= 5 && (
        <p className="field-error" role="status">
          You’ve reached the limit of 5 favorite cities. Remove one to add another.
        </p>
      )}
    </section>
  );
}

function PanelHeader({ id, title, count, max }) {
  return (
    <header className="panel__header">
      <h2 id={id} className="panel__title">
        {title}
      </h2>
      <span className="panel__meta">
        {count}/{max}
      </span>
    </header>
  );
}
