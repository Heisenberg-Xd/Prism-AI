import React, { useState } from 'react';
import { useAppState, createLog } from '@/store/AppState';
import { Link2, Copy, Check, Eye, EyeOff, ExternalLink, Info } from 'lucide-react';

export default function ConnectionPage() {
  const { state, dispatch } = useAppState();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const db = state.activeDatabase;

  const addLog = (type: 'info' | 'warning' | 'error' | 'success', message: string) => {
    dispatch({ type: 'ADD_LOG', payload: createLog(type, message) });
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    addLog('info', `Copied ${field} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!db) {
    return (
      <div className="h-full flex items-center justify-center bg-panel">
        <div className="text-center">
          <Link2 size={48} className="mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-2">No database selected</h3>
          <p className="text-sm text-muted-foreground">
            Select or create a database to view connection details
          </p>
        </div>
      </div>
    );
  }

  const connectionString =
    db.engine === 'postgresql'
      ? `postgresql://${db.username}:${db.password}@${db.host}:${db.port}/${db.name}`
      : `mysql://${db.username}:${db.password}@${db.host}:${db.port}/${db.name}`;

  const maskedPassword = '•'.repeat(12);

  const connectionDetails = [
    { label: 'Engine', value: db.engine.toUpperCase(), canCopy: false },
    { label: 'Host', value: db.host, canCopy: true },
    { label: 'Port', value: String(db.port), canCopy: true },
    { label: 'Database', value: db.name, canCopy: true },
    { label: 'Username', value: db.username, canCopy: true },
    {
      label: 'Password',
      value: showPassword ? db.password : maskedPassword,
      realValue: db.password,
      canCopy: true,
      isPassword: true,
    },
  ];

  return (
    <div className="h-full overflow-auto bg-panel">
      {/* Header */}
      <div className="panel-header border-b sticky top-0 bg-panel-header z-10">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-primary" />
          <span className="panel-title">Connection Details</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="status-dot status-active" />
          <span>{db.name}</span>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Status */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/30">
          <span className="status-dot status-active" />
          <div>
            <p className="text-sm font-medium text-success">Database Active</p>
            <p className="text-xs text-muted-foreground">
              Ready to accept connections
            </p>
          </div>
        </div>

        {/* Connection Details */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-panel-header">
            <h3 className="text-sm font-semibold">Connection Parameters</h3>
          </div>
          <div className="divide-y">
            {connectionDetails.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{item.value}</span>
                  {item.isPassword && (
                    <button
                      className="p-1 hover:bg-muted rounded transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={14} className="text-muted-foreground" />
                      ) : (
                        <Eye size={14} className="text-muted-foreground" />
                      )}
                    </button>
                  )}
                  {item.canCopy && (
                    <button
                      className="p-1 hover:bg-muted rounded transition-colors"
                      onClick={() =>
                        copyToClipboard(item.realValue || item.value, item.label)
                      }
                    >
                      {copiedField === item.label ? (
                        <Check size={14} className="text-success" />
                      ) : (
                        <Copy size={14} className="text-muted-foreground" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connection String */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-panel-header flex items-center justify-between">
            <h3 className="text-sm font-semibold">Connection String</h3>
            <button
              className="btn-system py-1"
              onClick={() => copyToClipboard(connectionString, 'Connection String')}
            >
              {copiedField === 'Connection String' ? (
                <>
                  <Check size={12} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="connection-string m-4">
            <code>
              DATABASE_URL=
              {showPassword
                ? connectionString
                : connectionString.replace(db.password, '********')}
            </code>
          </div>
        </div>

        {/* Code Examples */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-panel-header">
            <h3 className="text-sm font-semibold">Code Examples</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Node.js */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">Node.js</span>
              </div>
              <div className="sql-preview">
                <span className="sql-keyword">const</span> {'{'} Pool {'}'} ={' '}
                <span className="sql-function">require</span>(<span className="sql-string">'pg'</span>);
                <br />
                <br />
                <span className="sql-keyword">const</span> pool ={' '}
                <span className="sql-keyword">new</span>{' '}
                <span className="sql-function">Pool</span>({'{'}
                <br />
                {'  '}connectionString: process.env.DATABASE_URL
                <br />
                {'}'});
              </div>
            </div>

            {/* Python */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">Python</span>
              </div>
              <div className="sql-preview">
                <span className="sql-keyword">import</span> psycopg2
                <br />
                <span className="sql-keyword">import</span> os
                <br />
                <br />
                conn = psycopg2.<span className="sql-function">connect</span>(os.environ[<span className="sql-string">'DATABASE_URL'</span>])
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted border">
          <Info size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-1">Security Note</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Use this connection in your backend code only, never in frontend</li>
              <li>• Store credentials in environment variables, not in code</li>
              <li>• AI assistant uses read-only access for safety</li>
              <li>• Your app connections have full read/write access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
