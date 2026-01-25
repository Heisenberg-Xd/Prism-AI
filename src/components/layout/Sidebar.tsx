import React, { useState } from 'react';
import { useAppState, createLog } from '@/store/AppState';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Database,
  Table2,
  Eye,
  KeyRound,
  FunctionSquare,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreVertical,
  Folder,
  FolderOpen,
  Sparkles,
  TerminalSquare,
  Columns,
  Link,
  Settings,
} from 'lucide-react';

interface TreeNodeProps {
  label: string;
  icon: React.ReactNode;
  iconOpen?: React.ReactNode;
  depth?: number;
  isExpanded?: boolean;
  isSelected?: boolean;
  hasChildren?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  onAction?: () => void;
  children?: React.ReactNode;
}

function TreeNode({
  label,
  icon,
  iconOpen,
  depth = 0,
  isExpanded = false,
  isSelected = false,
  hasChildren = false,
  onToggle,
  onClick,
  onAction,
  children,
}: TreeNodeProps) {
  return (
    <div>
      <div
        className={`tree-item group ${isSelected ? 'selected' : ''}`}
        style={{ '--depth': depth } as React.CSSProperties}
        onClick={onClick}
      >
        {hasChildren ? (
          <button
            className="w-4 h-4 flex items-center justify-center hover:bg-muted rounded"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
          >
            {isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="tree-icon">
          {isExpanded && iconOpen ? iconOpen : icon}
        </span>
        <span className="flex-1 truncate">{label}</span>
        {onAction && (
          <button
            className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted rounded"
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
          >
            <Plus size={12} />
          </button>
        )}
      </div>
      {isExpanded && children && (
        <div className="tree-children">{children}</div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    databases: true,
    tables: true,
    views: false,
    indexes: false,
    functions: false,
  });

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addLog = (type: 'info' | 'warning' | 'error' | 'success', message: string) => {
    dispatch({ type: 'ADD_LOG', payload: createLog(type, message) });
  };

  const handleDatabaseSelect = (db: typeof state.databases[0]) => {
    dispatch({ type: 'SET_ACTIVE_DATABASE', payload: db });
    addLog('info', `Selected database: ${db.name}`);
    navigate('/database');
  };

  const handleCreateTable = () => {
    if (!state.activeDatabase) {
      addLog('warning', 'Select a database first');
      return;
    }
    dispatch({ type: 'SET_MODAL', payload: 'create-table' });
  };

  const handleCreateView = () => {
    if (!state.activeDatabase) {
      addLog('warning', 'Select a database first');
      return;
    }
    dispatch({ type: 'SET_MODAL', payload: 'create-view' });
  };

  const handleCreateIndex = () => {
    if (!state.activeDatabase) {
      addLog('warning', 'Select a database first');
      return;
    }
    dispatch({ type: 'SET_MODAL', payload: 'create-index' });
  };

  return (
    <div className="panel h-full border-r flex flex-col">
      <div className="panel-header">
        <span className="panel-title">Explorer</span>
      </div>
      <div className="flex-1 panel-content py-1 overflow-auto">
        {/* Databases */}
        <TreeNode
          label="Databases"
          icon={<Folder size={14} />}
          iconOpen={<FolderOpen size={14} />}
          isExpanded={expanded.databases}
          hasChildren
          onToggle={() => toggleExpand('databases')}
          onAction={() => dispatch({ type: 'SET_MODAL', payload: 'create-database' })}
        >
          {state.databases.length === 0 ? (
            <div
              className="tree-item text-muted-foreground italic"
              style={{ '--depth': 1 } as React.CSSProperties}
            >
              <span className="w-4" />
              No databases
            </div>
          ) : (
            state.databases.map((db) => (
              <TreeNode
                key={db.id}
                label={db.name}
                icon={<Database size={14} className={db.status === 'active' ? 'text-success' : 'text-warning'} />}
                depth={1}
                isSelected={state.activeDatabase?.id === db.id}
                onClick={() => handleDatabaseSelect(db)}
              />
            ))
          )}
        </TreeNode>

        {/* Tables (only show if database selected) */}
        {state.activeDatabase && (
          <>
            <TreeNode
              label="Tables"
              icon={<Table2 size={14} />}
              isExpanded={expanded.tables}
              hasChildren
              onToggle={() => toggleExpand('tables')}
              onAction={handleCreateTable}
            >
              {state.schema.tables.length === 0 ? (
                <div
                  className="tree-item text-muted-foreground italic"
                  style={{ '--depth': 1 } as React.CSSProperties}
                >
                  <span className="w-4" />
                  No tables
                </div>
              ) : (
                state.schema.tables.map((table) => (
                  <TreeNode
                    key={table.name}
                    label={table.name}
                    icon={<Table2 size={14} />}
                    depth={1}
                    isSelected={state.selectedTable === table.name}
                    onClick={() => {
                      dispatch({ type: 'SET_SELECTED_TABLE', payload: table.name });
                      navigate('/schema');
                      addLog('info', `Viewing table: ${table.name}`);
                    }}
                  />
                ))
              )}
            </TreeNode>

            <TreeNode
              label="Views"
              icon={<Eye size={14} />}
              isExpanded={expanded.views}
              hasChildren
              onToggle={() => toggleExpand('views')}
              onAction={handleCreateView}
            >
              {state.schema.views.length === 0 ? (
                <div
                  className="tree-item text-muted-foreground italic"
                  style={{ '--depth': 1 } as React.CSSProperties}
                >
                  <span className="w-4" />
                  No views
                </div>
              ) : (
                state.schema.views.map((view) => (
                  <TreeNode
                    key={view.name}
                    label={view.name}
                    icon={<Eye size={14} />}
                    depth={1}
                  />
                ))
              )}
            </TreeNode>

            <TreeNode
              label="Indexes"
              icon={<KeyRound size={14} />}
              isExpanded={expanded.indexes}
              hasChildren
              onToggle={() => toggleExpand('indexes')}
              onAction={handleCreateIndex}
            >
              {state.schema.indexes.length === 0 ? (
                <div
                  className="tree-item text-muted-foreground italic"
                  style={{ '--depth': 1 } as React.CSSProperties}
                >
                  <span className="w-4" />
                  No indexes
                </div>
              ) : (
                state.schema.indexes.map((index) => (
                  <TreeNode
                    key={index.name}
                    label={index.name}
                    icon={<KeyRound size={14} />}
                    depth={1}
                  />
                ))
              )}
            </TreeNode>
          </>
        )}
      </div>

      {/* Quick Navigation */}
      <div className="border-t px-2 py-2 space-y-1">
        <NavButton
          icon={<Sparkles size={14} />}
          label="AI Command"
          isActive={window.location.pathname === '/ai' || window.location.pathname === '/'}
          onClick={() => navigate('/ai')}
        />
        <NavButton
          icon={<TerminalSquare size={14} />}
          label="SQL Editor"
          isActive={window.location.pathname === '/sql-editor'}
          onClick={() => navigate('/sql-editor')}
        />
        <NavButton
          icon={<Columns size={14} />}
          label="Schema"
          isActive={window.location.pathname === '/schema'}
          onClick={() => navigate('/schema')}
        />
        <NavButton
          icon={<Link size={14} />}
          label="Connection"
          isActive={window.location.pathname === '/connection'}
          onClick={() => navigate('/connection')}
        />
        <NavButton
          icon={<Settings size={14} />}
          label="Settings"
          isActive={window.location.pathname === '/settings'}
          onClick={() => navigate('/settings')}
        />
      </div>
    </div>
  );
}

function NavButton({ 
  icon, 
  label, 
  isActive, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors ${
        isActive 
          ? 'bg-primary/20 text-primary' 
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
