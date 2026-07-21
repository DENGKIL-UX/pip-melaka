"use client";

/**
 * §A.4: Enhanced DataTable — sortable, filterable, paginated table.
 *
 * Built on @tanstack/react-table with shadcn/ui styling.
 * Features:
 *   - Column sorting (click header to sort)
 *   - Global search filter
 *   - Pagination (configurable page size)
 *   - Row click handler
 *   - Density toggle (compact/comfortable)
 *
 * Usage:
 *   <DataTable
 *     columns={columns}
 *     data={data}
 *     searchable
 *     searchPlaceholder="Search DUN..."
 *     pagination
 *     pageSize={10}
 *     onRowClick={(row) => console.log(row)}
 *   />
 */
import { useState, useMemo } from "react";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown,
  Search, Rows3, Rows4,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pagination?: boolean;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Search…",
  pagination = true,
  pageSize = 10,
  onRowClick,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [compact, setCompact] = useState(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, columnFilters, globalFilter },
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const totalCount = data.length;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {searchable && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 ml-auto text-xs gap-1.5"
          onClick={() => setCompact(!compact)}
        >
          {compact ? <Rows4 className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
          {compact ? "Comfortable" : "Compact"}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead className="bg-muted/30 border-b border-border/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-left px-3 font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="flex-shrink-0">
                            {header.column.getIsSorted() === "asc" ? (
                              <ChevronUp className="h-3 w-3 text-mlk" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ChevronDown className="h-3 w-3 text-mlk" />
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 opacity-30" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border/40 last:border-0 hover:bg-mlk/5 transition-colors",
                      onRowClick && "cursor-pointer",
                      compact ? "h-7" : "h-10",
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="text-center py-8 text-muted-foreground text-sm">
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * pageSize + 1}–
            {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
