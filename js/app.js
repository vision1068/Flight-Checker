const App = (() => {
  let _allFlights = [];
  let _searchTimer = null;
  let _refreshTimer = null;

  const $ = id => document.getElementById(id);

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

  function _applySearch(query) {
    const filtered = Filter.sortByTime(Filter.apply(_allFlights, query));
    _render(filtered);
    const clearBtn = $('clear-search');
    if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';
  }

  async function _load(force = false) {
    const container = $('flights-container');
    const btn = $('refresh-btn');
    if (btn) { btn.setAttribute('aria-busy', 'true'); btn.disabled = true; }
    try {
      const data = await DataService[force ? 'refresh' : 'getFlights']();
      _allFlights = Filter.sortByTime(data);
      _updateTimestamp();
      const query = ($('search-input') || {}).value || '';
      _applySearch(query);
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
    _load();

    const searchInput = $('search-input');
    const debouncedSearch = _debounce(q => _applySearch(q), CONFIG.SEARCH_DEBOUNCE_MS);
    if (searchInput) {
      searchInput.addEventListener('input', e => debouncedSearch(e.target.value));
    }

    const clearBtn = $('clear-search');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) { searchInput.value = ''; searchInput.focus(); }
        _applySearch('');
      });
    }

    const refreshBtn = $('refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', refresh);

    window.addEventListener('resize', () => {
      const query = (searchInput || {}).value || '';
      _applySearch(query);
    });
  }

  return { init, refresh };
})();

document.addEventListener('DOMContentLoaded', App.init);
