# Connecting Real Flight Data (AviationStack + Cloudflare Worker)

The app ships with **mock sample data** by default. Follow these steps to
switch it to **real, live DOH departure data**.

> You must do the signup/key steps yourself — they require accounts and a
> secret API key, which should never be shared or committed to the repo.

---

## Step 1 — Get a free AviationStack API key

1. Go to <https://aviationstack.com/product> and create a free account.
2. After signing up, copy your **API Access Key** from the dashboard.
3. Free tier = ~100–500 requests/month, real-time data delayed ~30–60s.

⚠️ The free tier is **HTTP-only** and the key would be exposed if called
directly from the browser. That's why we put a Cloudflare Worker in front.

---

## Step 2 — Deploy the Cloudflare Worker (free)

1. Create a free account at <https://dash.cloudflare.com>.
2. Install Node.js if you don't have it, then in a terminal:

   ```bash
   cd worker
   npx wrangler login          # opens browser to authorize
   npx wrangler deploy         # deploys flight-proxy.js
   ```

3. Set your AviationStack key as a **secret** (kept server-side):

   ```bash
   npx wrangler secret put AVIATIONSTACK_KEY
   # paste your key when prompted
   ```

4. Wrangler prints your Worker URL, e.g.:

   ```
   https://qatar-departures-proxy.your-name.workers.dev
   ```

   Copy it.

---

## Step 3 — Point the app at the Worker

Edit [`js/config.js`](js/config.js):

```js
DATA_SOURCE: 'live',                                              // was 'mock'
LIVE_URL: 'https://qatar-departures-proxy.your-name.workers.dev', // your URL
```

Commit and push — GitHub Pages redeploys automatically:

```bash
git add js/config.js
git commit -m "Switch to live flight data"
git push
```

---

## How it works

```
Browser (HTTPS, GitHub Pages)
   │  GET /?date=YYYY-MM-DD
   ▼
Cloudflare Worker  ── holds API key, adds HTTPS, caches 5 min, fixes CORS
   │  GET api.aviationstack.com/v1/flightsfuture?iataCode=DOH&type=departure
   ▼
AviationStack  ── real flight data
```

- **Today's date** → real-time departures board (`/flights?dep_iata=DOH`)
- **Future date** → scheduled timetable (`/flightsfuture`)
- The Worker transforms AviationStack's format into the app's schema and
  maps destination IATA codes to city/country names.

---

## Testing the Worker directly

```bash
curl "https://qatar-departures-proxy.your-name.workers.dev/?date=2026-06-24"
```

You should get a JSON array of flights. If you see
`{"error":"AVIATIONSTACK_KEY secret not set"}`, redo Step 2.4.

---

## Reverting to mock data

Set `DATA_SOURCE: 'mock'` in [`js/config.js`](js/config.js) and push.
