import React, { useState } from 'react';
import { useAppState, createLog } from '@/store/AppState';
import { createView } from '@/services/DatabaseService';
import { X, Eye, Loader2 } from 'lucide-react';

export default function CreateViewModal() {
  const { state, dispatch } = useAppState();
  const [viewName, setViewName] = useState('');
  const [sql, setSql] = useState('SELECT ');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    dispatch({ type: 'SET_MODAL', payload: null });
  };

  const handleCreate = async () => {
    if (!viewName || viewName.length < 2) {
      setError('View name must be at least 2 characters.');
      return;
    }

    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      setError('View SQL must be a SELECT statement.');
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
      payload: createLog('info', `Creating view: ${viewName}...`),
    });

    try {
      const view = await createView({
        databaseId: state.activeDatabase.id,
        name: viewName,
        sql,
      });

      dispatch({ type: 'ADD_VIEW', payload: view });
      dispatch({
        type: 'ADD_LOG',
        payload: createLog('success', `View "${viewName}" created`),
      });

      handleClose();
    } catch (err) {
      setError('Failed to create view.');
      dispatch({
        type: 'ADD_LOG',
        payload: createLog('error', `Failed to create view: ${viewName}`),
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content w-[550px]" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-primary" />
            <h2 className="modal-title">Create View</h2>
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
              View Name
            </label>
            <input
              type="text"
              className="input-system"
              placeholder="active_users_view"
              value={viewName}
              onChange={(e) => setViewName(e.target.value.toLowerCase())}
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-foreground/80">
              SQL Query
            </label>
            <textarea
              className="input-system font-mono text-xs h-32 resize-none"
              placeholder="SELECT * FROM users WHERE active = true;"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the SELECT statement for this view
            </p>
          </div>

          {sql && (
            <div>
              <label className="block text-xs font-medium mb-1.5 text-foreground/80">
                Preview
              </label>
              <div className="sql-preview">
                <span className="sql-keyword">CREATE VIEW</span> {viewName || 'view_name'}{' '}
                <span className="sql-keyword">AS</span>
                <br />
                {sql}
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
            disabled={!viewName || !sql || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Creating...
              </>
            ) : (
              'Create View'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
