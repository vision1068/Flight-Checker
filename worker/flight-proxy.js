/**
 * Cloudflare Worker — AviationStack proxy for Qatar Departures
 * ------------------------------------------------------------------
 * Why this exists:
 *   - Keeps the AviationStack API key SECRET (server-side, never in the browser)
 *   - Upgrades the call to HTTPS (AviationStack free tier is HTTP-only)
 *   - Adds CORS headers so the GitHub Pages site can call it
 *   - Caches responses so you don't burn the free monthly request quota
 *   - Transforms AviationStack's format into the exact schema the app expects
 *
 * Setup: set the secret with
 *   npx wrangler secret put AVIATIONSTACK_KEY
 * (or add it in the Cloudflare dashboard → Worker → Settings → Variables)
 *
 * The frontend calls:  https://<your-worker>.workers.dev/?date=YYYY-MM-DD
 */

const ORIGIN_IATA = 'DOH';          // Doha Hamad International — departures board
const CACHE_TTL_SECONDS = 300;      // 5 min — protects the free quota

// IATA → { city, country } reference lookup for display.
// AviationStack's schedule endpoint returns only the destination IATA code,
// so we map common codes to readable city/country names. Unknown codes fall
// back to showing the raw IATA code (the TO filter still works on the code).
const AIRPORTS = {
  LHR: { city: 'London', country: 'United Kingdom' },
  JFK: { city: 'New York', country: 'United States' },
  CDG: { city: 'Paris', country: 'France' },
  DXB: { city: 'Dubai', country: 'United Arab Emirates' },
  AUH: { city: 'Abu Dhabi', country: 'United Arab Emirates' },
  SIN: { city: 'Singapore', country: 'Singapore' },
  SYD: { city: 'Sydney', country: 'Australia' },
  NRT: { city: 'Tokyo', country: 'Japan' },
  HND: { city: 'Tokyo', country: 'Japan' },
  FRA: { city: 'Frankfurt', country: 'Germany' },
  MUC: { city: 'Munich', country: 'Germany' },
  KUL: { city: 'Kuala Lumpur', country: 'Malaysia' },
  BOM: { city: 'Mumbai', country: 'India' },
  DEL: { city: 'Delhi', country: 'India' },
  HYD: { city: 'Hyderabad', country: 'India' },
  BLR: { city: 'Bengaluru', country: 'India' },
  MAA: { city: 'Chennai', country: 'India' },
  COK: { city: 'Kochi', country: 'India' },
  CCJ: { city: 'Kozhikode', country: 'India' },
  TRV: { city: 'Thiruvananthapuram', country: 'India' },
  KHI: { city: 'Karachi', country: 'Pakistan' },
  ISB: { city: 'Islamabad', country: 'Pakistan' },
  LHE: { city: 'Lahore', country: 'Pakistan' },
  PEW: { city: 'Peshawar', country: 'Pakistan' },
  MUX: { city: 'Multan', country: 'Pakistan' },
  SKT: { city: 'Sialkot', country: 'Pakistan' },
  CMB: { city: 'Colombo', country: 'Sri Lanka' },
  DAC: { city: 'Dhaka', country: 'Bangladesh' },
  KTM: { city: 'Kathmandu', country: 'Nepal' },
  BKK: { city: 'Bangkok', country: 'Thailand' },
  MNL: { city: 'Manila', country: 'Philippines' },
  CGK: { city: 'Jakarta', country: 'Indonesia' },
  HKG: { city: 'Hong Kong', country: 'Hong Kong' },
  PVG: { city: 'Shanghai', country: 'China' },
  PEK: { city: 'Beijing', country: 'China' },
  CAN: { city: 'Guangzhou', country: 'China' },
  IST: { city: 'Istanbul', country: 'Turkey' },
  ESB: { city: 'Ankara', country: 'Turkey' },
  CAI: { city: 'Cairo', country: 'Egypt' },
  RUH: { city: 'Riyadh', country: 'Saudi Arabia' },
  JED: { city: 'Jeddah', country: 'Saudi Arabia' },
  DMM: { city: 'Dammam', country: 'Saudi Arabia' },
  MED: { city: 'Medina', country: 'Saudi Arabia' },
  BAH: { city: 'Manama', country: 'Bahrain' },
  KWI: { city: 'Kuwait City', country: 'Kuwait' },
  MCT: { city: 'Muscat', country: 'Oman' },
  BGW: { city: 'Baghdad', country: 'Iraq' },
  BSR: { city: 'Basra', country: 'Iraq' },
  EBL: { city: 'Erbil', country: 'Iraq' },
  NJF: { city: 'Najaf', country: 'Iraq' },
  AMM: { city: 'Amman', country: 'Jordan' },
  BEY: { city: 'Beirut', country: 'Lebanon' },
  NBO: { city: 'Nairobi', country: 'Kenya' },
  LOS: { city: 'Lagos', country: 'Nigeria' },
  ADD: { city: 'Addis Ababa', country: 'Ethiopia' },
  JNB: { city: 'Johannesburg', country: 'South Africa' },
  CPT: { city: 'Cape Town', country: 'South Africa' },
  BCN: { city: 'Barcelona', country: 'Spain' },
  MAD: { city: 'Madrid', country: 'Spain' },
  AMS: { city: 'Amsterdam', country: 'Netherlands' },
  MXP: { city: 'Milan', country: 'Italy' },
  FCO: { city: 'Rome', country: 'Italy' },
  ATH: { city: 'Athens', country: 'Greece' },
  VIE: { city: 'Vienna', country: 'Austria' },
  ZRH: { city: 'Zurich', country: 'Switzerland' },
  GVA: { city: 'Geneva', country: 'Switzerland' },
  BRU: { city: 'Brussels', country: 'Belgium' },
  CPH: { city: 'Copenhagen', country: 'Denmark' },
  OSL: { city: 'Oslo', country: 'Norway' },
  ARN: { city: 'Stockholm', country: 'Sweden' },
  DUB: { city: 'Dublin', country: 'Ireland' },
  MAN: { city: 'Manchester', country: 'United Kingdom' },
  YYZ: { city: 'Toronto', country: 'Canada' },
  IAD: { city: 'Washington', country: 'United States' },
  ORD: { city: 'Chicago', country: 'United States' },
  LAX: { city: 'Los Angeles', country: 'United States' },
  BOS: { city: 'Boston', country: 'United States' },
  IAH: { city: 'Houston', country: 'United States' },
  GRU: { city: 'Sao Paulo', country: 'Brazil' },
  PER: { city: 'Perth', country: 'Australia' },
  MEL: { city: 'Melbourne', country: 'Australia' },
  AKL: { city: 'Auckland', country: 'New Zealand' },
};

