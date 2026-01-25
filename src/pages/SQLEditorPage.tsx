import React, { useState } from 'react';
import { useAppState, createLog } from '@/store/AppState';
import { executeQuery, validateQuery } from '@/services/PrismAPI';
import { FileCode, Play, AlertTriangle, Loader2, Clock, RotateCcw, CheckCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function SQLEditorPage() {
  const { state, dispatch } = useAppState();
  const [sql, setSql] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    executionTime?: number;
    columns?: string[];
    rows?: Record<string, unknown>[];
    error?: string;
  } | null>(null);

  const addLog = (type: 'info' | 'warning' | 'error' | 'success', message: string) => {
    dispatch({ type: 'ADD_LOG', payload: createLog(type, message) });
  };

  const classifySql = (query: string): 'READ' | 'WRITE' | 'STRUCTURAL' | 'DESTRUCTIVE' => {
    const upper = query.trim().toUpperCase();
    if (upper.startsWith('SELECT') || upper.startsWith('SHOW') || upper.startsWith('DESCRIBE') || upper.startsWith('EXPLAIN')) {
      return 'READ';
    }
    if (upper.startsWith('INSERT') || upper.startsWith('UPDATE')) {
      return 'WRITE';
    }
    if (upper.startsWith('CREATE') || upper.startsWith('ALTER')) {
      return 'STRUCTURAL';
    }
    if (upper.startsWith('DROP') || upper.startsWith('DELETE') || upper.startsWith('TRUNCATE')) {
      return 'DESTRUCTIVE';
    }
    return 'WRITE';
  };

  const handleExecute = async () => {
    if (!sql.trim() || !state.activeDatabase) return;

    const queryType = classifySql(sql);
    
    if (queryType === 'DESTRUCTIVE') {
      addLog('warning', 'Destructive queries are blocked for safety');
      toast.warning('Destructive query blocked', {
        description: 'DROP, DELETE, and TRUNCATE are not allowed',
      });
      return;
    }

    setIsExecuting(true);
    setResult(null);
    addLog('info', `Validating ${queryType} query...`);

    try {
      // First validate the query
      const schemaForAPI = state.schema.tables.map(t => ({
        table_name: t.name,
        columns: t.columns.map(c => ({
          column_name: c.name,
          data_type: c.type,
          is_nullable: c.isNullable ? 'YES' : 'NO',
        })),
      }));

      const validationResult = await validateQuery({
        sql: sql.trim(),
        role: 'creator',
        schema: schemaForAPI,
      });

      if (!validationResult.is_valid) {
        setResult({
          success: false,
          message: validationResult.blocked_reason || 'Query validation failed',
          error: validationResult.blocked_reason,
        });
        addLog('warning', `Query blocked: ${validationResult.blocked_reason}`);
        toast.warning('Query blocked by validator', {
          description: validationResult.blocked_reason,
          icon: <Shield className="h-4 w-4" />,
        });
        setIsExecuting(false);
        return;
      }

      addLog('success', 'Query validated ✓');
      addLog('info', 'Executing query...');

      // Execute the validated query
      const execResult = await executeQuery({
        sql: validationResult.sanitized_sql || sql.trim(),
      });

      if (execResult.success) {
        setResult({
          success: true,
          message: `Query executed successfully`,
          executionTime: execResult.execution_time_ms,
          columns: execResult.columns,
          rows: execResult.rows,
        });
        addLog('success', `Query completed in ${execResult.execution_time_ms}ms • ${execResult.row_count} rows`);
        toast.success(`Query returned ${execResult.row_count} rows`, {
          description: `Executed in ${execResult.execution_time_ms}ms`,
        });
      } else {
        setResult({
          success: false,
          message: execResult.error || 'Query failed',
          error: execResult.error,
        });
        addLog('error', execResult.error || 'Query failed');
        toast.error('Query failed', { description: execResult.error });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setResult({
        success: false,
        message: errorMessage,
        error: errorMessage,
      });
      addLog('error', errorMessage);
      toast.error('Query execution error', { description: errorMessage });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClear = () => {
    setSql('');
    setResult(null);
    addLog('info', 'Editor cleared');
  };

  const queryType = sql.trim() ? classifySql(sql) : null;

  return (
    <div className="h-full flex flex-col bg-panel">
      {/* Header */}
      <div className="panel-header border-b">
        <div className="flex items-center gap-2">
          <FileCode size={16} className="text-primary" />
          <span className="panel-title">SQL Editor</span>
        </div>
        <div className="flex items-center gap-2">
          {state.activeDatabase && (
            <div className="flex items-center gap-2 text-xs">
              <span className="status-dot status-active" />
              <span>{state.activeDatabase.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-panel-header">
        <button
          className="btn-primary"
          onClick={handleExecute}
          disabled={!sql.trim() || !state.activeDatabase || isExecuting}
        >
          {isExecuting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} />
          )}
          Run
        </button>
        <button
          className="btn-system"
          onClick={handleClear}
          disabled={!sql}
        >
          <RotateCcw size={14} />
          Clear
        </button>
        <div className="flex-1" />
        {queryType && (
          <div className="flex items-center gap-2">
            {(queryType === 'STRUCTURAL' || queryType === 'DESTRUCTIVE') && (
              <AlertTriangle size={14} className={queryType === 'DESTRUCTIVE' ? 'text-destructive' : 'text-warning'} />
            )}
            {queryType === 'READ' && (
              <CheckCircle size={14} className="text-success" />
            )}
            <span className={`text-xs font-medium ${
              queryType === 'DESTRUCTIVE' ? 'text-destructive' :
              queryType === 'STRUCTURAL' ? 'text-warning' :
              queryType === 'READ' ? 'text-success' : 'text-foreground'
            }`}>
              {queryType}
            </span>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!state.activeDatabase ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileCode size={48} className="mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium mb-2">No database selected</h3>
              <p className="text-sm text-muted-foreground">
                Select or create a database to start writing queries
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0">
              <textarea
                className="w-full h-full code-editor resize-none outline-none bg-editor-bg"
                placeholder="-- Write your SQL query here
-- Example: SELECT * FROM demo_users LIMIT 10

SELECT * FROM demo_products WHERE in_stock = true LIMIT 10;"
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                spellCheck={false}
              />
            </div>

            {/* Results */}
            {result && (
              <div className="border-t max-h-[40%] overflow-auto">
                <div className="panel-header sticky top-0 bg-panel-header z-10">
                  <div className="flex items-center gap-2">
                    <span className="panel-title">Results</span>
                    {result.success && result.executionTime && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {result.executionTime}ms
                      </span>
                    )}
                  </div>
                  {result.success && result.rows && (
                    <span className="text-xs text-muted-foreground">
                      {result.rows.length} row{result.rows.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  {result.success ? (
                    result.columns && result.rows ? (
                      result.rows.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="result-table">
                            <thead>
                              <tr>
                                {result.columns.map((col) => (
                                  <th key={col}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.rows.map((row, i) => (
                                <tr key={i}>
                                  {result.columns!.map((col) => (
                                    <td key={col}>
                                      {row[col] === null ? (
                                        <span className="text-muted-foreground italic">NULL</span>
                                      ) : typeof row[col] === 'boolean' ? (
                                        <span className={row[col] ? 'text-success' : 'text-destructive'}>
                                          {String(row[col])}
                                        </span>
                                      ) : (
                                        String(row[col] ?? 'NULL')
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Query returned 0 rows
                        </p>
                      )
                    ) : (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle size={14} />
                        <span className="text-sm">{result.message}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle size={14} />
                      <span className="text-sm">{result.error || result.message}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
