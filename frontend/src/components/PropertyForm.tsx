import { useState, type FormEvent } from "react";

import type { NewProperty } from "../api";
import { useCreateProperty } from "../hooks";

const EMPTY: NewProperty = { name: "", city: "", size_m2: 0, monthly_rent: "", status: "available" };

export function PropertyForm() {
  const [form, setForm] = useState<NewProperty>(EMPTY);
  const create = useCreateProperty();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate(form, { onSuccess: () => setForm(EMPTY) });
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <input placeholder="Name" value={form.name} required
        onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="City" value={form.city} required
        onChange={(e) => setForm({ ...form, city: e.target.value })} />
      <input placeholder="Size m²" type="number" value={form.size_m2 || ""} required
        onChange={(e) => setForm({ ...form, size_m2: Number(e.target.value) })} />
      <input placeholder="Monthly rent" type="number" value={form.monthly_rent} required
        onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} />
      <button type="submit" disabled={create.isPending}>
        {create.isPending ? "Saving..." : "Add property"}
      </button>
      {create.isError && <p className="error">Error: {create.error.message}</p>}
    </form>
  );
}
