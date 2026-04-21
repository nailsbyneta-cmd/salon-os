import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as React from 'react';

import { Button } from './button.js';
import { cn } from './cn.js';
import { EmptyState } from './empty-state.js';
import { Input } from './input.js';

// ─── DataTable ────────────────────────────────────────────────
//
// TanStack-Table-basiert, mit Default-Features:
//   - Sortierbare Header (Click)
//   - Globales Filter-Input (optional)
//   - Pagination (optional)
//   - Leerzustand via EmptyState
//
// Bleibt API-minimal: Konsumenten definieren nur `columns` und `data`.
// Für Spezialfälle (Bulk-Select, Column-Resize) können später Props
// freigegeben werden.

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  rowKey?: (row: TData, index: number) => string;
}

export function DataTable<TData>({
  columns,
  data,
  searchable = false,
  searchPlaceholder = 'Suchen…',
  pageSize,
  emptyTitle = 'Keine Daten',
  emptyDescription,
  className,
  rowKey,
}: DataTableProps<TData>): React.JSX.Element {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: pageSize ? getPaginationRowModel() : undefined,
    initialState: pageSize ? { pagination: { pageSize, pageIndex: 0 } } : undefined,
  });

  const rows = table.getRowModel().rows;
  const totalPages = table.getPageCount();
  const pageIndex = table.getState().pagination?.pageIndex ?? 0;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {searchable ? (
        <Input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          type="search"
          className="max-w-xs"
        />
      ) : null}

      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised text-xs uppercase tracking-wide text-text-muted">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={cn(
                        'px-4 py-3 text-left font-semibold',
                        canSort && 'cursor-pointer select-none hover:text-text-primary',
                      )}
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : canSort ? '↕' : ''}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey ? rowKey(row.original, i) : row.id}
                  className="border-t border-border hover:bg-surface-raised"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-text-primary">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageSize && totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-xs text-text-secondary">
          <span>
            Seite {pageIndex + 1} von {totalPages} — {rows.length} von {data.length} Rows
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Zurück
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Weiter
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
