// All HTTP calls live here so components never call fetch directly.
export const API_URL = "http://localhost:8000/api/properties/";

export type Status = "available" | "leased";

export interface Property {
  id: number;
  name: string;
  city: string;
  size_m2: number;
  monthly_rent: string; // DRF returns Decimal as string
  status: Status;
  created_at: string;
}

export type NewProperty = Omit<Property, "id" | "created_at">;

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(body) || res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

// EXERCISE 4: the HTTP calls
// Look at updateProperty and deleteProperty below as examples.

export async function fetchProperties(city: string, page: number): Promise<Paginated<Property>> {
  const params = new URLSearchParams({ page: String(page) });
  if (city) params.set("city", city);
  return handle(await fetch(`${API_URL}?${params}`));

}

export async function fetchCities(): Promise<string[]> {
  return handle(await fetch(`${API_URL}cities/`));
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

export async function updateProperty(id: number, data: Partial<NewProperty>): Promise<Property> {
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