// AviationStack flight_status → app status enum
const STATUS_MAP = {
  scheduled: 'SCHEDULED',
  active:    'IN_FLIGHT',
  landed:    'LANDED',
  cancelled: 'CANCELLED',
  incident:  'DIVERTED',
  diverted:  'DIVERTED',
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

function lookup(iata) {
  const code = (iata || '').toUpperCase();
  const a = AIRPORTS[code];
  return {
    destination_iata: code,
    destination_city: a ? a.city : code,
    destination_country: a ? a.country : '',
  };
}

/** Map an AviationStack /flightsfuture item to the app schema. */
function mapFutureItem(item, dateStr) {
  const dep = item.departure || {};
  const arr = item.arrival || {};
  const airline = item.airline || {};
  const flight = item.flight || {};
  const aircraft = item.aircraft || {};
  const place = lookup(arr.iataCode);
  const hhmm = (dep.scheduledTime || '00:00').padStart(5, '0');

  return {
    flight_number: (flight.iataNumber || flight.number || '').toUpperCase(),
    airline_name: titleCase(airline.name || ''),
    airline_iata: (airline.iataCode || '').toUpperCase(),
    origin_airport: ORIGIN_IATA,
    origin_city: 'Doha',
    destination_city: place.destination_city,
    destination_country: place.destination_country,
    destination_iata: place.destination_iata,
    scheduled_departure: `${dateStr}T${hhmm}:00`,
    status: 'SCHEDULED',
    terminal: dep.terminal || '—',
    gate: dep.gate || '—',
    aircraft_type: aircraft.modelText || '',
    is_codeshare: false,
  };
}

/** Map an AviationStack /flights (real-time) item to the app schema. */
function mapRealtimeItem(item) {
  const dep = item.departure || {};
  const arr = item.arrival || {};
  const airline = item.airline || {};
  const flight = item.flight || {};
  const place = lookup(arr.iata);

  return {
    flight_number: (flight.iata || flight.number || '').toUpperCase(),
    airline_name: airline.name || '',
    airline_iata: (airline.iata || '').toUpperCase(),
    origin_airport: ORIGIN_IATA,
    origin_city: 'Doha',
    destination_city: arr.airport || place.destination_city,
    destination_country: place.destination_country,
    destination_iata: place.destination_iata,
    scheduled_departure: dep.scheduled || `${item.flight_date}T00:00:00`,
    status: STATUS_MAP[item.flight_status] || 'SCHEDULED',
    terminal: dep.terminal || '—',
    gate: dep.gate || '—',
    aircraft_type: (item.aircraft && item.aircraft.iata) || '',
    is_codeshare: !!(flight.codeshared),
  };
}

function titleCase(s) {
  return String(s).replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1));
}

function todayUTC() {
  return new Date().toISOString().split('T')[0];
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const key = env.AVIATIONSTACK_KEY;
    if (!key) {
      return new Response(
        JSON.stringify({ error: 'AVIATIONSTACK_KEY secret not set on the Worker' }),
        { status: 500, headers: corsHeaders() }
      );
    }

    const url = new URL(request.url);
    const date = url.searchParams.get('date') || todayUTC();
    const isToday = date === todayUTC();

    // Edge-cache by date so repeat loads don't spend quota
    const cache = caches.default;
    const cacheKey = new Request(`https://cache/flights?date=${date}`, request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    // Today → real-time board; future date → scheduled timetable
    const api = isToday
      ? `http://api.aviationstack.com/v1/flights?access_key=${key}&dep_iata=${ORIGIN_IATA}&limit=100`
      : `http://api.aviationstack.com/v1/flightsfuture?access_key=${key}&iataCode=${ORIGIN_IATA}&type=departure&date=${date}`;

    let upstream;
    try {
      upstream = await fetch(api);
    } catch {
      return new Response(JSON.stringify({ error: 'upstream fetch failed' }),
        { status: 502, headers: corsHeaders() });
    }

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: `upstream ${upstream.status}` }),
        { status: 502, headers: corsHeaders() });
    }

    const payload = await upstream.json();
    if (payload.error) {
      return new Response(JSON.stringify({ error: payload.error }),
        { status: 502, headers: corsHeaders() });
    }

    const rows = Array.isArray(payload.data) ? payload.data : [];
    const flights = isToday
      ? rows.map(mapRealtimeItem).filter(f => f.flight_number && f.destination_iata)
      : rows.map(r => mapFutureItem(r, date)).filter(f => f.flight_number && f.destination_iata);

    const response = new Response(JSON.stringify(flights), {
      headers: { ...corsHeaders(), 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  },
};
