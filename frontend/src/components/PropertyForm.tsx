import { cloneElement, useId, useState, type FormEvent, type ReactElement } from "react";

import {
  ApiError, OPERATION_LABELS, TYPE_LABELS, type Currency, type NewProperty, type Operation, type Property,
  type PropertyType,
} from "../api";
import { useCreateProperty } from "../hooks";

const EMPTY: NewProperty = {
  name: "", property_type: "office", operation: "rent", address: "", city: "", postal_code: "",
  size_m2: 0, size_max_m2: null, monthly_rent: null, rent_currency: "MXN", status: "available",
};

// A labelled input with the server's error for that field (if any) shown under it. The error is
// outside the <label> (so it is not read as part of the field's name) and linked with aria-describedby.
function Field({ label, optional, error, full, children }: {
  label: string;
  optional?: boolean;
  error?: string;
  full?: boolean; // takes the whole row
  children: ReactElement<{ "aria-describedby"?: string }>;
}) {
  const errorId = useId();
  return (
    <div className={full ? "field full" : "field"}>
      <label>
        <span>{label}{optional && <span className="optional"> (optional)</span>}</span>
        {cloneElement(children, { "aria-describedby": error ? errorId : undefined })}
      </label>
      {error && <p id={errorId} className="field-error">{error}</p>}
    </div>
  );
}

// Form to add a property. onCreated runs after a successful save, e.g. to close the pop-up.
export function PropertyForm({ onCreated }: { onCreated?: (property: Property) => void }) {
  const [form, setForm] = useState<NewProperty>(EMPTY);
  const create = useCreateProperty();
  // Small helper so every input can update one field
  const set = <K extends keyof NewProperty>(key: K, value: NewProperty[K]) => setForm({ ...form, [key]: value });

  // Errors the API returned per field, e.g. { name: "property with this name already exists." }
  const errors = create.error instanceof ApiError ? create.error.fieldErrors() : {};
  const fieldError = (key: keyof NewProperty) => errors[key];
  // Errors that do not belong to one input (e.g. the server is down)
  const otherError = create.isError && !Object.keys(errors).some((k) => k in EMPTY)
    ? (errors.non_field_errors ?? errors.detail ?? create.error.message)
    : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate(form, {
      onSuccess: (property) => {
        setForm(EMPTY);
        onCreated?.(property);
      },
    });
  }

  const invalid = (key: keyof NewProperty) => (fieldError(key) ? true : undefined);

  return (
    <form onSubmit={onSubmit} className="form" aria-label="New property">
      <Field label="Name" error={fieldError("name")} full>
        <input value={form.name} required maxLength={120} aria-invalid={invalid("name")}
          onChange={(e) => set("name", e.target.value)} />
      </Field>

      <Field label="Type" error={fieldError("property_type")}>
        <select value={form.property_type} aria-invalid={invalid("property_type")}
          onChange={(e) => set("property_type", e.target.value as PropertyType)}>
          {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="Operation" error={fieldError("operation")}>
        <select value={form.operation} aria-invalid={invalid("operation")}
          onChange={(e) => set("operation", e.target.value as Operation)}>
          {Object.entries(OPERATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>

      <Field label="Address" optional error={fieldError("address")} full>
        <input value={form.address} maxLength={200} placeholder="Street and number, neighbourhood"
          aria-invalid={invalid("address")} onChange={(e) => set("address", e.target.value)} />
      </Field>

      <Field label="City" error={fieldError("city")}>
        <input value={form.city} required maxLength={80} placeholder="e.g. Ciudad de México"
          aria-invalid={invalid("city")} onChange={(e) => set("city", e.target.value)} />
      </Field>
      {/* Text input with a pattern, so leading zeros (01020) are kept */}
      <Field label="Postal code" optional error={fieldError("postal_code")}>
        <input value={form.postal_code} inputMode="numeric" pattern="\d{5}" title="5 digits" placeholder="01020"
          aria-invalid={invalid("postal_code")} onChange={(e) => set("postal_code", e.target.value)} />
      </Field>

      <Field label="Size (m²)" error={fieldError("size_m2")}>
        <input type="number" min={1} value={form.size_m2 || ""} required aria-invalid={invalid("size_m2")}
          onChange={(e) => set("size_m2", Number(e.target.value))} />
      </Field>
      <Field label="Max size (m²)" optional error={fieldError("size_max_m2")}>
        <input type="number" min={form.size_m2 || 1} value={form.size_max_m2 ?? ""} placeholder="Only for a range"
          aria-invalid={invalid("size_max_m2")}
          onChange={(e) => set("size_max_m2", e.target.value ? Number(e.target.value) : null)} />
      </Field>

      <Field label={form.operation === "sale" ? "Price" : "Monthly rent"} optional error={fieldError("monthly_rent")}>
        <input type="number" min={0} step="0.01" value={form.monthly_rent ?? ""} placeholder="Empty = on request"
          aria-invalid={invalid("monthly_rent")} onChange={(e) => set("monthly_rent", e.target.value || null)} />
      </Field>
      <Field label="Currency" error={fieldError("rent_currency")}>
        <select value={form.rent_currency} aria-invalid={invalid("rent_currency")}
          onChange={(e) => set("rent_currency", e.target.value as Currency)}>
          <option value="MXN">MXN</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </Field>

      {otherError && <p className="error form-error">Could not save: {otherError}</p>}

      <div className="form-actions">
        <button type="submit" className="primary" disabled={create.isPending}>
          {create.isPending ? "Saving..." : "Add property"}
        </button>
      </div>
    </form>
  );
}
