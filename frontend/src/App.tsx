import { useState } from "react";

import { PropertyForm } from "./components/PropertyForm";
import { PropertyTable } from "./components/PropertyTable";
import { useProperties } from "./hooks";

export default function App() {
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useProperties(city, page);

  return (
    <main>
      <h1>Property Manager</h1>
      <PropertyForm />

      <div className="toolbar">
        <select value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }}>
          <option value="">All cities</option>
          <option>Guadalajara</option>
          <option>CDMX</option>
          <option>Monterrey</option>
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
