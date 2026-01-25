import React, { forwardRef } from 'react';
import { useAppState } from '@/store/AppState';
import { 
  Terminal, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Play,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

const AICommandHistory = forwardRef<HTMLDivElement>(function AICommandHistory(_, ref) {
  const { state, dispatch } = useAppState();
  const { commandHistory } = state.ai;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executed':
        return <CheckCircle size={12} className="text-success" />;
      case 'blocked':
        return <XCircle size={12} className="text-destructive" />;
      case 'previewed':
        return <Eye size={12} className="text-warning" />;
      case 'error':
        return <AlertTriangle size={12} className="text-destructive" />;
      case 'pending':
      default:
        return <Clock size={12} className="text-muted-foreground animate-pulse" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'executed':
        return 'Executed';
      case 'blocked':
        return 'Blocked';
      case 'previewed':
        return 'Awaiting Confirmation';
      case 'error':
        return 'Error';
      case 'pending':
      default:
        return 'Processing...';
    }
  };

  const getActionBadge = (actionType?: string) => {
    switch (actionType) {
      case 'READ':
        return <span className="badge badge-read text-[10px]">READ</span>;
      case 'STRUCTURAL':
        return <span className="badge badge-structural text-[10px]">STRUCTURAL</span>;
      case 'DESTRUCTIVE':
        return <span className="badge badge-destructive text-[10px]">DESTRUCTIVE</span>;
      default:
        return null;
    }
  };

  if (commandHistory.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-4">
        <div>
          <Terminal size={32} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">No command history</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Commands will appear here as you use the AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="flex-1 overflow-auto">
      {commandHistory.map((entry) => (
        <div
          key={entry.id}
          className={`border-b border-panel-border ${
            entry.status === 'previewed' ? 'bg-warning/5' : ''
          }`}
        >
          {/* Command header */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-panel-header/50 text-xs">
            <span className="font-mono text-muted-foreground">
              {format(entry.timestamp, 'HH:mm:ss')}
            </span>
            {getStatusIcon(entry.status)}
            <span className={`${
              entry.status === 'executed' ? 'text-success' :
              entry.status === 'blocked' || entry.status === 'error' ? 'text-destructive' :
              entry.status === 'previewed' ? 'text-warning' : 'text-muted-foreground'
            }`}>
              {getStatusLabel(entry.status)}
            </span>
            {entry.executionTime && (
              <span className="text-muted-foreground ml-auto">
                {entry.executionTime}ms
              </span>
            )}
          </div>

          {/* User command */}
          <div className="px-3 py-2">
            <div className="flex items-start gap-2">
              <span className="text-primary font-mono text-sm">›</span>
              <p className="text-sm text-foreground">{entry.command}</p>
            </div>
          </div>

          {/* Generated SQL */}
          {entry.sql && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2 mb-1">
                {getActionBadge(entry.actionType)}
                <span className="text-[10px] text-muted-foreground">Generated SQL</span>
              </div>
              <pre className="sql-preview text-[11px] whitespace-pre-wrap">{entry.sql}</pre>
            </div>
          )}

          {/* Explanation */}
          {entry.explanation && (
            <div className="px-3 pb-2 text-xs text-muted-foreground">
              {entry.explanation}
            </div>
          )}

          {/* Error message */}
          {entry.errorMessage && (
            <div className="px-3 pb-2 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              <span>{entry.errorMessage}</span>
            </div>
          )}

          {/* Execution stats */}
          {entry.status === 'executed' && entry.rowsAffected !== undefined && (
            <div className="px-3 pb-2 text-[10px] text-success">
              ✓ Affected rows: {entry.rowsAffected}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

export default AICommandHistory;