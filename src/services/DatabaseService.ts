// Backend-intended service stubs
// These functions represent real database operations that will be implemented by the backend

import { Database, Table, View, Index, Column } from '@/store/AppState';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate mock credentials
function generateCredentials() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomString = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  
  return {
    host: `db-${randomString(8)}.prism-ai.cloud`,
    port: 5432,
    username: `user_${randomString(6)}`,
    password: randomString(24),
  };
}

/**
 * Provision a new database
 * Backend will create actual MySQL/PostgreSQL instance
 */
export async function provisionDatabase(params: {
  name: string;
  engine: 'mysql' | 'postgresql';
}): Promise<Database> {
  // Simulate provisioning time
  await delay(2000);
  
  const credentials = generateCredentials();
  
  return {
    id: crypto.randomUUID(),
    name: params.name,
    engine: params.engine,
    status: 'active',
    createdAt: new Date(),
    host: credentials.host,
    port: params.engine === 'mysql' ? 3306 : 5432,
    username: credentials.username,
    password: credentials.password,
  };
}

/**
 * Drop/delete a database
 */
export async function dropDatabase(databaseId: string): Promise<void> {
  await delay(1000);
  // Backend will destroy the database instance
}

/**
 * Create a new table
 */
export async function createTable(params: {
  databaseId: string;
  name: string;
  columns: Column[];
}): Promise<Table> {
  await delay(500);
  
  return {
    name: params.name,
    columns: params.columns,
    databaseId: params.databaseId,
  };
}

/**
 * Drop a table
 */
export async function dropTable(databaseId: string, tableName: string): Promise<void> {
  await delay(300);
}

/**
 * Create a view
 */
export async function createView(params: {
  databaseId: string;
  name: string;
  sql: string;
}): Promise<View> {
  await delay(400);
  
  return {
    name: params.name,
    sql: params.sql,
    databaseId: params.databaseId,
  };
}

/**
 * Create an index
 */
export async function createIndex(params: {
  databaseId: string;
  name: string;
  tableName: string;
  columns: string[];
  isUnique: boolean;
}): Promise<Index> {
  await delay(400);
  
  return {
    name: params.name,
    tableName: params.tableName,
    columns: params.columns,
    isUnique: params.isUnique,
    databaseId: params.databaseId,
  };
}

/**
 * Execute SQL query
 */
export async function executeSQL(params: {
  databaseId: string;
  sql: string;
}): Promise<{
  success: boolean;
  rowCount?: number;
  columns?: string[];
  rows?: Record<string, unknown>[];
  error?: string;
  executionTime: number;
}> {
  const startTime = Date.now();
  await delay(300);
  
  // Parse SQL type for demo purposes
  const sqlUpper = params.sql.toUpperCase().trim();
  
  if (sqlUpper.startsWith('SELECT')) {
    return {
      success: true,
      rowCount: 0,
      columns: [],
      rows: [],
      executionTime: Date.now() - startTime,
    };
  }
  
  if (sqlUpper.startsWith('INSERT') || sqlUpper.startsWith('UPDATE') || sqlUpper.startsWith('DELETE')) {
    return {
      success: true,
      rowCount: 1,
      executionTime: Date.now() - startTime,
    };
  }
  
  if (sqlUpper.startsWith('CREATE') || sqlUpper.startsWith('ALTER') || sqlUpper.startsWith('DROP')) {
    return {
      success: true,
      executionTime: Date.now() - startTime,
    };
  }
  
  return {
    success: true,
    executionTime: Date.now() - startTime,
  };
}

/**
 * Refresh schema information
 */
export async function refreshSchema(databaseId: string): Promise<{
  tables: Table[];
  views: View[];
  indexes: Index[];
}> {
  await delay(500);
  
  // Backend will query information_schema
  return {
    tables: [],
    views: [],
    indexes: [],
  };
}

/**
 * AI: Generate SQL from natural language
 */
export async function aiGenerateSQL(params: {
  command: string;
  schema: {
    tables: Table[];
    views: View[];
  };
  engine: 'mysql' | 'postgresql';
}): Promise<{
  sql: string;
  explanation: string;
  actionType: 'READ' | 'STRUCTURAL' | 'DESTRUCTIVE';
}> {
  await delay(800);
  
  const commandLower = params.command.toLowerCase();
  
  // Simple pattern matching for demo
  if (commandLower.includes('show') || commandLower.includes('list') || commandLower.includes('select') || commandLower.includes('get')) {
    if (commandLower.includes('table')) {
      return {
        sql: params.engine === 'postgresql' 
          ? "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
          : "SHOW TABLES;",
        explanation: "This query will list all tables in the current database.",
        actionType: 'READ',
      };
    }
    if (commandLower.includes('database')) {
      return {
        sql: params.engine === 'postgresql'
          ? "SELECT datname FROM pg_database WHERE datistemplate = false;"
          : "SHOW DATABASES;",
        explanation: "This query will list all accessible databases.",
        actionType: 'READ',
      };
    }
  }
  
  if (commandLower.includes('create table') || commandLower.includes('create a table')) {
    // Extract table name and columns
    const match = commandLower.match(/(?:for|called|named)\s+(\w+)/);
    const tableName = match?.[1] || 'new_table';
    
    let columns = 'id SERIAL PRIMARY KEY';
    if (commandLower.includes('email')) columns += ', email VARCHAR(255)';
    if (commandLower.includes('name')) columns += ', name VARCHAR(100)';
    if (commandLower.includes('user')) columns += ', email VARCHAR(255), name VARCHAR(100)';
    
    return {
      sql: `CREATE TABLE ${tableName} (\n  ${columns.replace(/, /g, ',\n  ')}\n);`,
      explanation: `This will create a new table called "${tableName}" with the specified columns.`,
      actionType: 'STRUCTURAL',
    };
  }
  
  if (commandLower.includes('drop') || commandLower.includes('delete')) {
    return {
      sql: "-- Destructive operation detected. Please be more specific.",
      explanation: "This appears to be a destructive operation. Please specify exactly what you want to delete.",
      actionType: 'DESTRUCTIVE',
    };
  }
  
  if (commandLower.includes('explain') || commandLower.includes('describe')) {
    return {
      sql: "-- Analysis query",
      explanation: `Your database${params.schema.tables.length > 0 ? ` contains ${params.schema.tables.length} table(s)` : ' is currently empty'}. ${params.schema.tables.map(t => t.name).join(', ') || 'Create tables to get started.'}`,
      actionType: 'READ',
    };
  }
  
  // Default response
  return {
    sql: `-- Interpreting: "${params.command}"\n-- Please provide more specific instructions.`,
    explanation: "I need more context to generate the appropriate SQL. Try commands like 'Create a table for users with id and email' or 'Show all tables'.",
    actionType: 'READ',
  };
}
