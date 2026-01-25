import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '@/store/AppState';
import { X, Trash2, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

type TabType = 'output' | 'logs' | 'errors';

export default function OutputPanel() {
  const { state, dispatch } = useAppState();
  const [activeTab, setActiveTab] = useState<TabType>('logs');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.logs]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info size={12} className="text-output-info" />;
      case 'warning':
        return <AlertTriangle size={12} className="text-output-warning" />;
      case 'error':
        return <AlertCircle size={12} className="text-output-error" />;
      case 'success':
        return <CheckCircle size={12} className="text-output-success" />;
      default:
        return null;
    }
  };

  const filteredLogs = activeTab === 'errors' 
    ? state.logs.filter((log) => log.type === 'error' || log.type === 'warning')
    : state.logs;

  const errorCount = state.logs.filter((log) => log.type === 'error').length;
  const warningCount = state.logs.filter((log) => log.type === 'warning').length;

  return (
    <div className="panel output-panel h-full border-t">
      <div className="panel-header">
        <div className="flex items-center gap-1">
          <button
            className={`px-3 py-0.5 text-xs rounded transition-colors ${
              activeTab === 'output' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('output')}
          >
            Output
          </button>
          <button
            className={`px-3 py-0.5 text-xs rounded transition-colors ${
              activeTab === 'logs' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('logs')}
          >
            Logs ({state.logs.length})
          </button>
          <button
            className={`px-3 py-0.5 text-xs rounded transition-colors flex items-center gap-1 ${
              activeTab === 'errors' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('errors')}
          >
            Errors
            {errorCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-destructive text-destructive-foreground">
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-warning text-warning-foreground">
                {warningCount}
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-muted rounded transition-colors"
            onClick={() => dispatch({ type: 'CLEAR_LOGS' })}
            title="Clear logs"
          >
            <Trash2 size={14} className="text-muted-foreground" />
          </button>
          <button
            className="p-1 hover:bg-muted rounded transition-colors"
            onClick={() => dispatch({ type: 'TOGGLE_PANEL', payload: 'output' })}
            title="Close panel"
          >
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="panel-content">
        {activeTab === 'output' && (
          <div className="p-3 text-xs text-muted-foreground">
            Ready. Create or select a database to begin.
          </div>
        )}
        {(activeTab === 'logs' || activeTab === 'errors') && (
          <>
            {filteredLogs.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground italic">
                No {activeTab === 'errors' ? 'errors or warnings' : 'logs'} yet.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className={`log-entry log-${log.type}`}>
                  <span className="log-timestamp">[{formatTime(log.timestamp)}]</span>
                  <span className="flex items-center gap-1">
                    {getIcon(log.type)}
                  </span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
