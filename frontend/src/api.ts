// All HTTP calls live here so components never call fetch directly.
export const API_URL = "http://localhost:8000/api/properties/";

export type Status = "available" | "leased";
export type PropertyType = "office" | "industrial" | "retail" | "land";
export type Operation = "rent" | "sale";

export const TYPE_LABELS: Record<PropertyType, string> = {
  office: "Office", industrial: "Industrial", retail: "Retail", land: "Land",
};
export const OPERATION_LABELS: Record<Operation, string> = { rent: "Rent", sale: "Sale" };

export interface Property {
  id: number;
  name: string;
  property_type: PropertyType;
  operation: Operation;
  address: string;
  city: string;
  postal_code: string;        // text, so leading zeros like 01020 are kept
  size_m2: number;            // minimum surface
  size_max_m2: number | null; // set only when the surface is a range
  monthly_rent: string | null; // DRF returns Decimal as string; null = price on request
  rent_currency: Currency;    // currency the rent is stored in
  status: Status;
  created_at: string;
}

// Fields sent when creating a property (the server sets id and created_at)
export type NewProperty = Omit<Property, "id" | "created_at">;
// Fields that can be changed on an existing property
export type PropertyChanges = Partial<NewProperty>;

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Error from the API that keeps the HTTP status (e.g. 404 when a page no longer exists) and the
// response body, which for a 400 lists the problems per field: { "name": ["...already exists."] }
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }

  // Field name -> first error message, for showing errors next to form inputs
  fieldErrors(): Record<string, string> {
    if (!this.body || typeof this.body !== "object") return {};
    return Object.fromEntries(Object.entries(this.body as Record<string, unknown>)
      .map(([field, messages]) => [field, Array.isArray(messages) ? String(messages[0]) : String(messages)]));
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(JSON.stringify(body) || res.statusText, res.status, body);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

// HTTP calls. Failed responses throw an ApiError (see handle above)

// Everything the list can be filtered and sorted by; empty strings mean "no filter"
export interface Filters {
  city: string;
  page: number;
  search?: string;
  propertyType?: string;
  operation?: string;
  ordering?: string; // e.g. "-created_at" (newest first) or "size_m2" (smallest first)
}

export async function fetchProperties(
  { city, page, search = "", propertyType = "", operation = "", ordering = "" }: Filters,
): Promise<Paginated<Property>> {
  const params = new URLSearchParams({ page: String(page) });
  if (city) params.set("city", city);
  if (search) params.set("search", search);
  if (propertyType) params.set("property_type", propertyType);
  if (operation) params.set("operation", operation);
  if (ordering) params.set("ordering", ordering);
  return handle(await fetch(`${API_URL}?${params}`));
}

export async function fetchCities(): Promise<string[]> {
  return handle(await fetch(`${API_URL}cities/`));
}

// Currencies a rent can be stored in and shown in
export type Currency = "MXN" | "EUR" | "USD";
export type Rates = Record<Currency, number>;

// Daily European Central Bank rates, free and without an API key
export const RATES_URL = "https://api.frankfurter.dev/v1/latest?base=MXN&symbols=EUR,USD";

// How much 1 MXN is worth in each currency, e.g. { MXN: 1, EUR: 0.047, USD: 0.052 }
export async function fetchRates(): Promise<Rates> {
  const body = await handle<{ rates: { EUR: number; USD: number } }>(await fetch(RATES_URL));
  return { MXN: 1, ...body.rates };
}

// Converts an amount between currencies through MXN. Returns null when the rates are needed but not loaded yet.
export function convert(amount: number, from: Currency, to: Currency, rates: Rates | undefined): number | null {
  if (from === to) return amount;
  if (!rates) return null;
  return (amount / rates[from]) * rates[to];
}

export async function createProperty(data: NewProperty): Promise<Property> {
  return handle(
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
}

export async function updateProperty(id: number, data: PropertyChanges): Promise<Property> {
  return handle(
    await fetch(`${API_URL}${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
}

export async function deleteProperty(id: number): Promise<void> {
  return handle(await fetch(`${API_URL}${id}/`, { method: "DELETE" }));
}
