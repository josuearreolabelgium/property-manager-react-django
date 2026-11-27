// MSW intercepts fetch in tests so we never hit the real backend.
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { API_URL, RATES_URL } from "../api";

export const properties = [
  { id: 1, name: "Torre Andares", property_type: "office", operation: "rent", address: "Av. Patria 1891",
    city: "Guadalajara", postal_code: "45116", size_m2: 500, size_max_m2: null, monthly_rent: "85000.00",
    rent_currency: "MXN", status: "available", created_at: "" },
  { id: 2, name: "Bodega Apodaca", property_type: "industrial", operation: "rent", address: "",
    city: "Monterrey", postal_code: "", size_m2: 3000, size_max_m2: null, monthly_rent: "150000.00",
    rent_currency: "MXN", status: "leased", created_at: "" },
];

export const handlers = [
  // Fixed rates so tests never call the real exchange-rate service
  http.get(RATES_URL.split("?")[0], () =>
    HttpResponse.json({ amount: 1, base: "MXN", date: "", rates: { EUR: 0.05, USD: 0.06 } }),
  ),
  http.get(`${API_URL}cities/`, () =>
    HttpResponse.json([...new Set(properties.map((p) => p.city))].sort()),
  ),
  http.get(API_URL, () =>
    HttpResponse.json({ count: properties.length, next: null, previous: null, results: properties }),
  ),
];

export const server = setupServer(...handlers);
