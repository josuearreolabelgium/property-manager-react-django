import { useEffect, useId, useRef } from "react";

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

// Pop-up with an embedded Google Map of the city. It uses the native <dialog> element, whose
// showModal() traps focus and makes the page behind it inert. Closes on ×, backdrop click or Esc.
export function CityMapModal({ city, onClose }: { city: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current!;
    const opener = document.activeElement as HTMLElement | null; // the pin button that was clicked
    dialog.showModal();
    closeRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      opener?.focus(); // give focus back to the pin button when the map closes
    };
  }, []);

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(city)}&z=11&output=embed`;

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      // Clicks on the dialog element itself (not its content) are clicks on the backdrop
      onClick={(e) => e.target === e.currentTarget && onClose()}
      // Handle Esc ourselves so React state stays in sync with the dialog
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-body">
        <div className="modal-head">
          <h2 id={titleId}>{city}</h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Close map" onClick={onClose}>×</button>
        </div>
        <iframe title={`Map of ${city}`} src={src} loading="lazy" referrerPolicy="no-referrer" />
      </div>
    </dialog>
  );
}
