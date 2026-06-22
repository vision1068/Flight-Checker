# ✈ Qatar Departures — Flight Checker

Real-time flight departure information from Qatar airports. Search by airline, destination city, or country.

Built by **HFJ-Cognitive-Lab** | Approved by **Farooq** | 102/102 QA tests passed.

## Features
- 40 flights across 15 airlines, 27 countries, 31 cities
- Live search — airline, city, country, or flight number
- All 8 flight statuses with WCAG AA colour-coded badges
- Responsive: table on desktop, cards on mobile (640px breakpoint)
- Zero frameworks · Zero CDN · 34.4 KB total payload
- CSP headers, XSS guard, request timeout handling

## Live App
👉 https://vision1068.github.io/Flight-Checker/

## Enable GitHub Pages
1. Go to **Settings → Pages**
2. Source: **GitHub Actions**
3. The workflow deploys automatically on every push to `main`

## Phase 2 — Live Data (pending approval)
To switch from mock to live AviationStack data, edit `js/config.js`:
```js
DATA_SOURCE: 'live',
LIVE_URL: 'https://your-cloudflare-worker.workers.dev/flights',
```
