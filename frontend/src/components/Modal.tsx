import { useEffect, useId, useRef, type ReactNode } from "react";

// Pop-up built on the native <dialog> element, whose showModal() traps focus and makes the page
// behind it inert. Closes on the × button, a backdrop click or Esc, then gives focus back to the opener.
export function Modal({ title, closeLabel = "Close", wide = false, onClose, children }: {
  title: string;
  closeLabel?: string;
  wide?: boolean; // for forms, which need more room than a map
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // Where the mouse button went down: a drag that starts inside the content and ends on the
  // backdrop (e.g. selecting text) must not count as a backdrop click
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current!;
    const opener = document.activeElement as HTMLElement | null; // the button that opened the pop-up
    dialog.showModal();
    closeRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      opener?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={wide ? "modal wide" : "modal"}
      aria-labelledby={titleId}
      // Clicks on the dialog element itself (not its content) are clicks on the backdrop.
      // Only close when the press also started there.
      onPointerDown={(e) => { pressedOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedOnBackdrop.current) onClose();
        pressedOnBackdrop.current = false;
      }}
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
          <h2 id={titleId}>{title}</h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label={closeLabel} onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
