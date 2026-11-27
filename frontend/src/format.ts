import { convert, type Currency, type Property, type Rates } from "./api";

// "475 – 33,277" for a range, "345" for a single size
export function formatSize(p: Property): string {
  const min = p.size_m2.toLocaleString("en-US");
  return p.size_max_m2 ? `${min} – ${p.size_max_m2.toLocaleString("en-US")}` : min;
}

// Rent shown in the chosen currency, or null when the price is "on request".
// If it cannot be converted (rates loading or unavailable) it is shown in the currency it was saved in,
// with the currency code ("USD 1,200.00") so it is never mistaken for the chosen currency.
export function formatRent(p: Property, currency: Currency, rates: Rates | undefined): string | null {
  if (p.monthly_rent === null) return null;
  const amount = Number(p.monthly_rent);
  const shown = convert(amount, p.rent_currency, currency, rates);
  return shown === null
    ? amount.toLocaleString("en-US", { style: "currency", currency: p.rent_currency, currencyDisplay: "code" })
    : shown.toLocaleString("en-US", { style: "currency", currency });
}

// Text used to point the map at a property, e.g. "Amado Nervo 2200, 45050, Zapopan, Jalisco"
export function mapQuery(p: Property): string {
  return [p.address, p.postal_code, p.city].filter(Boolean).join(", ");
}

// Google Maps embed URL; zoom 14 shows the street, 11 the whole city
export function mapUrl(query: string, zoom = 14): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;
}
