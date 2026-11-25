import { useEffect, useState } from "react";

import { PropertyForm } from "./components/PropertyForm";
import { PropertyTable } from "./components/PropertyTable";
import { useCities, useProperties } from "./hooks";

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
  const { data, isLoading, isError, error, isFetching } = useProperties(city, page);
  const { data: cities } = useCities();

  // Apply the theme to <html data-theme="..."> (index.css reads it) and remember it
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <main>
      <div className="header">
        <h1>Property Manager</h1>
        <button type="button" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
      <PropertyForm />

      <div className="toolbar">
        <select value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }}>
          <option value="">All cities</option>
          {cities?.map((c) => <option key={c}>{c}</option>)}
        </select>
        {isFetching && <span>Updating...</span>}
      </div>

      {isLoading && <p>Loading...</p>}
      {isError && <p className="error">Could not load properties: {error.message}</p>}
      {data && data.results.length === 0 && <p>No properties found.</p>}
      {data && data.results.length > 0 && (
        <>
          <PropertyTable data={data.results} />
          <div className="toolbar">
            <button disabled={!data.previous} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span>Page {page} · {data.count} total</span>
            <button disabled={!data.next} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </>
      )}
    </main>
  );
}
