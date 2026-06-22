const Filter = (() => {
  function apply(flights, query) {
    if (!query || !query.trim()) return flights;
    const q = query.trim().toLowerCase();
    return flights.filter(f =>
      f.airline_name.toLowerCase().includes(q) ||
      f.flight_number.toLowerCase().includes(q) ||
      f.destination_city.toLowerCase().includes(q) ||
      f.destination_country.toLowerCase().includes(q) ||
      (f.destination_iata && f.destination_iata.toLowerCase().includes(q)) ||
      (f.origin_airport && f.origin_airport.toLowerCase().includes(q))
    );
  }

  function sortByTime(flights) {
    return [...flights].sort((a, b) =>
      new Date(a.scheduled_departure) - new Date(b.scheduled_departure)
    );
  }

  return { apply, sortByTime };
})();
