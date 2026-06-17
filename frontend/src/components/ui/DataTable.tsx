import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (item: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
  rowClassName?: string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  className,
  rowClassName,
}: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-card border border-border bg-surface', className)}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-3 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-text-subtle',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center font-sans text-[13px] text-text-subtle"
              >
                No records found.
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={index}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'border-b border-border hover:bg-surface-muted transition-colors last:border-b-0',
                  onRowClick ? 'cursor-pointer select-none' : '',
                  rowClassName
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 py-3 font-sans text-[13px] text-text align-middle',
                      column.className
                    )}
                  >
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
