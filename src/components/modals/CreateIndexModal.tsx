import React, { useState } from 'react';
import { useAppState, createLog } from '@/store/AppState';
import { createIndex } from '@/services/DatabaseService';
import { X, KeyRound, Loader2 } from 'lucide-react';

export default function CreateIndexModal() {
  const { state, dispatch } = useAppState();
  const [indexName, setIndexName] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isUnique, setIsUnique] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    dispatch({ type: 'SET_MODAL', payload: null });
  };

  const tableColumns = state.schema.tables.find((t) => t.name === selectedTable)?.columns || [];

  const toggleColumn = (colName: string) => {
    setSelectedColumns((prev) =>
      prev.includes(colName)
        ? prev.filter((c) => c !== colName)
        : [...prev, colName]
    );
  };

  const handleCreate = async () => {
    if (!indexName || indexName.length < 2) {
      setError('Index name must be at least 2 characters.');
      return;
    }

    if (!selectedTable) {
      setError('Please select a table.');
      return;
    }

    if (selectedColumns.length === 0) {
      setError('Please select at least one column.');
      return;
    }

    if (!state.activeDatabase) {
      setError('No database selected.');
      return;
    }

    setIsCreating(true);
    setError('');

    dispatch({
      type: 'ADD_LOG',
      payload: createLog('info', `Creating index: ${indexName}...`),
    });

    try {
      const index = await createIndex({
        databaseId: state.activeDatabase.id,
        name: indexName,
        tableName: selectedTable,
        columns: selectedColumns,
        isUnique,
      });

      dispatch({ type: 'ADD_INDEX', payload: index });
      dispatch({
        type: 'ADD_LOG',
        payload: createLog('success', `Index "${indexName}" created on ${selectedTable}(${selectedColumns.join(', ')})`),
      });

      handleClose();
    } catch (err) {
      setError('Failed to create index.');
      dispatch({
        type: 'ADD_LOG',
        payload: createLog('error', `Failed to create index: ${indexName}`),
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content w-[480px]" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-primary" />
            <h2 className="modal-title">Create Index</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-foreground/80">
              Index Name
            </label>
            <input
              type="text"
              className="input-system"
              placeholder="idx_users_email"
              value={indexName}
              onChange={(e) => setIndexName(e.target.value.toLowerCase())}
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-foreground/80">
              Table
            </label>
            <select
              className="input-system"
              value={selectedTable}
              onChange={(e) => {
                setSelectedTable(e.target.value);
                setSelectedColumns([]);
              }}
              disabled={isCreating}
            >
              <option value="">Select a table</option>
              {state.schema.tables.map((table) => (
                <option key={table.name} value={table.name}>
                  {table.name}
                </option>
              ))}
            </select>
            {state.schema.tables.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Create a table first to add indexes
              </p>
            )}
          </div>

          {selectedTable && tableColumns.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1.5 text-foreground/80">
                Columns
              </label>
              <div className="flex flex-wrap gap-2">
                {tableColumns.map((col) => (
                  <button
                    key={col.name}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      selectedColumns.includes(col.name)
                        ? 'bg-primary/20 border-primary text-foreground'
                        : 'bg-secondary border-border hover:border-muted-foreground'
                    }`}
                    onClick={() => toggleColumn(col.name)}
                    disabled={isCreating}
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={isUnique}
                onChange={(e) => setIsUnique(e.target.checked)}
                disabled={isCreating}
              />
              Unique Index
            </label>
          </div>

          {indexName && selectedTable && selectedColumns.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1.5 text-foreground/80">
                Preview
              </label>
              <div className="sql-preview">
                <span className="sql-keyword">CREATE</span>
                {isUnique && <span className="sql-keyword"> UNIQUE</span>}
                <span className="sql-keyword"> INDEX</span> {indexName}
                <br />
                <span className="sql-keyword">ON</span> {selectedTable} ({selectedColumns.join(', ')});
              </div>
            </div>
          )}

          {error && (
            <div className="p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs">
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-system"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={!indexName || !selectedTable || selectedColumns.length === 0 || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Creating...
              </>
            ) : (
              'Create Index'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
