import React, { useState } from 'react';
import { useAppState, createLog } from '@/store/AppState';
import { dropDatabase } from '@/services/DatabaseService';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

export default function ConfirmDropDatabaseModal() {
  const { state, dispatch } = useAppState();
  const [confirmText, setConfirmText] = useState('');
  const [isDropping, setIsDropping] = useState(false);

  const databaseName = state.activeDatabase?.name || '';
  const isConfirmed = confirmText === databaseName;

  const handleClose = () => {
    dispatch({ type: 'SET_MODAL', payload: null });
  };

  const handleDrop = async () => {
    if (!state.activeDatabase || !isConfirmed) return;

    setIsDropping(true);

    dispatch({
      type: 'ADD_LOG',
      payload: createLog('warning', `Dropping database: ${databaseName}...`),
    });

    try {
      await dropDatabase(state.activeDatabase.id);

      dispatch({ type: 'REMOVE_DATABASE', payload: state.activeDatabase.id });
      dispatch({
        type: 'ADD_LOG',
        payload: createLog('success', `Database "${databaseName}" dropped`),
      });

      handleClose();
    } catch (err) {
      dispatch({
        type: 'ADD_LOG',
        payload: createLog('error', `Failed to drop database: ${databaseName}`),
      });
    } finally {
      setIsDropping(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content w-[420px]" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-destructive" />
            <h2 className="modal-title">Drop Database</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          <div className="p-3 rounded bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-foreground mb-2">
              This action <strong>cannot be undone</strong>. This will permanently delete the database and all its data.
            </p>
            <p className="text-xs text-muted-foreground">
              All tables, views, indexes, and data will be lost.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-foreground/80">
              Type <span className="font-mono text-destructive">{databaseName}</span> to confirm
            </label>
            <input
              type="text"
              className="input-system"
              placeholder={databaseName}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isDropping}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn-system"
            onClick={handleClose}
            disabled={isDropping}
          >
            Cancel
          </button>
          <button
            className="btn-danger"
            onClick={handleDrop}
            disabled={!isConfirmed || isDropping}
          >
            {isDropping ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Dropping...
              </>
            ) : (
              'Drop Database'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
