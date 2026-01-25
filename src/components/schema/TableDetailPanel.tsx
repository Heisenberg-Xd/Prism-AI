import React from 'react';
import { useAppState } from '@/store/AppState';
import {
  Table2,
  Columns,
  Key,
  KeyRound,
  Hash,
  Type,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from 'lucide-react';

export default function TableDetailPanel() {
  const { state, dispatch } = useAppState();

  const selectedTable = state.schema.tables.find(
    (t) => t.name === state.selectedTable
  );

  const tableIndexes = state.schema.indexes.filter(
    (i) => i.tableName === state.selectedTable
  );

  const handleBack = () => {
    dispatch({ type: 'SET_SELECTED_TABLE', payload: null });
    dispatch({ type: 'SET_SCHEMA_VIEW', payload: 'tree' });
  };

  if (!selectedTable) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Table2 size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No table selected</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click a table in the schema tree to view details
          </p>
        </div>
      </div>
    );
  }

  const primaryKeys = selectedTable.columns.filter((c) => c.isPrimaryKey);
  const nullableCols = selectedTable.columns.filter((c) => c.isNullable);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="panel-header border-b">
        <div className="flex items-center gap-2">
          <button
            className="p-1 hover:bg-muted rounded transition-colors"
            onClick={handleBack}
            title="Back to tree"
          >
            <ArrowLeft size={14} />
          </button>
          <Table2 size={14} className="text-primary" />
          <span className="panel-title">{selectedTable.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {selectedTable.columns.length} columns
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Table stats */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-muted/30 border-b text-center text-xs">
          <div>
            <div className="text-lg font-semibold text-foreground">
              {selectedTable.columns.length}
            </div>
            <div className="text-muted-foreground">Columns</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-warning">
              {primaryKeys.length}
            </div>
            <div className="text-muted-foreground">Primary Key{primaryKeys.length !== 1 ? 's' : ''}</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-primary">
              {tableIndexes.length}
            </div>
            <div className="text-muted-foreground">Indexes</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-muted-foreground">
              {nullableCols.length}
            </div>
            <div className="text-muted-foreground">Nullable</div>
          </div>
        </div>

        {/* Columns section */}
        <div className="border-b">
          <div className="px-3 py-2 bg-panel-header flex items-center gap-2">
            <Columns size={14} className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
              Columns
            </span>
          </div>

          <table className="result-table">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Name</th>
                <th>Type</th>
                <th className="w-20 text-center">Nullable</th>
                <th className="w-20 text-center">Key</th>
                <th>Default</th>
              </tr>
            </thead>
            <tbody>
              {selectedTable.columns.map((column, idx) => (
                <tr key={column.name}>
                  <td className="text-muted-foreground text-center">{idx + 1}</td>
                  <td className="font-medium">
                    <div className="flex items-center gap-2">
                      {column.isPrimaryKey ? (
                        <Key size={12} className="text-warning" />
                      ) : column.type.toLowerCase().includes('int') ||
                        column.type.toLowerCase().includes('decimal') ? (
                        <Hash size={12} className="text-muted-foreground" />
                      ) : (
                        <Type size={12} className="text-muted-foreground" />
                      )}
                      {column.name}
                    </div>
                  </td>
                  <td className="font-mono text-syntax-keyword">{column.type}</td>
                  <td className="text-center">
                    {column.isNullable ? (
                      <CheckCircle size={14} className="inline text-success" />
                    ) : (
                      <XCircle size={14} className="inline text-muted-foreground" />
                    )}
                  </td>
                  <td className="text-center">
                    {column.isPrimaryKey && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-warning/20 text-warning font-medium">
                        PK
                      </span>
                    )}
                  </td>
                  <td className="text-muted-foreground font-mono">
                    {column.defaultValue || <span className="italic">NULL</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Indexes section */}
        <div>
          <div className="px-3 py-2 bg-panel-header flex items-center gap-2">
            <KeyRound size={14} className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
              Indexes ({tableIndexes.length})
            </span>
          </div>

          {tableIndexes.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No indexes on this table
            </div>
          ) : (
            <table className="result-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Columns</th>
                  <th className="w-20 text-center">Unique</th>
                </tr>
              </thead>
              <tbody>
                {tableIndexes.map((index) => (
                  <tr key={index.name}>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        <KeyRound size={12} className="text-muted-foreground" />
                        {index.name}
                      </div>
                    </td>
                    <td className="font-mono text-syntax-function">
                      ({index.columns.join(', ')})
                    </td>
                    <td className="text-center">
                      {index.isUnique ? (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-accent text-accent-foreground font-medium">
                          UNIQUE
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* SQL Definition preview */}
        <div className="border-t">
          <div className="px-3 py-2 bg-panel-header flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
              DDL Definition
            </span>
          </div>
          <div className="sql-preview m-3 text-xs">
            {`CREATE TABLE ${selectedTable.name} (\n`}
            {selectedTable.columns
              .map((col, idx) => {
                let def = `  ${col.name} ${col.type}`;
                if (col.isPrimaryKey) def += ' PRIMARY KEY';
                if (!col.isNullable && !col.isPrimaryKey) def += ' NOT NULL';
                if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
                return def + (idx < selectedTable.columns.length - 1 ? ',' : '');
              })
              .join('\n')}
            {'\n);'}
          </div>
        </div>
      </div>
    </div>
  );
}