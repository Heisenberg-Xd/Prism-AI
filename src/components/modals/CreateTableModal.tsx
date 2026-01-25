import React, { useState } from 'react';
import { useAppState, createLog, Column } from '@/store/AppState';
import { createTable } from '@/services/DatabaseService';
import { X, Table2, Plus, Trash2, Loader2 } from 'lucide-react';

const DATA_TYPES = [
  'INT',
  'BIGINT',
  'SERIAL',
  'VARCHAR(255)',
  'TEXT',
  'BOOLEAN',
  'DATE',
  'TIMESTAMP',
  'DECIMAL(10,2)',
  'JSON',
  'UUID',
];

export default function CreateTableModal() {
  const { state, dispatch } = useAppState();
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<Column[]>([
    { name: 'id', type: 'SERIAL', isPrimaryKey: true, isNullable: false },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    dispatch({ type: 'SET_MODAL', payload: null });
  };

  const addColumn = () => {
    setColumns([
      ...columns,
      { name: '', type: 'VARCHAR(255)', isPrimaryKey: false, isNullable: true },
    ]);
  };

  const removeColumn = (index: number) => {
    if (columns.length > 1) {
      setColumns(columns.filter((_, i) => i !== index));
    }
  };

  const updateColumn = (index: number, updates: Partial<Column>) => {
    setColumns(
      columns.map((col, i) => (i === index ? { ...col, ...updates } : col))
    );
  };

  const validateTableName = (value: string) => {
    const regex = /^[a-z][a-z0-9_]*$/;
    return regex.test(value) && value.length >= 2 && value.length <= 64;
  };

  const handleCreate = async () => {
    if (!validateTableName(tableName)) {
      setError('Table name must be 2-64 characters, start with a letter, lowercase only.');
      return;
    }

    if (!state.activeDatabase) {
      setError('No database selected.');
      return;
    }

    const invalidColumns = columns.filter((col) => !col.name || !col.type);
    if (invalidColumns.length > 0) {
      setError('All columns must have a name and type.');
      return;
    }

    setIsCreating(true);
    setError('');

    dispatch({
      type: 'ADD_LOG',
      payload: createLog('info', `Creating table: ${tableName}...`),
    });

    try {
      const table = await createTable({
        databaseId: state.activeDatabase.id,
        name: tableName,
        columns,
      });

      dispatch({ type: 'ADD_TABLE', payload: table });
      dispatch({
        type: 'ADD_LOG',
        payload: createLog('success', `Table "${tableName}" created with ${columns.length} column(s)`),
      });

      handleClose();
    } catch (err) {
      setError('Failed to create table.');
      dispatch({
        type: 'ADD_LOG',
        payload: createLog('error', `Failed to create table: ${tableName}`),
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content w-[600px]" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Table2 size={16} className="text-primary" />
            <h2 className="modal-title">Create Table</h2>
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
              Table Name
            </label>
            <input
              type="text"
              className="input-system"
              placeholder="users"
              value={tableName}
              onChange={(e) => setTableName(e.target.value.toLowerCase())}
              disabled={isCreating}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-foreground/80">
                Columns
              </label>
              <button
                className="btn-system py-1"
                onClick={addColumn}
                disabled={isCreating}
              >
                <Plus size={12} />
                Add Column
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {columns.map((col, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded bg-secondary"
                >
                  <input
                    type="text"
                    className="input-system flex-1"
                    placeholder="column_name"
                    value={col.name}
                    onChange={(e) =>
                      updateColumn(index, { name: e.target.value.toLowerCase() })
                    }
                    disabled={isCreating}
                  />
                  <select
                    className="input-system w-32"
                    value={col.type}
                    onChange={(e) => updateColumn(index, { type: e.target.value })}
                    disabled={isCreating}
                  >
                    {DATA_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={col.isPrimaryKey}
                      onChange={(e) =>
                        updateColumn(index, { isPrimaryKey: e.target.checked })
                      }
                      disabled={isCreating}
                    />
                    PK
                  </label>
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={col.isNullable}
                      onChange={(e) =>
                        updateColumn(index, { isNullable: e.target.checked })
                      }
                      disabled={isCreating}
                    />
                    Null
                  </label>
                  <button
                    className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-destructive"
                    onClick={() => removeColumn(index)}
                    disabled={columns.length === 1 || isCreating}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

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
            disabled={!tableName || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Creating...
              </>
            ) : (
              'Create Table'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
