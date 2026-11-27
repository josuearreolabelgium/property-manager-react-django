import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { convert, OPERATION_LABELS, TYPE_LABELS, type Currency, type Property, type Rates } from "../api";
import { formatRent, formatSize } from "../format";
import { useDeleteProperty, useUpdateProperty } from "../hooks";
import { MapPinButton } from "./CityMap";

const col = createColumnHelper<Property>();

interface Props {
  data: Property[];
  currency: Currency;        // currency to show the rent in
  rates: Rates | undefined;  // exchange rates, undefined while loading
  onShowMap: (city: string) => void; // opens the map pop-up for a city
}

export function PropertyTable({ data, currency, rates, onShowMap }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  // Only the mutate functions are taken: they keep the same identity between renders, while the
  // mutation objects are new on every render and would make the columns (and cells) rebuild constantly.
  const { mutate: updateProperty } = useUpdateProperty();
  const { mutate: deleteProperty } = useDeleteProperty();

  // Columns are memoized so the table does not rebuild them on every render.
  const columns = useMemo(
    () => [
      col.accessor("name", { header: "Name" }),
      col.accessor((row) => `${TYPE_LABELS[row.property_type]} · ${OPERATION_LABELS[row.operation]}`, {
        id: "type",
        header: "Type",
      }),
      col.accessor("address", {
        header: "Address",
        cell: (info) => (
          <>
            {info.getValue() || "—"}
            {info.row.original.postal_code && <span className="muted small"> CP {info.row.original.postal_code}</span>}
          </>
        ),
      }),
      col.accessor("city", {
        header: "City",
        cell: (info) => (
          <span className="city-cell">
            {info.getValue()}
            <MapPinButton city={info.getValue()} onClick={() => onShowMap(info.getValue())} />
          </span>
        ),
      }),
      col.accessor("size_m2", {
        header: "Size (m²)",
        // A range like "475 – 33,277" when the space can be leased in parts
        cell: (info) => formatSize(info.row.original),
      }),
      // Sorted by the value in MXN so prices stored in different currencies compare correctly.
      // "On request" prices, and prices that cannot be converted yet (rates loading or unavailable),
      // are undefined and always go last instead of being compared in the wrong currency.
      col.accessor((row) => row.monthly_rent === null
        ? undefined
        : convert(Number(row.monthly_rent), row.rent_currency, "MXN", rates) ?? undefined, {
        id: "monthly_rent",
        // Monthly rent for rentals, sale price for sales. Without exchange rates the cells keep their
        // own currency (shown with its code), so the header does not claim a single currency.
        header: rates ? `Price (${currency})` : "Price",
        sortUndefined: "last",
        cell: (info) => formatRent(info.row.original, currency, rates)
          ?? <span className="muted">On request ({info.row.original.rent_currency})</span>,
      }),
      col.accessor("status", {
        header: "Status",
        cell: (info) => {
          const p = info.row.original;
          const next = p.status === "available" ? "leased" : "available";
          return (
            <button className={`status ${p.status}`} title={`Mark as ${next}`}
              onClick={() => updateProperty({ id: p.id, data: { status: next } })}>
              {p.status}
            </button>
          );
        },
      }),
      col.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <button className="danger" aria-label={`Delete ${info.row.original.name}`}
            onClick={() => deleteProperty(info.row.original.id)}>
            Delete
          </button>
        ),
      }),
    ],
    [updateProperty, deleteProperty, currency, rates, onShowMap],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), // client side sort of the current page
  });

  return (
    <div className="table-wrap">
    <table>
      <thead>
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id}>
            {hg.headers.map((h) => (
              <th key={h.id} onClick={h.column.getToggleSortingHandler()}
                style={{ cursor: h.column.getCanSort() ? "pointer" : "default" }}>
                {flexRender(h.column.columnDef.header, h.getContext())}
                {{ asc: " ▲", desc: " ▼" }[h.column.getIsSorted() as string] ?? ""}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
