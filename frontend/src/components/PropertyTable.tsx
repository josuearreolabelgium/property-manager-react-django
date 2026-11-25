import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import type { Currency, Property } from "../api";
import { useDeleteProperty, useUpdateProperty } from "../hooks";
import { MapPinButton } from "./CityMap";

const col = createColumnHelper<Property>();

interface Props {
  data: Property[];
  currency: Currency; // currency to show the rent in
  rate: number;       // value of 1 MXN in that currency
  onShowMap: (city: string) => void; // opens the map pop-up for a city
}

export function PropertyTable({ data, currency, rate, onShowMap }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  // Only the mutate functions are taken: they keep the same identity between renders, while the
  // mutation objects are new on every render and would make the columns (and cells) rebuild constantly.
  const { mutate: updateProperty } = useUpdateProperty();
  const { mutate: deleteProperty } = useDeleteProperty();

  // Columns are memoized so the table does not rebuild them on every render.
  const columns = useMemo(
    () => [
      col.accessor("name", { header: "Name" }),
      col.accessor("city", {
        header: "City",
        cell: (info) => (
          <span className="city-cell">
            {info.getValue()}
            <MapPinButton city={info.getValue()} onClick={() => onShowMap(info.getValue())} />
          </span>
        ),
      }),
      col.accessor("size_m2", { header: "Size (m²)" }),
      col.accessor((row) => Number(row.monthly_rent), {
        id: "monthly_rent",
        header: `Rent (${currency})`,
        // Sorting still uses the MXN value, which gives the same order in any currency
        cell: (info) =>
          (info.getValue() * rate).toLocaleString("en-US", { style: "currency", currency }),
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
    [updateProperty, deleteProperty, currency, rate, onShowMap],
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
