import React, { useState, useRef, useEffect } from 'react';
import { useAppState, createLog, createAICommand } from '@/store/AppState';
import { 
  generateQuery, 
  validateQuery, 
  executeQuery,
  type SchemaTable,
} from '@/services/PrismAPI';
import { 
  Sparkles, 
  Send, 
  Play, 
  AlertTriangle, 
  Loader2,
  Terminal,
  Trash2,
  Shield,
  CheckCircle2,
  Database
} from 'lucide-react';
import AIContextIndicator from '@/components/ai/AIContextIndicator';
import AICommandHistory from '@/components/ai/AICommandHistory';
import AISQLPreview from '@/components/ai/AISQLPreview';
import AIQueryResults from '@/components/ai/AIQueryResults';
import { toast } from 'sonner';

export default function AICommandPage() {
  const { state, dispatch } = useAppState();
  const [input, setInput] = useState('');
  const [lastResult, setLastResult] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    executionTime: number;
    warning?: string;
    error?: string;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to bottom when new command is added or active command changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [state.ai.commandHistory, state.ai.activeCommand]);

  // Auto-create a demo database if none exists
  useEffect(() => {
    if (!state.activeDatabase && state.databases.length === 0) {
      const demoDb = {
        id: 'demo-db-1',
        name: 'prism_demo',
        engine: 'postgresql' as const,
        status: 'active' as const,
        createdAt: new Date(),
        host: 'db.prism-ai.cloud',
        port: 5432,
        username: 'prism_user',
        password: 'demo_password',
      };
      dispatch({ type: 'ADD_DATABASE', payload: demoDb });
      dispatch({ type: 'SET_ACTIVE_DATABASE', payload: demoDb });
      
      // Add demo tables to schema
      const demoTables = [
        {
          name: 'demo_users',
          databaseId: demoDb.id,
          columns: [
            { name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false },
            { name: 'email', type: 'varchar', isPrimaryKey: false, isNullable: false },
            { name: 'name', type: 'varchar', isPrimaryKey: false, isNullable: true },
            { name: 'status', type: 'varchar', isPrimaryKey: false, isNullable: true },
            { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isNullable: false },
          ],
        },
        {
          name: 'demo_orders',
          databaseId: demoDb.id,
          columns: [
            { name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false },
            { name: 'user_id', type: 'uuid', isPrimaryKey: false, isNullable: true },
            { name: 'total_amount', type: 'numeric', isPrimaryKey: false, isNullable: false },
            { name: 'status', type: 'varchar', isPrimaryKey: false, isNullable: false },
            { name: 'created_at', type: 'timestamp', isPrimaryKey: false, isNullable: false },
          ],
        },
        {
          name: 'demo_products',
          databaseId: demoDb.id,
          columns: [
            { name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false },
            { name: 'name', type: 'varchar', isPrimaryKey: false, isNullable: false },
            { name: 'price', type: 'numeric', isPrimaryKey: false, isNullable: false },
            { name: 'category', type: 'varchar', isPrimaryKey: false, isNullable: true },
            { name: 'in_stock', type: 'boolean', isPrimaryKey: false, isNullable: false },
          ],
        },
      ];
      
      demoTables.forEach(table => {
        dispatch({ type: 'ADD_TABLE', payload: table });
      });
    }
  }, [state.activeDatabase, state.databases.length, dispatch]);

  const addLog = (type: 'info' | 'warning' | 'error' | 'success', message: string) => {
    dispatch({ type: 'ADD_LOG', payload: createLog(type, message) });
  };

  const handleSubmit = async () => {
    if (!input.trim() || state.ai.isProcessing) return;

    if (!state.activeDatabase) {
      addLog('warning', 'No database selected. Create or select a database first.');
      return;
    }

    const command = input.trim();
    setInput('');
    setLastResult(null);
    
    // Create command entry
    const commandEntry = createAICommand(command);
    dispatch({ type: 'ADD_AI_COMMAND', payload: commandEntry });
    dispatch({ type: 'SET_AI_PROCESSING', payload: true });
    
    addLog('info', `Processing: "${command.substring(0, 50)}${command.length > 50 ? '...' : ''}"`);

    try {
      // Convert app schema to PrismAPI format
      const schemaForAPI: SchemaTable[] = state.schema.tables.map(t => ({
        table_name: t.name,
        columns: t.columns.map(c => ({
          column_name: c.name,
          data_type: c.type,
          is_nullable: c.isNullable ? 'YES' : 'NO',
        })),
      }));

      // Use AI or direct SQL based on mode
      if (state.ai.mode === 'AI') {
        // Step 1: Generate SQL using AI
        const generateResult = await generateQuery({
          user_question: command,
          role: 'creator',
          schema: { tables: schemaForAPI },
        });

        if (!generateResult.sql || generateResult.error) {
          dispatch({
            type: 'UPDATE_AI_COMMAND',
            payload: {
              id: commandEntry.id,
              updates: {
                status: 'error',
                errorMessage: generateResult.explanation,
              },
            },
          });
          addLog('warning', generateResult.explanation);
          toast.error('Could not generate query', { description: generateResult.explanation });
          return;
        }

        // Step 2: Validate the generated SQL
        const validateResult = await validateQuery({
          sql: generateResult.sql,
          role: 'creator',
          schema: schemaForAPI,
        });

        if (!validateResult.is_valid) {
          dispatch({
            type: 'UPDATE_AI_COMMAND',
            payload: {
              id: commandEntry.id,
              updates: {
                sql: generateResult.sql,
                explanation: generateResult.explanation,
                actionType: generateResult.action_type === 'UNKNOWN' ? 'READ' : generateResult.action_type as 'READ' | 'WRITE' | 'STRUCTURAL' | 'DESTRUCTIVE',
                status: 'blocked',
                errorMessage: validateResult.blocked_reason,
              },
            },
          });
          addLog('warning', `Query blocked: ${validateResult.blocked_reason}`);
          toast.warning('Query blocked by validator', { 
            description: validateResult.blocked_reason,
            icon: <Shield className="h-4 w-4" />
          });
          return;
        }

        // Map action type
        const actionType = (generateResult.action_type === 'UNKNOWN' ? 'READ' : generateResult.action_type) as 'READ' | 'WRITE' | 'STRUCTURAL' | 'DESTRUCTIVE';
        
        // Update command with validated results
        const finalSQL = validateResult.sanitized_sql || generateResult.sql;
        dispatch({
          type: 'UPDATE_AI_COMMAND',
          payload: {
            id: commandEntry.id,
            updates: {
              sql: finalSQL,
              explanation: generateResult.explanation,
              actionType,
              status: 'previewed',
              operationAnalysis: generateResult.operation_analysis,
            },
          },
        });
        dispatch({ 
          type: 'SET_ACTIVE_AI_COMMAND', 
          payload: { 
            ...commandEntry, 
            sql: finalSQL, 
            explanation: generateResult.explanation,
            actionType, 
            status: 'previewed',
            operationAnalysis: generateResult.operation_analysis,
          } 
        });
        
        addLog('success', `Generated ${generateResult.action_type} query (validated ✓)`);
        toast.success('Query generated & validated', {
          description: `${generateResult.confidence} confidence • ${validateResult.checks_performed.length} security checks passed`,
          icon: <CheckCircle2 className="h-4 w-4" />
        });

      } else {
        // SQL mode - validate before preview
        const validateResult = await validateQuery({
          sql: command,
          role: 'creator',
          schema: schemaForAPI,
        });

        if (!validateResult.is_valid) {
          dispatch({
            type: 'UPDATE_AI_COMMAND',
            payload: {
              id: commandEntry.id,
              updates: {
                sql: command,
                status: 'blocked',
                errorMessage: validateResult.blocked_reason,
              },
            },
          });
          addLog('warning', `Query blocked: ${validateResult.blocked_reason}`);
          toast.warning('Query blocked', { description: validateResult.blocked_reason });
          return;
        }

        const sqlUpper = command.toUpperCase().trim();
        let actionType: 'READ' | 'WRITE' | 'STRUCTURAL' | 'DESTRUCTIVE' = 'READ';
        
        if (sqlUpper.startsWith('INSERT') || sqlUpper.startsWith('UPDATE')) {
          actionType = 'WRITE';
        } else if (sqlUpper.startsWith('CREATE') || sqlUpper.startsWith('ALTER')) {
          actionType = 'STRUCTURAL';
        } else if (sqlUpper.startsWith('DROP') || sqlUpper.startsWith('DELETE') || sqlUpper.startsWith('TRUNCATE')) {
          actionType = 'DESTRUCTIVE';
        }

        dispatch({
          type: 'UPDATE_AI_COMMAND',
          payload: {
            id: commandEntry.id,
            updates: {
              sql: validateResult.sanitized_sql || command,
              actionType,
              status: 'previewed',
            },
          },
        });
        dispatch({ 
          type: 'SET_ACTIVE_AI_COMMAND', 
          payload: { 
            ...commandEntry, 
            sql: validateResult.sanitized_sql || command, 
            actionType, 
            status: 'previewed' 
          } 
        });
        
        addLog('info', `SQL validated and ready (${actionType})`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process command';
      dispatch({
        type: 'UPDATE_AI_COMMAND',
        payload: {
          id: commandEntry.id,
          updates: {
            status: 'error',
            errorMessage,
          },
        },
      });
      addLog('error', errorMessage);
      toast.error('Processing failed', { description: errorMessage });
    } finally {
      dispatch({ type: 'SET_AI_PROCESSING', payload: false });
    }
  };

  const handleExecute = async (confirmed: boolean = false) => {
    const activeCmd = state.ai.activeCommand;
    if (!activeCmd || !activeCmd.sql || !state.activeDatabase) return;

    dispatch({ type: 'SET_AI_PROCESSING', payload: true });
    addLog('info', 'Executing SQL against database...');

    try {
      // Pass confirmed: true for write operations that require confirmation
      const requiresConfirmation = activeCmd.operationAnalysis?.requires_confirmation || 
        activeCmd.actionType !== 'READ';
      
      const result = await executeQuery({
        sql: activeCmd.sql,
        role: 'creator',
        confirmed: confirmed || requiresConfirmation,
      });

      if (result.success) {
        // Store results for display
        setLastResult({
          columns: result.columns,
          rows: result.rows,
          rowCount: result.row_count,
          executionTime: result.execution_time_ms,
          warning: result.warning,
        });

        dispatch({
          type: 'UPDATE_AI_COMMAND',
          payload: {
            id: activeCmd.id,
            updates: {
              status: 'executed',
              executionTime: result.execution_time_ms,
              rowsAffected: result.row_count,
              resultColumns: result.columns,
              resultRows: result.rows,
            },
          },
        });
        dispatch({ type: 'SET_ACTIVE_AI_COMMAND', payload: null });
        
        addLog('success', `Query executed in ${result.execution_time_ms}ms. Rows: ${result.row_count}`);
        
        toast.success(`Query returned ${result.row_count} row(s)`, {
          description: `Executed in ${result.execution_time_ms}ms`,
          duration: 3000,
        });
      } else {
        setLastResult({
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime: result.execution_time_ms,
          error: result.error,
        });

        dispatch({
          type: 'UPDATE_AI_COMMAND',
          payload: {
            id: activeCmd.id,
            updates: {
              status: 'error',
              errorMessage: result.error || 'Execution failed',
            },
          },
        });
        addLog('error', `Query failed: ${result.error}`);
        toast.error('Execution failed', { description: result.error });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Execution failed';
      setLastResult({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: errorMessage,
      });

      dispatch({
        type: 'UPDATE_AI_COMMAND',
        payload: {
          id: activeCmd.id,
          updates: {
            status: 'error',
            errorMessage,
          },
        },
      });
      addLog('error', errorMessage);
      toast.error('Execution failed', { description: errorMessage });
    } finally {
      dispatch({ type: 'SET_AI_PROCESSING', payload: false });
    }
  };

  const handleCancel = () => {
    const activeCmd = state.ai.activeCommand;
    if (activeCmd) {
      dispatch({
        type: 'UPDATE_AI_COMMAND',
        payload: {
          id: activeCmd.id,
          updates: { status: 'blocked' },
        },
      });
    }
    dispatch({ type: 'SET_ACTIVE_AI_COMMAND', payload: null });
    addLog('info', 'Command cancelled');
  };

  const handleClearHistory = () => {
    dispatch({ type: 'CLEAR_AI_COMMANDS' });
    setLastResult(null);
    addLog('info', 'Command history cleared');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (state.ai.activeCommand && state.ai.activeCommand.status === 'previewed' && state.ai.activeCommand.actionType === 'READ') {
        handleExecute(false);
      } else if (!state.ai.activeCommand) {
        handleSubmit();
      }
    }
  };

  const suggestions = [
    'Show all users',
    'Show products in stock',
    'List all orders with status pending',
    'Count total orders by status',
  ];

  return (
    <div className="h-full flex flex-col bg-panel">
      {/* Header */}
      <div className="panel-header border-b">
        <div className="flex items-center gap-2">
          {state.ai.mode === 'AI' ? (
            <Sparkles size={16} className="text-primary" />
          ) : (
            <Terminal size={16} className="text-primary" />
          )}
          <span className="panel-title">
            {state.ai.mode === 'AI' ? 'AI Command Console' : 'SQL Terminal'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {state.ai.commandHistory.length > 0 && (
            <button 
              className="btn-system py-1 text-xs"
              onClick={handleClearHistory}
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Context indicator */}
      <AIContextIndicator />

      {/* Database connected indicator */}
      {state.activeDatabase && (
        <div className="flex items-center gap-2 px-3 py-2 bg-success/5 border-b border-success/20">
          <Database size={14} className="text-success" />
          <span className="text-xs text-success font-medium">
            Connected to {state.activeDatabase.name}
          </span>
          <span className="text-xs text-muted-foreground">
            • {state.schema.tables.length} tables
          </span>
        </div>
      )}

      {/* No database warning */}
      {!state.activeDatabase && (
        <div className="flex items-center gap-3 m-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
          <AlertTriangle size={18} className="text-warning flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">No database selected</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a new database or select an existing one from the sidebar.
            </p>
          </div>
        </div>
      )}

      {/* Main content area - scrollable */}
      <div ref={contentRef} className="flex-1 flex flex-col overflow-auto">
        {/* Command history */}
        {state.ai.commandHistory.length === 0 && state.activeDatabase ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <Terminal size={48} className="mx-auto text-primary/40 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {state.ai.mode === 'AI' ? 'AI Command Console' : 'SQL Terminal'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {state.ai.mode === 'AI'
                  ? 'Type natural language commands to interact with your database. I\'ll generate the SQL for you.'
                  : 'Enter SQL queries directly. They will be previewed before execution.'}
              </p>
              {state.ai.mode === 'AI' && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      className="px-3 py-1.5 text-xs rounded bg-secondary hover:bg-muted border border-border transition-colors"
                      onClick={() => setInput(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <AICommandHistory />
        )}

        {/* SQL Preview (when a command is being previewed) */}
        {state.ai.activeCommand && state.ai.activeCommand.status === 'previewed' && (
          <AISQLPreview
            command={state.ai.activeCommand}
            onExecute={handleExecute}
            onCancel={handleCancel}
          />
        )}

        {/* Query Results */}
        {lastResult && !state.ai.activeCommand && (
          <AIQueryResults
            columns={lastResult.columns}
            rows={lastResult.rows}
            rowCount={lastResult.rowCount}
            executionTime={lastResult.executionTime}
            warning={lastResult.warning}
            error={lastResult.error}
          />
        )}
      </div>

      {/* Input area */}
      <div className="border-t p-3 bg-panel-header">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-mono">
              {state.ai.mode === 'AI' ? '>' : '$'}
            </span>
            <textarea
              ref={inputRef}
              className="input-system w-full pl-7 pr-3 py-2 resize-none font-mono text-sm"
              placeholder={
                !state.activeDatabase
                  ? 'Select a database to start...'
                  : state.ai.mode === 'AI'
                  ? 'Ask me anything about your data...'
                  : 'Enter SQL query...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={!state.activeDatabase || state.ai.isProcessing}
            />
          </div>
          <button
            className="btn-primary self-end"
            onClick={handleSubmit}
            disabled={!input.trim() || !state.activeDatabase || state.ai.isProcessing}
          >
            {state.ai.isProcessing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
          <span>
            Enter to send • Shift+Enter for new line
          </span>
          <span>
            {state.ai.commandHistory.length} command{state.ai.commandHistory.length !== 1 ? 's' : ''} in history
          </span>
        </div>
      </div>
    </div>
  );
}
