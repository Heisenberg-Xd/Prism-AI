import React from 'react';
import { useAppState, createLog } from '@/store/AppState';
import { 
  Columns, 
  RefreshCw, 
  GitBranch, 
  Table2,
  GitCompare,
  List
} from 'lucide-react';
import SchemaTree from '@/components/schema/SchemaTree';
import SchemaChangeDiff from '@/components/schema/SchemaChangeDiff';
import TableDetailPanel from '@/components/schema/TableDetailPanel';

type ViewType = 'tree' | 'diff' | 'detail';

export default function SchemaPage() {
  const { state, dispatch } = useAppState();

  const addLog = (type: 'info' | 'warning' | 'error' | 'success', message: string) => {
    dispatch({ type: 'ADD_LOG', payload: createLog(type, message) });
  };

  const handleRefresh = () => {
    addLog('info', 'Refreshing schema...');
    setTimeout(() => addLog('success', 'Schema refreshed'), 500);
  };

  const setView = (view: ViewType) => {
    dispatch({ type: 'SET_SCHEMA_VIEW', payload: view });
    if (view !== 'detail') {
      dispatch({ type: 'SET_SELECTED_TABLE', payload: null });
    }
  };

  if (!state.activeDatabase) {
    return (
      <div className="h-full flex items-center justify-center bg-panel">
        <div className="text-center">
          <Table2 size={48} className="mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-2">No database selected</h3>
          <p className="text-sm text-muted-foreground">
            Select or create a database to view its schema
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-panel">
      {/* Header */}
      <div className="panel-header border-b">
        <div className="flex items-center gap-2">
          <Columns size={16} className="text-primary" />
          <span className="panel-title">Schema Explorer</span>
          <span className="text-xs text-muted-foreground">— {state.activeDatabase.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-system py-1" onClick={handleRefresh}>
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="tabs-container">
        <button
          className={`tab ${state.ui.schemaView === 'tree' ? 'active' : ''}`}
          onClick={() => setView('tree')}
        >
          <List size={14} />
          Tree View
        </button>
        <button
          className={`tab ${state.ui.schemaView === 'diff' ? 'active' : ''}`}
          onClick={() => setView('diff')}
        >
          <GitCompare size={14} />
          Changes ({Math.max(0, state.schemaHistory.length - 1)})
        </button>
        {state.selectedTable && (
          <button
            className={`tab ${state.ui.schemaView === 'detail' ? 'active' : ''}`}
            onClick={() => setView('detail')}
          >
            <Table2 size={14} />
            {state.selectedTable}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {state.ui.schemaView === 'tree' && <SchemaTree />}
        {state.ui.schemaView === 'diff' && <SchemaChangeDiff />}
        {state.ui.schemaView === 'detail' && <TableDetailPanel />}
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 px-3 py-1.5 bg-panel-header border-t text-[10px] text-muted-foreground">
        <span>{state.schema.tables.length} table{state.schema.tables.length !== 1 ? 's' : ''}</span>
        <span>{state.schema.views.length} view{state.schema.views.length !== 1 ? 's' : ''}</span>
        <span>{state.schema.indexes.length} index{state.schema.indexes.length !== 1 ? 'es' : ''}</span>
        {state.schemaHistory.length > 1 && (
          <span className="ml-auto">
            {state.schemaHistory.length - 1} schema change{state.schemaHistory.length !== 2 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}