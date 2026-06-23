const DataService = (() => {
  let _cache = null;
  let _cacheTime = 0;

  function _validate(data) {
    if (!Array.isArray(data)) throw new Error('SCHEMA_INVALID');
    return data.filter(f =>
      f.flight_number && f.airline_name && f.destination_city &&
      f.destination_country && f.scheduled_departure && f.status
    );
  }

  async function getFlights(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && _cache && (now - _cacheTime) < CONFIG.CACHE_TTL_MS) {
      return _cache;
    }
    const url = CONFIG.DATA_SOURCE === 'live' ? CONFIG.LIVE_URL : CONFIG.MOCK_URL;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('NETWORK_ERROR');
      const json = await res.json();
      _cache = _validate(json);
      _cacheTime = Date.now();
      return _cache;
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') throw new Error('TIMEOUT');
      if (e.message === 'SCHEMA_INVALID') throw e;
      throw new Error('NETWORK_ERROR');
    }
  }

  function refresh() {
    return getFlights(true);
  }

  return { getFlights, refresh };
})();
