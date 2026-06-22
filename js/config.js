const CONFIG = {
  DATA_SOURCE: 'mock',       // 'mock' | 'live'  — switch here for Phase 2
  MOCK_URL: './data/flights.json',
  LIVE_URL: '',              // Cloudflare Worker URL goes here in Phase 2
  CACHE_TTL_MS: 5 * 60 * 1000,
  REFRESH_DEBOUNCE_MS: 300,
  SEARCH_DEBOUNCE_MS: 150,
  APP_NAME: 'Qatar Departures',
  APP_SUBTITLE: 'Live flight information from Qatar airports',
};
