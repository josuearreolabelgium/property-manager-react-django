import { mapUrl } from "../format";
import { Modal } from "./Modal";

export function PinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

// Map-pin icon button shown next to a city name in the table
export function MapPinButton({ city, onClick }: { city: string; onClick: () => void }) {
  return (
    <button type="button" className="icon-btn" aria-label={`Show map of ${city}`} title={`Show map of ${city}`}
      onClick={onClick}>
      <PinIcon />
    </button>
  );
}

// Pop-up with an embedded Google Map of the whole city
export function CityMapModal({ city, onClose }: { city: string; onClose: () => void }) {
  return (
    <Modal title={city} closeLabel="Close map" onClose={onClose}>
      <iframe title={`Map of ${city}`} src={mapUrl(city, 11)} loading="lazy" referrerPolicy="no-referrer" />
    </Modal>
  );
}
