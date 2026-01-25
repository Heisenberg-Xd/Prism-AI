import React from 'react';
import { useAppState } from '@/store/AppState';
import { GitCompare, Plus, Minus, Clock, Table2, Eye, KeyRound, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function SchemaChangeDiff() {
  const { state } = useAppState();

  if (!state.activeDatabase) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <GitCompare size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No database selected</p>
        </div>
      </div>
    );
  }

  if (state.schemaHistory.length < 2) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <GitCompare size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No schema changes yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create tables, views, or indexes to see changes
          </p>
        </div>
      </div>
    );
  }

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'table_created':
      case 'table_altered':
      case 'table_dropped':
        return <Table2 size={14} />;
      case 'view_created':
      case 'view_dropped':
        return <Eye size={14} />;
      case 'index_created':
      case 'index_dropped':
        return <KeyRound size={14} />;
      default:
        return <GitCompare size={14} />;
    }
  };

  const getChangeColor = (changeType: string) => {
    if (changeType.includes('created')) return 'text-success';
    if (changeType.includes('dropped')) return 'text-destructive';
    if (changeType.includes('altered')) return 'text-warning';
    return 'text-muted-foreground';
  };

  // Compare two snapshots
  const compareSnapshots = (before: typeof state.schemaHistory[0], after: typeof state.schemaHistory[0]) => {
    const changes: {
      type: 'added' | 'removed' | 'modified';
      category: 'table' | 'view' | 'index';
      name: string;
      details?: string;
    }[] = [];

    // Compare tables
    const beforeTableNames = new Set(before.tables.map((t) => t.name));
    const afterTableNames = new Set(after.tables.map((t) => t.name));

    // Added tables
    after.tables.forEach((table) => {
      if (!beforeTableNames.has(table.name)) {
        changes.push({
          type: 'added',
          category: 'table',
          name: table.name,
          details: `${table.columns.length} columns: ${table.columns.map((c) => c.name).join(', ')}`,
        });
      }
    });

    // Removed tables
    before.tables.forEach((table) => {
      if (!afterTableNames.has(table.name)) {
        changes.push({
          type: 'removed',
          category: 'table',
          name: table.name,
        });
      }
    });

    // Modified tables (column changes)
    before.tables.forEach((beforeTable) => {
      const afterTable = after.tables.find((t) => t.name === beforeTable.name);
      if (afterTable) {
        const beforeCols = new Set(beforeTable.columns.map((c) => c.name));
        const afterCols = new Set(afterTable.columns.map((c) => c.name));
        
        const addedCols = afterTable.columns.filter((c) => !beforeCols.has(c.name));
        const removedCols = beforeTable.columns.filter((c) => !afterCols.has(c.name));
        
        if (addedCols.length > 0 || removedCols.length > 0) {
          changes.push({
            type: 'modified',
            category: 'table',
            name: beforeTable.name,
            details: [
              ...addedCols.map((c) => `+${c.name}`),
              ...removedCols.map((c) => `-${c.name}`),
            ].join(', '),
          });
        }
      }
    });

    // Compare views
    const beforeViewNames = new Set(before.views.map((v) => v.name));
    const afterViewNames = new Set(after.views.map((v) => v.name));

    after.views.forEach((view) => {
      if (!beforeViewNames.has(view.name)) {
        changes.push({ type: 'added', category: 'view', name: view.name });
      }
    });

    before.views.forEach((view) => {
      if (!afterViewNames.has(view.name)) {
        changes.push({ type: 'removed', category: 'view', name: view.name });
      }
    });

    // Compare indexes
    const beforeIndexNames = new Set(before.indexes.map((i) => i.name));
    const afterIndexNames = new Set(after.indexes.map((i) => i.name));

    after.indexes.forEach((index) => {
      if (!beforeIndexNames.has(index.name)) {
        changes.push({
          type: 'added',
          category: 'index',
          name: index.name,
          details: `ON ${index.tableName} (${index.columns.join(', ')})`,
        });
      }
    });

    before.indexes.forEach((index) => {
      if (!afterIndexNames.has(index.name)) {
        changes.push({ type: 'removed', category: 'index', name: index.name });
      }
    });

    return changes;
  };

  // Show history in reverse chronological order (most recent first)
  const reversedHistory = [...state.schemaHistory].reverse();

  return (
    <div className="h-full flex flex-col">
      <div className="panel-header border-b">
        <div className="flex items-center gap-2">
          <GitCompare size={14} className="text-primary" />
          <span className="panel-title">Schema Changes</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {state.schemaHistory.length - 1} change{state.schemaHistory.length !== 2 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {reversedHistory.slice(0, -1).map((snapshot, idx) => {
          const previousSnapshot = reversedHistory[idx + 1];
          const changes = compareSnapshots(previousSnapshot, snapshot);

          return (
            <div
              key={snapshot.id}
              className={`border-b border-panel-border ${idx === 0 ? 'bg-primary/5' : ''}`}
            >
              {/* Change header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-panel-header">
                <Clock size={12} className="text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">
                  {format(snapshot.timestamp, 'HH:mm:ss')}
                </span>
                <span className={`flex items-center gap-1 ${getChangeColor(snapshot.changeType)}`}>
                  {getChangeIcon(snapshot.changeType)}
                  <span className="text-xs font-medium">{snapshot.changeDescription}</span>
                </span>
              </div>

              {/* Diff view */}
              {changes.length > 0 && (
                <div className="px-3 py-2 font-mono text-xs space-y-1">
                  {changes.map((change, changeIdx) => (
                    <div
                      key={changeIdx}
                      className={`flex items-start gap-2 ${
                        change.type === 'added'
                          ? 'text-success'
                          : change.type === 'removed'
                          ? 'text-destructive'
                          : 'text-warning'
                      }`}
                    >
                      <span className="w-4 flex-shrink-0 text-center font-bold">
                        {change.type === 'added' ? '+' : change.type === 'removed' ? '-' : '~'}
                      </span>
                      <span className="flex-shrink-0">{change.category}:</span>
                      <span className="font-medium">{change.name}</span>
                      {change.details && (
                        <span className="text-muted-foreground truncate">
                          — {change.details}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Summary stats */}
              <div className="px-3 py-1.5 bg-muted/30 text-[10px] text-muted-foreground flex gap-4">
                <span>{snapshot.tables.length} table{snapshot.tables.length !== 1 ? 's' : ''}</span>
                <span>{snapshot.views.length} view{snapshot.views.length !== 1 ? 's' : ''}</span>
                <span>{snapshot.indexes.length} index{snapshot.indexes.length !== 1 ? 'es' : ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}