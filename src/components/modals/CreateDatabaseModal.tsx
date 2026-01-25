import React, { useState } from 'react';
import { useAppState, createLog } from '@/store/AppState';
import { provisionDatabase } from '@/services/DatabaseService';
import { X, Database, Loader2 } from 'lucide-react';

export default function CreateDatabaseModal() {
  const { state, dispatch } = useAppState();
  const [name, setName] = useState('');
  const [engine, setEngine] = useState<'mysql' | 'postgresql'>('postgresql');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    dispatch({ type: 'SET_MODAL', payload: null });
  };

  const validateName = (value: string) => {
    const regex = /^[a-z][a-z0-9_]*$/;
    return regex.test(value) && value.length >= 3 && value.length <= 32;
  };

  const handleCreate = async () => {
    if (!validateName(name)) {
      setError('Name must be 3-32 characters, start with a letter, and contain only lowercase letters, numbers, and underscores.');
      return;
    }

    if (state.databases.some((db) => db.name === name)) {
      setError('A database with this name already exists.');
      return;
    }

    setIsCreating(true);
    setError('');

    dispatch({
      type: 'ADD_LOG',
      payload: createLog('info', `Provisioning ${engine.toUpperCase()} database: ${name}...`),
    });

    try {
      const database = await provisionDatabase({ name, engine });
      
      dispatch({ type: 'ADD_DATABASE', payload: database });
      dispatch({ type: 'SET_ACTIVE_DATABASE', payload: database });
      dispatch({
        type: 'ADD_LOG',
        payload: createLog('success', `Database "${name}" provisioned successfully`),
      });
      
      handleClose();
    } catch (err) {
      setError('Failed to provision database. Please try again.');
      dispatch({
        type: 'ADD_LOG',
        payload: createLog('error', `Failed to provision database: ${name}`),
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content w-[450px]" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-primary" />
            <h2 className="modal-title">Create New Database</h2>
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
              Database Name
            </label>
            <input
              type="text"
              className="input-system"
              placeholder="my_database"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lowercase letters, numbers, and underscores only
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-foreground/80">
              Database Engine
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`p-3 rounded border text-left transition-all ${
                  engine === 'postgresql'
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-secondary hover:border-muted-foreground'
                }`}
                onClick={() => setEngine('postgresql')}
                disabled={isCreating}
              >
                <div className="font-medium text-sm">PostgreSQL</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Advanced features, JSON support
                </div>
              </button>
              <button
                className={`p-3 rounded border text-left transition-all ${
                  engine === 'mysql'
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-secondary hover:border-muted-foreground'
                }`}
                onClick={() => setEngine('mysql')}
                disabled={isCreating}
              >
                <div className="font-medium text-sm">MySQL</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Widely compatible
                </div>
              </button>
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
            disabled={!name || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Provisioning...
              </>
            ) : (
              'Create Database'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
