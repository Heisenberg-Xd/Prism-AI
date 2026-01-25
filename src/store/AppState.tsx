import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface Database {
  id: string;
  name: string;
  engine: 'mysql' | 'postgresql';
  status: 'provisioning' | 'active' | 'error';
  createdAt: Date;
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface Table {
  name: string;
  columns: Column[];
  databaseId: string;
}

export interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  defaultValue?: string;
}

export interface View {
  name: string;
  sql: string;
  databaseId: string;
}

export interface Index {
  name: string;
  tableName: string;
  columns: string[];
  isUnique: boolean;
  databaseId: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  actionType?: 'READ' | 'WRITE' | 'STRUCTURAL' | 'DESTRUCTIVE';
  timestamp: Date;
  executed?: boolean;
}

// Schema history for diff view
export interface SchemaSnapshot {
  id: string;
  timestamp: Date;
  tables: Table[];
  views: View[];
  indexes: Index[];
  changeType: 'table_created' | 'table_dropped' | 'table_altered' | 'view_created' | 'view_dropped' | 'index_created' | 'index_dropped' | 'initial';
  changeDescription: string;
  affectedObject?: string;
}

// Operation analysis for CRUD operations
export interface OperationAnalysis {
  operation_type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL' | 'UNKNOWN';
  risk_level: 'safe' | 'moderate' | 'high' | 'critical';
  affected_tables: string[];
  affected_columns: string[];
  estimated_rows: string;
  warnings: string[];
  requires_confirmation: boolean;
}

// AI Command entry for terminal-like history
export interface AICommandEntry {
  id: string;
  timestamp: Date;
  command: string;
  sql?: string;
  explanation?: string;
  actionType?: 'READ' | 'WRITE' | 'STRUCTURAL' | 'DESTRUCTIVE';
  status: 'pending' | 'previewed' | 'executed' | 'blocked' | 'error' | 'awaiting_confirmation';
  errorMessage?: string;
  executionTime?: number;
  rowsAffected?: number;
  // Query results
  resultColumns?: string[];
  resultRows?: Record<string, unknown>[];
  // Operation analysis for CRUD
  operationAnalysis?: OperationAnalysis;
}

export interface AppState {
  databases: Database[];
  activeDatabase: Database | null;
  schema: {
    tables: Table[];
    views: View[];
    indexes: Index[];
  };
  schemaHistory: SchemaSnapshot[];
  selectedTable: string | null;
  aiHistory: AIMessage[];
  ai: {
    mode: 'AI' | 'SQL';
    commandHistory: AICommandEntry[];
    activeCommand: AICommandEntry | null;
    isProcessing: boolean;
  };
  logs: LogEntry[];
  ui: {
    activePage: string;
    theme: 'dark' | 'light';
    panels: {
      sidebar: boolean;
      ai: boolean;
      output: boolean;
    };
    activeModal: string | null;
    schemaView: 'tree' | 'diff' | 'detail';
  };
}

// Initial state
const initialState: AppState = {
  databases: [],
  activeDatabase: null,
  schema: {
    tables: [],
    views: [],
    indexes: [],
  },
  schemaHistory: [],
  selectedTable: null,
  aiHistory: [],
  ai: {
    mode: 'AI',
    commandHistory: [],
    activeCommand: null,
    isProcessing: false,
  },
  logs: [],
  ui: {
    activePage: 'ai',
    theme: 'dark',
    panels: {
      sidebar: true,
      ai: true,
      output: true,
    },
    activeModal: null,
    schemaView: 'tree',
  },
};

// Action types
type Action =
  | { type: 'ADD_DATABASE'; payload: Database }
  | { type: 'UPDATE_DATABASE'; payload: { id: string; updates: Partial<Database> } }
  | { type: 'REMOVE_DATABASE'; payload: string }
  | { type: 'SET_ACTIVE_DATABASE'; payload: Database | null }
  | { type: 'ADD_TABLE'; payload: Table }
  | { type: 'REMOVE_TABLE'; payload: { name: string; databaseId: string } }
  | { type: 'ADD_VIEW'; payload: View }
  | { type: 'REMOVE_VIEW'; payload: { name: string; databaseId: string } }
  | { type: 'ADD_INDEX'; payload: Index }
  | { type: 'REMOVE_INDEX'; payload: { name: string; databaseId: string } }
  | { type: 'ADD_AI_MESSAGE'; payload: AIMessage }
  | { type: 'UPDATE_AI_MESSAGE'; payload: { id: string; updates: Partial<AIMessage> } }
  | { type: 'CLEAR_AI_HISTORY' }
  | { type: 'ADD_LOG'; payload: LogEntry }
  | { type: 'CLEAR_LOGS' }
  | { type: 'SET_ACTIVE_PAGE'; payload: string }
  | { type: 'TOGGLE_PANEL'; payload: 'sidebar' | 'ai' | 'output' }
  | { type: 'SET_THEME'; payload: 'dark' | 'light' }
  | { type: 'SET_MODAL'; payload: string | null }
  | { type: 'REFRESH_SCHEMA'; payload: { tables: Table[]; views: View[]; indexes: Index[] } }
  | { type: 'SET_SELECTED_TABLE'; payload: string | null }
  | { type: 'ADD_SCHEMA_SNAPSHOT'; payload: SchemaSnapshot }
  | { type: 'SET_SCHEMA_VIEW'; payload: 'tree' | 'diff' | 'detail' }
  | { type: 'SET_AI_MODE'; payload: 'AI' | 'SQL' }
  | { type: 'ADD_AI_COMMAND'; payload: AICommandEntry }
  | { type: 'UPDATE_AI_COMMAND'; payload: { id: string; updates: Partial<AICommandEntry> } }
  | { type: 'SET_ACTIVE_AI_COMMAND'; payload: AICommandEntry | null }
  | { type: 'SET_AI_PROCESSING'; payload: boolean }
  | { type: 'CLEAR_AI_COMMANDS' };

