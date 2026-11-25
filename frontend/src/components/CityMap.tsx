import { useEffect } from "react";

// Map-pin icon button shown next to a city name
export function MapPinButton({ city, onClick }: { city: string; onClick: () => void }) {
  return (
    <button type="button" className="icon-btn" aria-label={`Show map of ${city}`} title={`Show map of ${city}`}
      onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    </button>
  );
}

// Pop-up with an embedded Google Map of the city; closes on ×, backdrop click or Esc
export function CityMapModal({ city, onClose }: { city: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(city)}&z=11&output=embed`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={`Map of ${city}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{city}</h2>
          <button type="button" className="icon-btn" aria-label="Close map" onClick={onClose}>×</button>
        </div>
        <iframe title={`Map of ${city}`} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
    </div>
  );
}
