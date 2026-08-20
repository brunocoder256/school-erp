import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export interface DataTableProps<T>
  extends HTMLAttributes<HTMLDivElement> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  actions?: (row: T) => ReactNode;
  empty?: ReactNode;
}

/**
 * Responsive table: renders a `<table>` on desktop and stacked touch-friendly
 * cards on mobile to avoid forcing a wide layout on narrow screens.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  actions,
  empty,
  className,
  ...props
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-4", className)} {...props}>
        {empty ?? <p className="text-sm text-muted-foreground">No records found.</p>}
      </div>
    );
  }

  const visibleColumns = columns.filter((c) => !c.hideOnMobile);
  const leadingColumn = columns[0];

  return (
    <div
      className={cn(
        "w-full overflow-auto rounded-lg border border-border bg-card",
        className,
      )}
      {...props}
    >
      <table className="hidden w-full table-fixed md:table">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {columns.map((column) => (
              <th
                key={column.header}
                className={cn(
                  "px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
            {actions ? (
              <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={String(rowKey(row))}
              className="border-b border-border last:border-0"
            >
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={cn(
                    "px-3 py-2 align-top text-sm",
                    column.className,
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
              {actions ? (
                <td className="px-3 py-2 text-right align-top">
                  {actions(row)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: stacked cards */}
      <div className="md:hidden">
        {rows.map((row) => (
          <div
            key={String(rowKey(row))}
            className="border-b border-border p-4 last:border-0"
          >
            <div className="mb-2 text-sm font-medium text-foreground">
              {leadingColumn.render(row)}
            </div>
            {visibleColumns.map(
              (column) =>
                column.header !== leadingColumn.header && (
                  <div
                    key={column.header}
                    className="flex justify-between py-1 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {column.header}
                    </span>
                    <span className="text-foreground">
                      {column.render(row)}
                    </span>
                  </div>
                ),
            )}
            {actions ? (
              <div className="mt-2 flex justify-end gap-2">
                {actions(row)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
