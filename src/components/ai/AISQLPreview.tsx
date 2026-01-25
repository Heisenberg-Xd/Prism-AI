import React from 'react';
import { useAppState, AICommandEntry } from '@/store/AppState';
import { 
  Play, 
  X, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  Loader2,
  Table2,
  Shield,
  Trash2,
  PenLine,
  Plus,
  Eye
} from 'lucide-react';
import { OperationAnalysis, RiskLevel } from '@/services/PrismAPI';

interface AISQLPreviewProps {
  command: AICommandEntry;
  onExecute: (confirmed?: boolean) => void;
  onCancel: () => void;
  operationAnalysis?: OperationAnalysis;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  safe: 'text-success',
  moderate: 'text-warning',
  high: 'text-orange-500',
  critical: 'text-destructive',
};

const RISK_BG_COLORS: Record<RiskLevel, string> = {
  safe: 'bg-success/10 border-success/30',
  moderate: 'bg-warning/10 border-warning/30',
  high: 'bg-orange-500/10 border-orange-500/30',
  critical: 'bg-destructive/10 border-destructive/30',
};

const OPERATION_ICONS: Record<string, React.ReactNode> = {
  SELECT: <Eye size={14} />,
  INSERT: <Plus size={14} />,
  UPDATE: <PenLine size={14} />,
  DELETE: <Trash2 size={14} />,
};

export default function AISQLPreview({ command, onExecute, onCancel, operationAnalysis }: AISQLPreviewProps) {
  const { state } = useAppState();

  if (!command.sql) {
    return null;
  }

  const analysis = operationAnalysis || command.operationAnalysis;
  const riskLevel = analysis?.risk_level || 'safe';
  const opType = analysis?.operation_type || 'SELECT';
  const requiresConfirmation = analysis?.requires_confirmation || false;

  const getOperationBadge = () => {
    const icon = OPERATION_ICONS[opType] || <Info size={14} />;
    const colorClass = RISK_COLORS[riskLevel];
    
    return (
      <div className={`flex items-center gap-2 ${colorClass}`}>
        {icon}
        <span className={`badge badge-${opType.toLowerCase()}`}>{opType}</span>
        <span className="text-xs">
          Risk: {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
        </span>
      </div>
    );
  };

  // Parse SQL to show affected tables
  const extractTables = (sql: string): string[] => {
    const tables: string[] = [];
    const patterns = [
      /FROM\s+(\w+)/gi,
      /JOIN\s+(\w+)/gi,
      /INTO\s+(\w+)/gi,
      /UPDATE\s+(\w+)/gi,
      /TABLE\s+(\w+)/gi,
    ];
    
    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(sql)) !== null) {
        if (!tables.includes(match[1].toLowerCase())) {
          tables.push(match[1]);
        }
      }
    });
    
    return tables;
  };

  const affectedTables = analysis?.affected_tables || extractTables(command.sql);

  return (
    <div className="border-t bg-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-panel-header border-b">
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/70">
          SQL Preview
        </span>
        {getOperationBadge()}
      </div>

      {/* SQL code */}
      <div className="p-3">
        <pre className="sql-preview whitespace-pre-wrap text-xs">{command.sql}</pre>
      </div>

      {/* Analysis */}
      <div className="px-3 pb-3 space-y-2">
        {/* Explanation */}
        {command.explanation && (
          <div className="flex items-start gap-2 text-xs p-2 rounded bg-muted/50">
            <Info size={14} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">AI Explanation:</span>
              <p className="text-muted-foreground mt-0.5">{command.explanation}</p>
            </div>
          </div>
        )}

        {/* Affected tables */}
        {affectedTables.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Table2 size={12} />
            <span>Tables involved:</span>
            <div className="flex gap-1">
              {affectedTables.map((table) => (
                <span
                  key={table}
                  className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-mono"
                >
                  {table}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Estimated rows for writes */}
        {analysis && opType !== 'SELECT' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield size={12} />
            <span>Estimated rows affected:</span>
            <span className={`font-medium ${RISK_COLORS[riskLevel]}`}>
              {analysis.estimated_rows}
            </span>
          </div>
        )}

        {/* Risk warnings */}
        {analysis && analysis.warnings.length > 0 && riskLevel !== 'safe' && (
          <div className={`flex items-start gap-2 text-xs p-2 rounded border ${RISK_BG_COLORS[riskLevel]}`}>
            <AlertTriangle size={14} className={`flex-shrink-0 mt-0.5 ${RISK_COLORS[riskLevel]}`} />
            <div>
              <span className="font-medium">
                {riskLevel === 'critical' ? '⚠️ Critical Warning' : 'Warning'}
              </span>
              <ul className="text-muted-foreground mt-0.5 space-y-0.5">
                {analysis.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Confirmation notice for write operations */}
        {requiresConfirmation && (
          <div className="flex items-start gap-2 text-xs p-2 rounded bg-primary/10 border border-primary/30">
            <Shield size={14} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-primary">Confirmation Required</span>
              <p className="text-muted-foreground mt-0.5">
                This {opType} operation will modify your database. Please review carefully before confirming.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 py-2 bg-panel-header border-t">
        <button
          className={requiresConfirmation ? 'btn-warning' : 'btn-primary'}
          onClick={() => onExecute(requiresConfirmation)}
          disabled={state.ai.isProcessing}
        >
          {state.ai.isProcessing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : requiresConfirmation ? (
            <Shield size={14} />
          ) : (
            <Play size={14} />
          )}
          {requiresConfirmation ? 'Confirm & Execute' : 'Execute'}
        </button>
        <button
          className="btn-system"
          onClick={onCancel}
          disabled={state.ai.isProcessing}
        >
          <X size={14} />
          Cancel
        </button>

        {!requiresConfirmation && opType === 'SELECT' && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Press Enter to execute
          </span>
        )}
        
        {requiresConfirmation && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Role: Creator • {opType} operation
          </span>
        )}
      </div>
    </div>
  );
}