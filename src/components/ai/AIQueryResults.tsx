import React from 'react';
import { Table, Clock, AlertTriangle, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AIQueryResultsProps {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
  warning?: string;
  error?: string;
}

export default function AIQueryResults({
  columns,
  rows,
  rowCount,
  executionTime,
  warning,
  error,
}: AIQueryResultsProps) {
  if (error) {
    return (
      <div className="border-t bg-destructive/5 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle size={16} />
          <span className="text-sm font-medium">Query Failed</span>
        </div>
        <p className="text-sm text-destructive/80 mt-1">{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="border-t bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Database size={16} />
          <span className="text-sm">Query returned 0 rows</span>
          <span className="text-xs ml-auto flex items-center gap-1">
            <Clock size={12} />
            {executionTime}ms
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t bg-panel">
      {/* Results Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-panel-header border-b">
        <div className="flex items-center gap-2">
          <Table size={14} className="text-primary" />
          <span className="text-sm font-medium">
            {rowCount} row{rowCount !== 1 ? 's' : ''}
          </span>
          {columns.length > 0 && (
            <span className="text-xs text-muted-foreground">
              • {columns.length} column{columns.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {warning && (
            <span className="text-warning flex items-center gap-1">
              <AlertTriangle size={12} />
              Demo
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {executionTime}ms
          </span>
        </div>
      </div>

      {/* Results Table */}
      <ScrollArea className="max-h-[300px]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left font-medium text-muted-foreground border-b whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 font-mono text-xs whitespace-nowrap max-w-[200px] truncate"
                      title={String(row[col] ?? 'NULL')}
                    >
                      {row[col] === null || row[col] === undefined ? (
                        <span className="text-muted-foreground italic">NULL</span>
                      ) : typeof row[col] === 'boolean' ? (
                        <span className={row[col] ? 'text-success' : 'text-destructive'}>
                          {String(row[col])}
                        </span>
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
}
