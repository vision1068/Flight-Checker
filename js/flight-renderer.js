const FlightRenderer = (() => {
  const STATUS_CONFIG = {
    SCHEDULED:  { label: 'Scheduled',  cls: 'status-scheduled' },
    BOARDING:   { label: 'Boarding',   cls: 'status-boarding' },
    DEPARTED:   { label: 'Departed',   cls: 'status-departed' },
    IN_FLIGHT:  { label: 'In Flight',  cls: 'status-inflight' },
    LANDED:     { label: 'Landed',     cls: 'status-landed' },
    CANCELLED:  { label: 'Cancelled',  cls: 'status-cancelled' },
    DIVERTED:   { label: 'Diverted',   cls: 'status-diverted' },
    DELAYED:    { label: 'Delayed',    cls: 'status-delayed' },
  };

  function _formatTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return '--:--'; }
  }

  function _formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return ''; }
  }

  function _escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _badge(status) {
    const cfg = STATUS_CONFIG[status] || { label: status, cls: 'status-scheduled' };
    return `<span class="badge ${_escape(cfg.cls)}" aria-label="Status: ${_escape(cfg.label)}">${_escape(cfg.label)}</span>`;
  }

  function _row(f) {
    return `<tr>
      <td class="col-time">
        <span class="time-hhmm">${_escape(_formatTime(f.scheduled_departure))}</span>
        <span class="time-date">${_escape(_formatDate(f.scheduled_departure))}</span>
      </td>
      <td class="col-flight"><span class="flight-num">${_escape(f.flight_number)}</span></td>
      <td class="col-airline">${_escape(f.airline_name)}</td>
      <td class="col-origin">${_escape(f.origin_airport || 'DOH')}</td>
      <td class="col-dest">
        <span class="dest-city">${_escape(f.destination_city)}</span>
        <span class="dest-country">${_escape(f.destination_country)}</span>
      </td>
      <td class="col-gate">${_escape(f.terminal || '—')} / ${_escape(f.gate || '—')}</td>
      <td class="col-status">${_badge(f.status)}</td>
    </tr>`;
  }

  function _card(f) {
    return `<div class="flight-card" role="row">
      <div class="card-header">
        <span class="flight-num">${_escape(f.flight_number)}</span>
        ${_badge(f.status)}
      </div>
      <div class="card-airline">${_escape(f.airline_name)}</div>
      <div class="card-route">
        <span class="card-origin">${_escape(f.origin_airport || 'DOH')}</span>
        <span class="card-arrow" aria-hidden="true">→</span>
        <span class="card-dest">${_escape(f.destination_city)}, ${_escape(f.destination_country)}</span>
      </div>
      <div class="card-footer">
        <span class="card-time">🕐 ${_escape(_formatTime(f.scheduled_departure))} · ${_escape(_formatDate(f.scheduled_departure))}</span>
        <span class="card-gate">Gate ${_escape(f.gate || '—')} · T${_escape(f.terminal || '—')}</span>
      </div>
    </div>`;
  }

  function renderTable(flights, container) {
    if (!flights.length) return;
    container.innerHTML = `
      <table role="grid" aria-label="Flight departures">
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Flight</th>
            <th scope="col">Airline</th>
            <th scope="col">From</th>
            <th scope="col">Destination</th>
            <th scope="col">Terminal / Gate</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>${flights.map(_row).join('')}</tbody>
      </table>`;
  }

  function renderCards(flights, container) {
    container.innerHTML = flights.map(_card).join('');
  }

  function renderEmpty(container, query) {
    container.innerHTML = `
      <div class="state-empty" role="alert">
        <div class="state-icon" aria-hidden="true">✈️</div>
        <p>No flights match <strong>${_escape(query)}</strong></p>
        <p class="state-hint">Try searching by airline, city, country, or flight number.</p>
      </div>`;
  }

  function renderError(container, message) {
    container.innerHTML = `
      <div class="state-error" role="alert">
        <div class="state-icon" aria-hidden="true">⚠️</div>
        <p class="state-title">Unable to load flights</p>
        <p class="state-hint">${_escape(message)}</p>
        <button class="btn-retry" onclick="App.refresh()">Try again</button>
      </div>`;
  }

  return { renderTable, renderCards, renderEmpty, renderError };
})();
