const App = (() => {
  let _allFlights = [];
  let _searchTimer = null;
  let _refreshTimer = null;

  const $ = id => document.getElementById(id);

  function _tomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  function _rebaseToDate(flights, dateStr) {
    return flights.map(f => ({
      ...f,
      scheduled_departure: dateStr + 'T' + f.scheduled_departure.split('T')[1]
    }));
  }

  function _debounce(fn, ms) {
    return (...args) => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => fn(...args), ms);
    };
  }

  function _updateTimestamp() {
    const el = $('last-updated');
    if (el) el.textContent = 'Updated: ' + new Date().toLocaleTimeString('en-GB');
  }

  function _updateCount(shown, total) {
    const el = $('result-count');
    if (el) el.textContent = shown === total
      ? `${total} flights`
      : `Showing ${shown} of ${total} flights`;
  }

  function _isMobile() {
    return window.innerWidth < 640;
  }

  function _render(flights) {
    const query = ($('search-input') || {}).value || '';
    const container = $('flights-container');
    if (!container) return;

    if (!flights.length && query.trim()) {
      FlightRenderer.renderEmpty(container, query);
      _updateCount(0, _allFlights.length);
      return;
    }

    if (_isMobile()) {
      FlightRenderer.renderCards(flights, container);
    } else {
      FlightRenderer.renderTable(flights, container);
    }
    _updateCount(flights.length, _allFlights.length);
  }

  function _getSelectedDate() {
    return ($('date-input') || {}).value || _tomorrow();
  }

  function _getFilters() {
    return {
      query: ($('search-input') || {}).value || '',
      from:  ($('from-select') || {}).value || '',
      to:    ($('to-select') || {}).value || '',
    };
  }

  function _applyFilters(filters) {
    filters = filters || _getFilters();
    const filtered = Filter.sortByTime(Filter.apply(_allFlights, filters));
    _render(filtered);
    const clearBtn = $('clear-search');
    if (clearBtn) clearBtn.style.display = filters.query ? 'flex' : 'none';
  }

  function _populateSelects() {
    const fromSel = $('from-select');
    const toSel   = $('to-select');
    if (fromSel) {
      const origins = Filter.getOrigins(_allFlights);
      fromSel.innerHTML = '<option value="">All origins</option>' +
        origins.map(o => `<option value="${o.code}">${o.city} (${o.code})</option>`).join('');
    }
    if (toSel) {
      const dests = Filter.getDestinations(_allFlights);
      toSel.innerHTML = '<option value="">All destinations</option>' +
        dests.map(d => `<option value="${d.code}">${d.city}, ${d.country} (${d.code})</option>`).join('');
    }
  }

  async function _load(force = false) {
    const container = $('flights-container');
    const btn = $('refresh-btn');
    if (btn) { btn.setAttribute('aria-busy', 'true'); btn.disabled = true; }
    try {
      const dateStr = _getSelectedDate();
      const data = force
        ? await DataService.refresh(dateStr)
        : await DataService.getFlights(false, dateStr);
      // Mock data carries a fixed date, so rebase it to the chosen day.
      // Live data already comes back scheduled for the requested date.
      const flights = DataService.isLive() ? data : _rebaseToDate(data, dateStr);
      _allFlights = Filter.sortByTime(flights);
      _updateTimestamp();
      _populateSelects();
      _applyFilters();
    } catch (e) {
      const msg = e.message === 'TIMEOUT'
        ? 'Request timed out. Check your connection and try again.'
        : 'Could not fetch flight data. Please try again shortly.';
      if (container) FlightRenderer.renderError(container, msg);
    } finally {
      if (btn) { btn.removeAttribute('aria-busy'); btn.disabled = false; }
    }
  }

  function refresh() {
    clearTimeout(_refreshTimer);
    _refreshTimer = setTimeout(() => _load(true), CONFIG.REFRESH_DEBOUNCE_MS);
  }

  function init() {
    const dateInput = $('date-input');
    if (dateInput) {
      dateInput.value = _tomorrow();
      dateInput.addEventListener('change', () => _load());
    }
    _load();

    const searchInput = $('search-input');
    const debouncedSearch = _debounce(() => _applyFilters(), CONFIG.SEARCH_DEBOUNCE_MS);
    if (searchInput) {
      searchInput.addEventListener('input', debouncedSearch);
    }

    const clearBtn = $('clear-search');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) { searchInput.value = ''; searchInput.focus(); }
        _applyFilters();
      });
    }

    const fromSel = $('from-select');
    if (fromSel) fromSel.addEventListener('change', () => _applyFilters());

    const toSel = $('to-select');
    if (toSel) toSel.addEventListener('change', () => _applyFilters());

    const refreshBtn = $('refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', refresh);

    window.addEventListener('resize', () => _applyFilters());
  }

  return { init, refresh };
})();

document.addEventListener('DOMContentLoaded', App.init);
