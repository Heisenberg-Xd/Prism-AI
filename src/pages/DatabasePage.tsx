import React from 'react';
import { useAppState } from '@/store/AppState';
import { Database, Table2, Eye, KeyRound, HardDrive, Clock, Server } from 'lucide-react';

export default function DatabasePage() {
  const { state } = useAppState();
  const db = state.activeDatabase;

  if (!db) {
    return (
      <div className="h-full flex items-center justify-center bg-panel">
        <div className="text-center">
          <Database size={48} className="mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-2">No database selected</h3>
          <p className="text-sm text-muted-foreground">
            Select or create a database from the sidebar
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Tables',
      value: state.schema.tables.length,
      icon: <Table2 size={20} />,
      color: 'text-primary',
    },
    {
      label: 'Views',
      value: state.schema.views.length,
      icon: <Eye size={20} />,
      color: 'text-syntax-function',
    },
    {
      label: 'Indexes',
      value: state.schema.indexes.length,
      icon: <KeyRound size={20} />,
      color: 'text-warning',
    },
  ];

  return (
    <div className="h-full overflow-auto bg-panel">
      {/* Header */}
      <div className="panel-header border-b sticky top-0 bg-panel-header z-10">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-primary" />
          <span className="panel-title">Database Overview</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="status-dot status-active" />
          <span>{db.name}</span>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Database Info Card */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">{db.name}</h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Server size={14} />
                    <span>{db.engine.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>Created {db.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="status-dot status-active" />
                <span className="text-sm text-success font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="border rounded-lg bg-card p-4 flex items-center gap-4"
            >
              <div className={`${stat.color}`}>{stat.icon}</div>
              <div>
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Tables */}
        {state.schema.tables.length > 0 && (
          <div className="border rounded-lg bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-panel-header">
              <h3 className="text-sm font-semibold">Tables</h3>
            </div>
            <div className="divide-y">
              {state.schema.tables.slice(0, 5).map((table) => (
                <div
                  key={table.name}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Table2 size={14} className="text-muted-foreground" />
                    <span className="text-sm font-medium">{table.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {table.columns.length} columns
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-panel-header">
            <h3 className="text-sm font-semibold">Quick Actions</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <button
              className="btn-system justify-start"
              onClick={() => {
                // This would navigate to create table modal
              }}
            >
              <Table2 size={14} />
              Create Table
            </button>
            <button
              className="btn-system justify-start"
              onClick={() => {
                // This would navigate to SQL editor
              }}
            >
              <HardDrive size={14} />
              Run SQL Query
            </button>
          </div>
        </div>

        {/* Connection Info Summary */}
        <div className="border rounded-lg bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Connection</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {db.host}:{db.port}
              </p>
            </div>
            <button className="btn-system py-1">
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
