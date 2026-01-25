import React from 'react';
import { useAppState } from '@/store/AppState';
import { Database, Cpu, Sparkles, Terminal } from 'lucide-react';

export default function AIContextIndicator() {
  const { state, dispatch } = useAppState();

  const toggleMode = () => {
    dispatch({
      type: 'SET_AI_MODE',
      payload: state.ai.mode === 'AI' ? 'SQL' : 'AI',
    });
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-panel-header border-b text-xs">
      {/* Database connection */}
      <div className="flex items-center gap-2">
        <Database size={14} className={state.activeDatabase ? 'text-success' : 'text-muted-foreground'} />
        {state.activeDatabase ? (
          <>
            <span className="font-medium">{state.activeDatabase.name}</span>
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] uppercase font-medium">
              {state.activeDatabase.engine}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground italic">No database</span>
        )}
      </div>

      <span className="text-muted-foreground">|</span>

      {/* Schema stats */}
      {state.activeDatabase && (
        <>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>{state.schema.tables.length} tables</span>
            <span>{state.schema.views.length} views</span>
            <span>{state.schema.indexes.length} indexes</span>
          </div>

          <span className="text-muted-foreground">|</span>
        </>
      )}

      {/* Mode toggle */}
      <div className="flex items-center gap-1 ml-auto">
        <span className="text-muted-foreground">Mode:</span>
        <button
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            state.ai.mode === 'AI'
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onClick={() => dispatch({ type: 'SET_AI_MODE', payload: 'AI' })}
        >
          <Sparkles size={12} />
          AI
        </button>
        <button
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            state.ai.mode === 'SQL'
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onClick={() => dispatch({ type: 'SET_AI_MODE', payload: 'SQL' })}
        >
          <Terminal size={12} />
          SQL
        </button>
      </div>

      {/* Processing indicator */}
      {state.ai.isProcessing && (
        <>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-2 text-primary">
            <Cpu size={12} className="animate-pulse" />
            <span>Processing...</span>
          </div>
        </>
      )}
    </div>
  );
}