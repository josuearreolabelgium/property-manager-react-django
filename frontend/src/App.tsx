import { useEffect, useState } from "react";

import { PropertyForm } from "./components/PropertyForm";
import { CityMapModal } from "./components/CityMap";
import { PropertyTable } from "./components/PropertyTable";
import type { Currency } from "./api";
import { useCities, useProperties, useRates } from "./hooks";

type Theme = "light" | "dark";

// Saved choice first, otherwise follow the operating system setting
function initialTheme(): Theme {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [searchInput, setSearchInput] = useState(""); // what is typed in the box
  const [search, setSearch] = useState("");           // what is sent to the API
  const { data, isLoading, isError, error, isFetching } = useProperties(city, page, search);
  const { data: cities } = useCities();
  const [currency, setCurrency] = useState<Currency>("MXN");
  const { data: rates, isError: ratesError } = useRates();
  // Lives here, not in the table, so the map stays open even if the table re-renders or empties
  const [mapCity, setMapCity] = useState<string | null>(null);

  // Apply the theme to <html data-theme="..."> (index.css reads it) and remember it
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Wait until typing pauses for 300 ms before searching, so we don't send a request per keystroke.
  // Only go back to page 1 when the search term really changed (not for extra spaces or on first load).
  useEffect(() => {
    const id = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== search) {
        setSearch(next);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput, search]);

  return (
    <main>
      <header className="header">
        <div>
          <h1>Property Manager</h1>
          <p className="subtitle">Track your commercial properties, rents and availability.</p>
        </div>
        <button type="button" className="theme-toggle" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
          <span aria-hidden="true">{theme === "dark" ? "☀️ " : "🌙 "}</span>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </header>

      <section className="card">
        <h2>Add a property</h2>
        <PropertyForm />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Properties{data ? <span className="muted"> · {data.count}</span> : null}</h2>
          <div className="toolbar">
            {isFetching && <span className="muted">Updating...</span>}
            {ratesError && <span className="error">Exchange rates unavailable</span>}
            <input type="search" className="search" placeholder="Search properties..." aria-label="Search properties"
              value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            <select value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }}>
              <option value="">All cities</option>
              {cities?.map((c) => <option key={c}>{c}</option>)}
            </select>
            {/* EUR and USD stay disabled until the exchange rates have loaded */}
            <select aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              <option value="MXN">MXN</option>
              <option value="EUR" disabled={!rates}>EUR</option>
              <option value="USD" disabled={!rates}>USD</option>
            </select>
          </div>
        </div>

        {isLoading && <p className="muted">Loading...</p>}
        {isError && <p className="error">Could not load properties: {error.message}</p>}
        {data && data.results.length === 0 && (
          <p className="muted">{search ? `No properties match "${search}".` : "No properties found."}</p>
        )}
        {data && data.results.length > 0 && (
          <>
            <PropertyTable data={data.results} currency={currency} rate={rates?.[currency] ?? 1}
              onShowMap={setMapCity} />
            <div className="toolbar pager">
              <button disabled={!data.previous} onClick={() => setPage((p) => p - 1)}>← Previous</button>
              <span>Page {page} · {data.count} total</span>
              <button disabled={!data.next} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          </>
        )}
      </section>

      {mapCity && <CityMapModal city={mapCity} onClose={() => setMapCity(null)} />}
    </main>
  );
}
