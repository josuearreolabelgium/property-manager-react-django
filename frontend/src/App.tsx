import { useEffect, useState, type ChangeEvent } from "react";

import { ApiError, OPERATION_LABELS, TYPE_LABELS, type Currency } from "./api";
import { CityMapModal } from "./components/CityMap";
import { Modal } from "./components/Modal";
import { PropertyCard } from "./components/PropertyCard";
import { PropertyForm } from "./components/PropertyForm";
import { PropertyTable } from "./components/PropertyTable";
import { mapQuery, mapUrl } from "./format";
import { useCities, useProperties, useRates } from "./hooks";

type Theme = "light" | "dark";
type View = "cards" | "table";

// Sort options; the value is sent to the API as ?ordering=
const SORTS = [
  { value: "-created_at", label: "Newest first" },
  { value: "created_at", label: "Oldest first" },
  { value: "-size_m2", label: "Size: largest first" },
  { value: "size_m2", label: "Size: smallest first" },
  { value: "name", label: "Name: A to Z" },
];

// Saved choice first, otherwise follow the operating system setting
function initialTheme(): Theme {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [view, setView] = useState<View>("cards");
  // Filters sent to the API
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [operation, setOperation] = useState("");
  const [ordering, setOrdering] = useState(SORTS[0].value);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(""); // what is typed in the box
  const [search, setSearch] = useState("");           // what is sent to the API
  const [currency, setCurrency] = useState<Currency>("MXN");
  // "New property" pop-up, map pop-up (table view) and the listing shown on the side map (cards view)
  const [adding, setAdding] = useState(false);
  const [mapCity, setMapCity] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading, isError, error, isFetching } =
    useProperties({ city, page, search, propertyType, operation, ordering });
  const { data: cities } = useCities();
  const { data: rates, isError: ratesError } = useRates();

  // The page no longer exists (e.g. the only property on the last page was deleted, so the API
  // answers 404): go back one page instead of showing an error. Updating state during render
  // like this is React's recommended way to adjust state from data; it re-renders before painting.
  const pageGone = isError && page > 1 && error instanceof ApiError && error.status === 404;
  if (pageGone) setPage(page - 1);

  // The side map shows the chosen listing, or the first one on the page
  const selected = data?.results.find((p) => p.id === selectedId) ?? data?.results[0];

  // Every filter change starts again from page 1
  function changeFilter(setter: (value: string) => void) {
    return (e: ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

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
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">PM</span>
            <span className="brand-name">Property Manager</span>
          </div>
          <div className="topbar-actions">
            <button type="button" className="theme-toggle"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
              <span aria-hidden="true">{theme === "dark" ? "☀️ " : "🌙 "}</span>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button type="button" className="primary" onClick={() => setAdding(true)}>+ New property</button>
          </div>
        </div>
      </header>

      {/* Search and filters */}
      <section className="searchbar">
        <div className="container">
          <h1>Commercial properties</h1>
          <div className="filters">
            <input type="search" className="search" placeholder="Search by name, address, city or postal code"
              aria-label="Search properties" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            <select aria-label="Filter by operation" value={operation} onChange={changeFilter(setOperation)}>
              <option value="">Rent or sale</option>
              {Object.entries(OPERATION_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
            <select aria-label="Filter by type" value={propertyType} onChange={changeFilter(setPropertyType)}>
              <option value="">All types</option>
              {Object.entries(TYPE_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
            <select aria-label="City" value={city} onChange={changeFilter(setCity)}>
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
      </section>

      <main className="container">
        <div className="results-head">
          <p className="results-count">
            {data && <><strong>{data.count}</strong> {data.count === 1 ? "property" : "properties"} found</>}
            {isFetching && <span className="muted"> · Updating...</span>}
            {ratesError && <span className="error"> · Exchange rates unavailable</span>}
          </p>
          <div className="results-tools">
            <label className="sort">
              <span className="muted">Sort by</span>
              <select value={ordering} onChange={changeFilter(setOrdering)}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <div className="segmented" role="group" aria-label="View">
              <button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")}>Cards</button>
              <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>Table</button>
            </div>
          </div>
        </div>

        {isLoading && <p className="muted">Loading...</p>}
        {isError && !pageGone && <p className="error">Could not load properties: {error.message}</p>}
        {data && data.results.length === 0 && (
          <p className="empty muted">{search ? `No properties match "${search}".` : "No properties found."}</p>
        )}

        {data && data.results.length > 0 && (
          <>
            {view === "cards" ? (
              <div className="results">
                <div className="listings">
                  {data.results.map((p) => (
                    <PropertyCard key={p.id} property={p} currency={currency} rates={rates}
                      selected={p.id === selected?.id} onShowOnMap={() => setSelectedId(p.id)} />
                  ))}
                </div>
                {/* Sticky map next to the list, pointed at the selected listing */}
                {selected && (
                  <aside className="map-panel">
                    <iframe title={`Map of ${selected.name}`} src={mapUrl(mapQuery(selected))} loading="lazy"
                      referrerPolicy="no-referrer" />
                  </aside>
                )}
              </div>
            ) : (
              <PropertyTable data={data.results} currency={currency} rates={rates} onShowMap={setMapCity} />
            )}

            <div className="pager">
              <button disabled={!data.previous} onClick={() => setPage((p) => p - 1)}>← Previous</button>
              <span>Page {page} · {data.count} total</span>
              <button disabled={!data.next} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          </>
        )}
      </main>

      {adding && (
        <Modal title="New property" wide onClose={() => setAdding(false)}>
          {/* After saving, close the pop-up and point the side map at the new building */}
          <PropertyForm onCreated={(p) => { setAdding(false); setSelectedId(p.id); }} />
        </Modal>
      )}
      {mapCity && <CityMapModal city={mapCity} onClose={() => setMapCity(null)} />}
    </>
  );
}
