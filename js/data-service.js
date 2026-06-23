const DataService = (() => {
  let _cache = null;
  let _cacheTime = 0;
  let _cacheKey = '';

  function _validate(data) {
    if (!Array.isArray(data)) throw new Error('SCHEMA_INVALID');
    return data.filter(f =>
      f.flight_number && f.airline_name && f.destination_city &&
      f.destination_country && f.scheduled_departure && f.status
    );
  }

  function _buildUrl(dateStr) {
    if (CONFIG.DATA_SOURCE === 'live') {
      const base = CONFIG.LIVE_URL;
      const sep = base.includes('?') ? '&' : '?';
      return dateStr ? `${base}${sep}date=${encodeURIComponent(dateStr)}` : base;
    }
    return CONFIG.MOCK_URL;
  }

  async function getFlights(forceRefresh = false, dateStr = '') {
    const now = Date.now();
    const key = `${CONFIG.DATA_SOURCE}:${dateStr}`;
    if (!forceRefresh && _cache && _cacheKey === key &&
        (now - _cacheTime) < CONFIG.CACHE_TTL_MS) {
      return _cache;
    }
    const url = _buildUrl(dateStr);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('NETWORK_ERROR');
      const json = await res.json();
      _cache = _validate(json);
      _cacheTime = Date.now();
      _cacheKey = key;
      return _cache;
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') throw new Error('TIMEOUT');
      if (e.message === 'SCHEMA_INVALID') throw e;
      throw new Error('NETWORK_ERROR');
    }
  }

  function refresh(dateStr = '') {
    return getFlights(true, dateStr);
  }

  function isLive() {
    return CONFIG.DATA_SOURCE === 'live';
  }

  return { getFlights, refresh, isLive };
})();
