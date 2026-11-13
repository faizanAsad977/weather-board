export function OfflineBanner({ visible }) {
  if (!visible) return null;

  return (
    <div className="offline-banner" role="status">
      <span className="offline-banner__dot" aria-hidden="true" />
      Offline mode — showing the last saved forecast for this city.
    </div>
  );
}
