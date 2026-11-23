import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import type { Property } from "../api";
import { useDeleteProperty, useUpdateProperty } from "../hooks";

const col = createColumnHelper<Property>();

export function PropertyTable({ data }: { data: Property[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const update = useUpdateProperty();
  const remove = useDeleteProperty();

  // Columns are memoized so the table does not rebuild them on every render.
  const columns = useMemo(
    () => [
      col.accessor("name", { header: "Name" }),
      col.accessor("city", { header: "City" }),
      col.accessor("size_m2", { header: "Size (m²)" }),
      col.accessor((row) => Number(row.monthly_rent), {
        id: "monthly_rent",
        header: "Rent (MXN)",
        cell: (info) => info.getValue().toLocaleString("es-MX"),
      }),
      col.accessor("status", {
        header: "Status",
        cell: (info) => {
          const p = info.row.original;
          const next = p.status === "available" ? "leased" : "available";
          return (
            <button onClick={() => update.mutate({ id: p.id, data: { status: next } })}>
              {p.status}
            </button>
          );
        },
      }),
      col.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <button aria-label={`Delete ${info.row.original.name}`}
            onClick={() => remove.mutate(info.row.original.id)}>
            Delete
          </button>
        ),
      }),
    ],
    [update, remove],
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
  );
}