// Helper to create schema snapshot
function createSchemaSnapshot(
  schema: { tables: Table[]; views: View[]; indexes: Index[] },
  changeType: SchemaSnapshot['changeType'],
  changeDescription: string,
  affectedObject?: string
): SchemaSnapshot {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    tables: JSON.parse(JSON.stringify(schema.tables)),
    views: JSON.parse(JSON.stringify(schema.views)),
    indexes: JSON.parse(JSON.stringify(schema.indexes)),
    changeType,
    changeDescription,
    affectedObject,
  };
}

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_DATABASE':
      return {
        ...state,
        databases: [...state.databases, action.payload],
      };

    case 'UPDATE_DATABASE':
      return {
        ...state,
        databases: state.databases.map((db) =>
          db.id === action.payload.id ? { ...db, ...action.payload.updates } : db
        ),
        activeDatabase:
          state.activeDatabase?.id === action.payload.id
            ? { ...state.activeDatabase, ...action.payload.updates }
            : state.activeDatabase,
      };

    case 'REMOVE_DATABASE':
      return {
        ...state,
        databases: state.databases.filter((db) => db.id !== action.payload),
        activeDatabase:
          state.activeDatabase?.id === action.payload ? null : state.activeDatabase,
        schema:
          state.activeDatabase?.id === action.payload
            ? { tables: [], views: [], indexes: [] }
            : state.schema,
        schemaHistory: [],
      };

    case 'SET_ACTIVE_DATABASE': {
      const newSchema = action.payload
        ? {
            tables: state.schema.tables.filter((t) => t.databaseId === action.payload?.id),
            views: state.schema.views.filter((v) => v.databaseId === action.payload?.id),
            indexes: state.schema.indexes.filter((i) => i.databaseId === action.payload?.id),
          }
        : { tables: [], views: [], indexes: [] };
      
      return {
        ...state,
        activeDatabase: action.payload,
        schema: newSchema,
        schemaHistory: action.payload ? [createSchemaSnapshot(newSchema, 'initial', `Connected to ${action.payload.name}`)] : [],
        selectedTable: null,
      };
    }

    case 'ADD_TABLE': {
      const newSchema = {
        ...state.schema,
        tables: [...state.schema.tables, action.payload],
      };
      const snapshot = createSchemaSnapshot(
        newSchema,
        'table_created',
        `Table "${action.payload.name}" created with ${action.payload.columns.length} columns`,
        action.payload.name
      );
      return {
        ...state,
        schema: newSchema,
        schemaHistory: [...state.schemaHistory, snapshot],
      };
    }

    case 'REMOVE_TABLE': {
      const newSchema = {
        ...state.schema,
        tables: state.schema.tables.filter(
          (t) => !(t.name === action.payload.name && t.databaseId === action.payload.databaseId)
        ),
      };
      const snapshot = createSchemaSnapshot(
        newSchema,
        'table_dropped',
        `Table "${action.payload.name}" dropped`,
        action.payload.name
      );
      return {
        ...state,
        schema: newSchema,
        schemaHistory: [...state.schemaHistory, snapshot],
        selectedTable: state.selectedTable === action.payload.name ? null : state.selectedTable,
      };
    }

    case 'ADD_VIEW': {
      const newSchema = {
        ...state.schema,
        views: [...state.schema.views, action.payload],
      };
      const snapshot = createSchemaSnapshot(
        newSchema,
        'view_created',
        `View "${action.payload.name}" created`,
        action.payload.name
      );
      return {
        ...state,
        schema: newSchema,
        schemaHistory: [...state.schemaHistory, snapshot],
      };
    }

    case 'REMOVE_VIEW': {
      const newSchema = {
        ...state.schema,
        views: state.schema.views.filter(
          (v) => !(v.name === action.payload.name && v.databaseId === action.payload.databaseId)
        ),
      };
      const snapshot = createSchemaSnapshot(
        newSchema,
        'view_dropped',
        `View "${action.payload.name}" dropped`,
        action.payload.name
      );
      return {
        ...state,
        schema: newSchema,
        schemaHistory: [...state.schemaHistory, snapshot],
      };
    }

    case 'ADD_INDEX': {
      const newSchema = {
        ...state.schema,
        indexes: [...state.schema.indexes, action.payload],
      };
      const snapshot = createSchemaSnapshot(
        newSchema,
        'index_created',
        `Index "${action.payload.name}" created on ${action.payload.tableName}`,
        action.payload.name
      );
      return {
        ...state,
        schema: newSchema,
        schemaHistory: [...state.schemaHistory, snapshot],
      };
    }

    case 'REMOVE_INDEX': {
      const newSchema = {
        ...state.schema,
        indexes: state.schema.indexes.filter(
          (i) => !(i.name === action.payload.name && i.databaseId === action.payload.databaseId)
        ),
      };
      const snapshot = createSchemaSnapshot(
        newSchema,
        'index_dropped',
        `Index "${action.payload.name}" dropped`,
        action.payload.name
      );
      return {
        ...state,
        schema: newSchema,
        schemaHistory: [...state.schemaHistory, snapshot],
      };
    }

    case 'ADD_AI_MESSAGE':
      return {
        ...state,
        aiHistory: [...state.aiHistory, action.payload],
      };

    case 'UPDATE_AI_MESSAGE':
      return {
        ...state,
        aiHistory: state.aiHistory.map((msg) =>
          msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg
        ),
      };

    case 'CLEAR_AI_HISTORY':
      return {
        ...state,
        aiHistory: [],
        ai: { ...state.ai, commandHistory: [], activeCommand: null },
      };

    case 'ADD_LOG':
      return {
        ...state,
        logs: [...state.logs, action.payload],
      };

    case 'CLEAR_LOGS':
      return {
        ...state,
        logs: [],
      };

    case 'SET_ACTIVE_PAGE':
      return {
        ...state,
        ui: { ...state.ui, activePage: action.payload },
      };

    case 'TOGGLE_PANEL':
      return {
        ...state,
        ui: {
          ...state.ui,
          panels: {
            ...state.ui.panels,
            [action.payload]: !state.ui.panels[action.payload],
          },
        },
      };

    case 'SET_THEME':
      return {
        ...state,
        ui: { ...state.ui, theme: action.payload },
      };

    case 'SET_MODAL':
      return {
        ...state,
        ui: { ...state.ui, activeModal: action.payload },
      };

    case 'REFRESH_SCHEMA':
      return {
        ...state,
        schema: action.payload,
      };

    case 'SET_SELECTED_TABLE':
      return {
        ...state,
        selectedTable: action.payload,
        ui: { ...state.ui, schemaView: action.payload ? 'detail' : state.ui.schemaView },
      };

    case 'ADD_SCHEMA_SNAPSHOT':
      return {
        ...state,
        schemaHistory: [...state.schemaHistory, action.payload],
      };

    case 'SET_SCHEMA_VIEW':
      return {
        ...state,
        ui: { ...state.ui, schemaView: action.payload },
      };

    case 'SET_AI_MODE':
      return {
        ...state,
        ai: { ...state.ai, mode: action.payload },
      };

    case 'ADD_AI_COMMAND':
      return {
        ...state,
        ai: {
          ...state.ai,
          commandHistory: [...state.ai.commandHistory, action.payload],
        },
      };

    case 'UPDATE_AI_COMMAND':
      return {
        ...state,
        ai: {
          ...state.ai,
          commandHistory: state.ai.commandHistory.map((cmd) =>
            cmd.id === action.payload.id ? { ...cmd, ...action.payload.updates } : cmd
          ),
          activeCommand:
            state.ai.activeCommand?.id === action.payload.id
              ? { ...state.ai.activeCommand, ...action.payload.updates }
              : state.ai.activeCommand,
        },
      };

    case 'SET_ACTIVE_AI_COMMAND':
      return {
        ...state,
        ai: { ...state.ai, activeCommand: action.payload },
      };

    case 'SET_AI_PROCESSING':
      return {
        ...state,
        ai: { ...state.ai, isProcessing: action.payload },
      };

    case 'CLEAR_AI_COMMANDS':
      return {
        ...state,
        ai: { ...state.ai, commandHistory: [], activeCommand: null },
      };

    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook
export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}

// Helper to generate log
export function createLog(
  type: LogEntry['type'],
  message: string,
  details?: string
): LogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    type,
    message,
    details,
  };
}

// Helper to generate AI message
export function createAIMessage(
  role: 'user' | 'assistant',
  content: string,
  options?: Partial<AIMessage>
): AIMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date(),
    ...options,
  };
}

// Helper to create AI command entry
export function createAICommand(
  command: string,
  options?: Partial<AICommandEntry>
): AICommandEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    command,
    status: 'pending',
    ...options,
  };
}
