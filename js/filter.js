const Filter = (() => {
  function apply(flights, { query = '', from = '', to = '' } = {}) {
    let result = flights;

    if (from) {
      const f = from.toLowerCase();
      result = result.filter(fl =>
        (fl.origin_airport && fl.origin_airport.toLowerCase() === f) ||
        fl.origin_city.toLowerCase() === f
      );
    }

    if (to) {
      const t = to.toLowerCase();
      result = result.filter(fl =>
        (fl.destination_iata && fl.destination_iata.toLowerCase() === t) ||
        fl.destination_city.toLowerCase() === t
      );
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(fl =>
        fl.airline_name.toLowerCase().includes(q) ||
        fl.flight_number.toLowerCase().includes(q) ||
        fl.destination_city.toLowerCase().includes(q) ||
        fl.destination_country.toLowerCase().includes(q) ||
        (fl.destination_iata && fl.destination_iata.toLowerCase().includes(q)) ||
        (fl.origin_airport && fl.origin_airport.toLowerCase().includes(q))
      );
    }

    return result;
  }

  function getOrigins(flights) {
    const seen = new Set();
    const origins = [];
    for (const f of flights) {
      const key = f.origin_airport || f.origin_city;
      if (!seen.has(key)) {
        seen.add(key);
        origins.push({ code: key, city: f.origin_city });
      }
    }
    return origins.sort((a, b) => a.city.localeCompare(b.city));
  }

  function getDestinations(flights) {
    const seen = new Set();
    const dests = [];
    for (const f of flights) {
      const key = f.destination_iata || f.destination_city;
      if (!seen.has(key)) {
        seen.add(key);
        dests.push({ code: key, city: f.destination_city, country: f.destination_country });
      }
    }
    return dests.sort((a, b) => a.city.localeCompare(b.city));
  }

  function sortByTime(flights) {
    return [...flights].sort((a, b) =>
      new Date(a.scheduled_departure) - new Date(b.scheduled_departure)
    );
  }

  return { apply, getOrigins, getDestinations, sortByTime };
})();
