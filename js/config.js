const CONFIG = {
  // 'mock' = sample data from data/flights.json (offline demo)
  // 'live' = real data via your Cloudflare Worker proxy (set LIVE_URL below)
  DATA_SOURCE: 'mock',

  MOCK_URL: './data/flights.json',

  // Paste your deployed Cloudflare Worker URL here, e.g.
  //   https://qatar-departures-proxy.your-name.workers.dev
  // then change DATA_SOURCE above to 'live'.
  LIVE_URL: '',

  CACHE_TTL_MS: 5 * 60 * 1000,
  REFRESH_DEBOUNCE_MS: 300,
  SEARCH_DEBOUNCE_MS: 150,
  APP_NAME: 'Qatar Departures',
  APP_SUBTITLE: 'Live flight information from Qatar airports',
};
