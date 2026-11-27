import { OPERATION_LABELS, TYPE_LABELS, type Currency, type Property, type Rates } from "../api";
import { formatRent, formatSize } from "../format";
import { useDeleteProperty, useUpdateProperty } from "../hooks";
import { PinIcon } from "./CityMap";

// Simple building drawing used as the card picture (the API has no photos)
function BuildingIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21V5l8-3v19M12 21V8l8 3v10M2 21h20" />
      <path d="M7 7h2M7 10h2M7 13h2M7 16h2M15 13h2M15 16h2" />
    </svg>
  );
}

interface Props {
  property: Property;
  currency: Currency;
  rates: Rates | undefined;
  selected: boolean; // highlighted because it is the one shown on the map
  onShowOnMap: () => void;
}

// One listing in the results: picture, type, name, address, size and rent
export function PropertyCard({ property: p, currency, rates, selected, onShowOnMap }: Props) {
  const { mutate: updateProperty } = useUpdateProperty();
  const { mutate: deleteProperty } = useDeleteProperty();
  const next = p.status === "available" ? "leased" : "available";
  const rent = formatRent(p, currency, rates);

  return (
    <article className={`listing${selected ? " selected" : ""}`}>
      <div className={`listing-media ${p.property_type}`}>
        <BuildingIcon />
        <span className="tag">{TYPE_LABELS[p.property_type]}</span>
        <button className={`status ${p.status}`} title={`Mark as ${next}`}
          onClick={() => updateProperty({ id: p.id, data: { status: next } })}>
          {p.status}
        </button>
      </div>

      <div className="listing-body">
        <p className="eyebrow">For {OPERATION_LABELS[p.operation].toLowerCase()}</p>
        <h3>{p.name}</h3>
        <p className="address">
          {[p.address, p.city].filter(Boolean).join(", ")}
          {p.postal_code && <span className="muted"> · CP {p.postal_code}</span>}
        </p>

        <dl className="facts">
          <div>
            <dt>Size</dt>
            <dd><span>{formatSize(p)}</span> m²</dd>
          </div>
          <div>
            <dt>{p.operation === "sale" ? "Price" : "Monthly rent"}</dt>
            <dd>{rent ? <span>{rent}</span> : <span className="muted">On request ({p.rent_currency})</span>}</dd>
          </div>
        </dl>

        <div className="listing-actions">
          <button type="button" className="link-btn" aria-label={`Show ${p.name} on map`} onClick={onShowOnMap}>
            <PinIcon /> Map
          </button>
          <button className="danger" aria-label={`Delete ${p.name}`} onClick={() => deleteProperty(p.id)}>
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
