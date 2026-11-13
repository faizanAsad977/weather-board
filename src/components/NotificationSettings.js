import { useState } from 'react';

export function NotificationSettings({
  supported,
  permission,
  settings,
  onChange,
  onEnable,
}) {
  const [showWhy, setShowWhy] = useState(false);

  if (!supported) {
    return (
      <section className="panel notifications" aria-labelledby="notifications-heading">
        <h2 id="notifications-heading" className="panel__title">
          Morning reminder
        </h2>
        <p className="panel__notice">
          This browser does not support notifications. Try Chrome, Edge, or Firefox on desktop, or
          install the app to your home screen on mobile.
        </p>
      </section>
    );
  }

  const denied = permission === 'denied';

  return (
    <section className="panel notifications" aria-labelledby="notifications-heading">
      <h2 id="notifications-heading" className="panel__title">
        Morning reminder
      </h2>

      {denied ? (
        <p className="panel__notice" role="status">
          Notifications are blocked. Enable them in your browser site settings, then return here to
          pick a reminder time.
        </p>
      ) : (
        <>
          <p className="panel__hint">
            Get a daily nudge with your last viewed city’s temperature—even when WeatherBoard is
            closed (while the service worker is active).
          </p>

          <label className="field">
            <span className="field__label">Reminder time</span>
            <input
              type="time"
              className="field__input"
              value={`${String(settings.hour).padStart(2, '0')}:${String(settings.minute).padStart(2, '0')}`}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number);
                onChange({ ...settings, hour: h, minute: m });
              }}
            />
          </label>

          {!settings.enabled && !showWhy && (
            <button type="button" className="btn btn--primary" onClick={() => setShowWhy(true)}>
              Turn on morning reminder
            </button>
          )}

          {showWhy && !settings.enabled && (
            <div className="notifications__explain">
              <p>
                WeatherBoard uses browser notifications (via the service worker) to show a short
                morning summary. We only show this reminder—you won’t get ads or unrelated alerts.
              </p>
              <div className="dialog__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setShowWhy(false)}>
                  Not now
                </button>
                <button type="button" className="btn btn--primary" onClick={onEnable}>
                  Continue and allow notifications
                </button>
              </div>
            </div>
          )}

          {settings.enabled && (
            <div className="notifications__enabled">
              <p className="panel__success" role="status">
                Reminder set for {formatTime(settings.hour, settings.minute)} each day.
              </p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => onChange({ ...settings, enabled: false })}
              >
                Turn off reminder
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function formatTime(hour, minute) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
