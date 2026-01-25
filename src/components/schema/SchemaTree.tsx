import React, { useState } from 'react';
import { useAppState, createLog } from '@/store/AppState';
import {
  Database,
  Table2,
  Eye,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Columns,
  Hash,
  Type,
  Key,
  Circle,
} from 'lucide-react';

interface TreeNodeProps {
  depth?: number;
  children: React.ReactNode;
  icon?: React.ReactNode;
  label: string;
  isExpandable?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  isSelected?: boolean;
  isHighlighted?: boolean;
  badge?: React.ReactNode;
}

function TreeNode({
  depth = 0,
  children,
  icon,
  label,
  isExpandable = false,
  isExpanded = false,
  onToggle,
  onClick,
  isSelected = false,
  isHighlighted = false,
  badge,
}: TreeNodeProps) {
  const handleClick = () => {
    if (isExpandable && onToggle) {
      onToggle();
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <div>
      <div
        className={`tree-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'schema-highlight' : ''}`}
        style={{ '--depth': depth } as React.CSSProperties}
        onClick={handleClick}
      >
        {isExpandable ? (
          <span className="w-3 h-3 flex items-center justify-center flex-shrink-0">
            {isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </span>
        ) : (
          <span className="w-3" />
        )}
        {icon && <span className="tree-icon">{icon}</span>}
        <span className="flex-1 truncate">{label}</span>
        {badge}
      </div>
      {isExpanded && children}
    </div>
  );
}

export default function SchemaTree() {
  const { state, dispatch } = useAppState();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['tables', 'views', 'indexes'])
  );
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [recentlyChanged, setRecentlyChanged] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  const handleTableClick = (tableName: string) => {
    dispatch({ type: 'SET_SELECTED_TABLE', payload: tableName });
    dispatch({
      type: 'ADD_LOG',
      payload: createLog('info', `Selected table: ${tableName}`),
    });
  };

  // Check if an object was recently changed (for highlighting)
  const isRecentlyChanged = (objectName: string): boolean => {
    if (state.schemaHistory.length < 2) return false;
    const lastChange = state.schemaHistory[state.schemaHistory.length - 1];
    return lastChange.affectedObject === objectName;
  };

  const getColumnIcon = (column: { isPrimaryKey: boolean; type: string }) => {
    if (column.isPrimaryKey) {
      return <Key size={12} className="text-warning" />;
    }
    const typeLower = column.type.toLowerCase();
    if (typeLower.includes('int') || typeLower.includes('decimal') || typeLower.includes('numeric')) {
      return <Hash size={12} className="text-muted-foreground" />;
    }
    return <Type size={12} className="text-muted-foreground" />;
  };

  if (!state.activeDatabase) {
    return (
      <div className="p-4 text-center">
        <Database size={32} className="mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-xs text-muted-foreground">No database selected</p>
      </div>
    );
  }

  return (
    <div className="schema-tree text-xs">
      {/* Database root */}
      <TreeNode
        icon={<Database size={14} className="text-primary" />}
        label={state.activeDatabase.name}
        badge={
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase font-medium">
            {state.activeDatabase.engine}
          </span>
        }
      >
        {null}
      </TreeNode>

      {/* Tables section */}
      <TreeNode
        depth={1}
        icon={<Table2 size={14} />}
        label="Tables"
        isExpandable
        isExpanded={expandedNodes.has('tables')}
        onToggle={() => toggleNode('tables')}
        badge={
          <span className="text-[10px] text-muted-foreground">
            ({state.schema.tables.length})
          </span>
        }
      >
        {state.schema.tables.map((table) => (
          <TreeNode
            key={table.name}
            depth={2}
            icon={<Table2 size={12} />}
            label={table.name}
            isExpandable
            isExpanded={expandedTables.has(table.name)}
            onToggle={() => toggleTable(table.name)}
            onClick={() => handleTableClick(table.name)}
            isSelected={state.selectedTable === table.name}
            isHighlighted={isRecentlyChanged(table.name)}
            badge={
              <span className="text-[10px] text-muted-foreground">
                {table.columns.length} cols
              </span>
            }
          >
            {/* Columns */}
            <TreeNode
              depth={3}
              icon={<Columns size={12} />}
              label="Columns"
              isExpandable
              isExpanded={true}
              badge={
                <span className="text-[10px] text-muted-foreground">
                  ({table.columns.length})
                </span>
              }
            >
              {table.columns.map((column) => (
                <div
                  key={column.name}
                  className="tree-item"
                  style={{ '--depth': 4 } as React.CSSProperties}
                >
                  <span className="w-3" />
                  {getColumnIcon(column)}
                  <span className="flex-1 truncate font-medium">
                    {column.name}
                  </span>
                  <span className="text-[10px] font-mono text-syntax-keyword">
                    {column.type}
                  </span>
                  {column.isPrimaryKey && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-warning/20 text-warning font-medium">
                      PK
                    </span>
                  )}
                  {!column.isNullable && !column.isPrimaryKey && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                      NN
                    </span>
                  )}
                </div>
              ))}
            </TreeNode>

            {/* Table indexes */}
            {state.schema.indexes.filter((i) => i.tableName === table.name).length > 0 && (
              <TreeNode
                depth={3}
                icon={<KeyRound size={12} />}
                label="Indexes"
                isExpandable
                isExpanded={false}
                badge={
                  <span className="text-[10px] text-muted-foreground">
                    ({state.schema.indexes.filter((i) => i.tableName === table.name).length})
                  </span>
                }
              >
                {state.schema.indexes
                  .filter((i) => i.tableName === table.name)
                  .map((index) => (
                    <div
                      key={index.name}
                      className="tree-item"
                      style={{ '--depth': 4 } as React.CSSProperties}
                    >
                      <span className="w-3" />
                      <KeyRound size={10} className="text-muted-foreground" />
                      <span className="flex-1 truncate">{index.name}</span>
                      {index.isUnique && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-accent text-accent-foreground">
                          UQ
                        </span>
                      )}
                    </div>
                  ))}
              </TreeNode>
            )}
          </TreeNode>
        ))}

        {state.schema.tables.length === 0 && (
          <div className="tree-item text-muted-foreground italic" style={{ '--depth': 2 } as React.CSSProperties}>
            <span className="w-3" />
            <Circle size={8} className="text-muted-foreground/50" />
            <span>No tables</span>
          </div>
        )}
      </TreeNode>

      {/* Views section */}
      <TreeNode
        depth={1}
        icon={<Eye size={14} />}
        label="Views"
        isExpandable
        isExpanded={expandedNodes.has('views')}
        onToggle={() => toggleNode('views')}
        badge={
          <span className="text-[10px] text-muted-foreground">
            ({state.schema.views.length})
          </span>
        }
      >
        {state.schema.views.map((view) => (
          <div
            key={view.name}
            className={`tree-item ${isRecentlyChanged(view.name) ? 'schema-highlight' : ''}`}
            style={{ '--depth': 2 } as React.CSSProperties}
          >
            <span className="w-3" />
            <Eye size={12} className="text-muted-foreground" />
            <span className="flex-1 truncate">{view.name}</span>
          </div>
        ))}

        {state.schema.views.length === 0 && (
          <div className="tree-item text-muted-foreground italic" style={{ '--depth': 2 } as React.CSSProperties}>
            <span className="w-3" />
            <Circle size={8} className="text-muted-foreground/50" />
            <span>No views</span>
          </div>
        )}
      </TreeNode>

      {/* Indexes section */}
      <TreeNode
        depth={1}
        icon={<KeyRound size={14} />}
        label="Indexes"
        isExpandable
        isExpanded={expandedNodes.has('indexes')}
        onToggle={() => toggleNode('indexes')}
        badge={
          <span className="text-[10px] text-muted-foreground">
            ({state.schema.indexes.length})
          </span>
        }
      >
        {state.schema.indexes.map((index) => (
          <div
            key={index.name}
            className={`tree-item ${isRecentlyChanged(index.name) ? 'schema-highlight' : ''}`}
            style={{ '--depth': 2 } as React.CSSProperties}
          >
            <span className="w-3" />
            <KeyRound size={12} className="text-muted-foreground" />
            <span className="flex-1 truncate">{index.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {index.tableName}
            </span>
            {index.isUnique && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-warning/20 text-warning">
                UQ
              </span>
            )}
          </div>
        ))}

        {state.schema.indexes.length === 0 && (
          <div className="tree-item text-muted-foreground italic" style={{ '--depth': 2 } as React.CSSProperties}>
            <span className="w-3" />
            <Circle size={8} className="text-muted-foreground/50" />
            <span>No indexes</span>
          </div>
        )}
      </TreeNode>
    </div>
  );
}