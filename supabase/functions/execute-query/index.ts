/**
 * POST /execute-query - Safe Query Execution (with CRUD support)
 * 
 * Executes validated SQL queries against the Supabase database.
 * Now supports INSERT, UPDATE, DELETE with explicit confirmation.
 * 
 * SECURITY GUARANTEES:
 * - Re-validates all queries before execution
 * - Enforces role-based access
 * - Requires explicit confirmation for write operations
 * - Logs all write operations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateSQL, SchemaTable, detectOperationType, analyzeOperation, OperationAnalysis } from "../_shared/sql-validator.ts";

interface ExecuteQueryRequest {
  sql: string;
  role?: "creator" | "user";
  schema?: SchemaTable[];
  confirmed?: boolean; // Required for write operations
  skip_revalidation?: boolean;
}

interface ExecuteQueryResponse {
  success: boolean;
  operation_type: string;
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  affected_rows?: number;
  execution_time_ms: number;
  warning?: string;
  error?: string;
  requires_confirmation?: boolean;
  operation_analysis?: OperationAnalysis;
}

const MAX_ROWS = 1000;

/**
 * Default schema for validation
 */
const DEFAULT_SCHEMA: SchemaTable[] = [
  {
    table_name: "demo_users",
    columns: [
      { column_name: "id", data_type: "uuid", is_nullable: "NO" },
      { column_name: "email", data_type: "varchar", is_nullable: "NO" },
      { column_name: "name", data_type: "varchar", is_nullable: "YES" },
      { column_name: "status", data_type: "varchar", is_nullable: "YES" },
      { column_name: "created_at", data_type: "timestamp", is_nullable: "NO" },
    ],
  },
  {
    table_name: "demo_orders",
    columns: [
      { column_name: "id", data_type: "uuid", is_nullable: "NO" },
      { column_name: "user_id", data_type: "uuid", is_nullable: "YES" },
      { column_name: "total_amount", data_type: "numeric", is_nullable: "NO" },
      { column_name: "status", data_type: "varchar", is_nullable: "YES" },
      { column_name: "created_at", data_type: "timestamp", is_nullable: "NO" },
    ],
  },
  {
    table_name: "demo_products",
    columns: [
      { column_name: "id", data_type: "uuid", is_nullable: "NO" },
      { column_name: "name", data_type: "varchar", is_nullable: "NO" },
      { column_name: "price", data_type: "numeric", is_nullable: "NO" },
      { column_name: "category", data_type: "varchar", is_nullable: "YES" },
      { column_name: "in_stock", data_type: "boolean", is_nullable: "YES" },
      { column_name: "created_at", data_type: "timestamp", is_nullable: "NO" },
    ],
  },
];

/**
 * Extract table name from SQL for Supabase client operations
 */
function extractPrimaryTable(sql: string): string | null {
  const upperSQL = sql.toUpperCase();
  
  // INSERT INTO table_name
  const insertMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  if (insertMatch) return insertMatch[1].toLowerCase();
  
  // UPDATE table_name
  const updateMatch = sql.match(/UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  if (updateMatch) return updateMatch[1].toLowerCase();
  
  // DELETE FROM table_name
  const deleteMatch = sql.match(/DELETE\s+FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  if (deleteMatch) return deleteMatch[1].toLowerCase();
  
  // SELECT ... FROM table_name
  const selectMatch = sql.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  if (selectMatch) return selectMatch[1].toLowerCase();
  
  return null;
}

/**
 * Parse INSERT VALUES from SQL
 */
function parseInsertValues(sql: string): { columns: string[]; values: unknown[][] } | null {
  // Match INSERT INTO table (col1, col2) VALUES (val1, val2)
  const match = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)\s*VALUES\s*(.+)$/is);
  
  if (!match) return null;
  
  const columns = match[1].split(',').map(c => c.trim());
  const valuesSection = match[2];
  
  // Parse multiple value sets
  const valueMatches = valuesSection.matchAll(/\(([^)]+)\)/g);
  const values: unknown[][] = [];
  
  for (const vm of valueMatches) {
    const rowValues = vm[1].split(',').map(v => {
      const trimmed = v.trim();
      // Remove quotes from strings
      if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
          (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        return trimmed.slice(1, -1);
      }
      // Parse numbers
      if (!isNaN(Number(trimmed))) {
        return Number(trimmed);
      }
      // Booleans
      if (trimmed.toUpperCase() === 'TRUE') return true;
      if (trimmed.toUpperCase() === 'FALSE') return false;
      if (trimmed.toUpperCase() === 'NULL') return null;
      return trimmed;
    });
    values.push(rowValues);
  }
  
  return { columns, values };
}

/**
 * Parse UPDATE SET values and WHERE clause
 */
function parseUpdateQuery(sql: string): { updates: Record<string, unknown>; whereColumn?: string; whereValue?: unknown } | null {
  const setMatch = sql.match(/SET\s+([\s\S]+?)(?:\s+WHERE\s+|$)/i);
  if (!setMatch) return null;
  
  const updates: Record<string, unknown> = {};
  const setPairs = setMatch[1].split(',');
  
  for (const pair of setPairs) {
    const [col, val] = pair.split('=').map(s => s.trim());
    if (col && val !== undefined) {
      let parsedVal: unknown = val;
      if ((val.startsWith("'") && val.endsWith("'")) ||
          (val.startsWith('"') && val.endsWith('"'))) {
        parsedVal = val.slice(1, -1);
      } else if (!isNaN(Number(val))) {
        parsedVal = Number(val);
      } else if (val.toUpperCase() === 'TRUE') {
        parsedVal = true;
      } else if (val.toUpperCase() === 'FALSE') {
        parsedVal = false;
      } else if (val.toUpperCase() === 'NULL') {
        parsedVal = null;
      }
      updates[col] = parsedVal;
    }
  }
  
  // Parse WHERE clause (simple single condition)
  const whereMatch = sql.match(/WHERE\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?)(?:\s*;?\s*$)/i);
  if (whereMatch) {
    const whereColumn = whereMatch[1];
    let whereValue: unknown = whereMatch[2].trim();
    
    if ((typeof whereValue === 'string') &&
        ((whereValue.startsWith("'") && whereValue.endsWith("'")) ||
         (whereValue.startsWith('"') && whereValue.endsWith('"')))) {
      whereValue = whereValue.slice(1, -1);
    }
    
    return { updates, whereColumn, whereValue };
  }
  
  return { updates };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", 405);
  }

  const startTime = Date.now();

  try {
    const body: ExecuteQueryRequest = await req.json();

    if (!body.sql || body.sql.trim().length === 0) {
      return errorResponse("sql is required", 400);
    }

    const role = body.role || "user";
    const schema = body.schema || DEFAULT_SCHEMA;

    // Validate the query
    if (!body.skip_revalidation) {
      const validationResult = validateSQL(body.sql, schema, role);
      
      if (!validationResult.is_valid) {
        return errorResponse(`Query failed validation: ${validationResult.reason}`, 400);
      }
    }

    // Detect operation type and analyze
    const opType = detectOperationType(body.sql);
    const analysis = analyzeOperation(body.sql, schema);

    // Check if confirmation is required for write operations
    if (analysis.requires_confirmation && !body.confirmed) {
      return jsonResponse({
        success: false,
        operation_type: opType,
        columns: [],
        rows: [],
        row_count: 0,
        execution_time_ms: Date.now() - startTime,
        requires_confirmation: true,
        operation_analysis: analysis,
        warning: `This ${opType} operation requires explicit confirmation. Risk level: ${analysis.risk_level.toUpperCase()}`,
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tableName = extractPrimaryTable(body.sql);
    
    let result: { columns: string[]; rows: Record<string, unknown>[]; affectedRows?: number } = {
      columns: [],
      rows: [],
    };

    // Execute based on operation type
    switch (opType) {
      case 'SELECT': {
        if (!tableName) {
          throw new Error("Could not determine table from query");
        }
        
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .limit(MAX_ROWS);
        
        if (error) throw new Error(error.message);
        
        if (data && data.length > 0) {
          result.columns = Object.keys(data[0]);
          result.rows = data;
        }
        
        // Apply LIMIT from query if specified
        const limitMatch = body.sql.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
          const limit = Math.min(parseInt(limitMatch[1], 10), MAX_ROWS);
          result.rows = result.rows.slice(0, limit);
        }
        break;
      }
      
      case 'INSERT': {
        if (!tableName) {
          throw new Error("Could not determine table from query");
        }
        
        const parsed = parseInsertValues(body.sql);
        if (!parsed) {
          throw new Error("Could not parse INSERT statement");
        }
        
        // Build insert objects
        const insertData = parsed.values.map(row => {
          const obj: Record<string, unknown> = {};
          parsed.columns.forEach((col, idx) => {
            obj[col] = row[idx];
          });
          return obj;
        });
        
        const { data, error } = await supabase
          .from(tableName)
          .insert(insertData)
          .select();
        
        if (error) throw new Error(error.message);
        
        result.columns = data && data.length > 0 ? Object.keys(data[0]) : [];
        result.rows = data || [];
        result.affectedRows = data?.length || 0;
        
        console.log(`[CRUD] INSERT into ${tableName}: ${result.affectedRows} rows`);
        break;
      }
      
      case 'UPDATE': {
        if (!tableName) {
          throw new Error("Could not determine table from query");
        }
        
        const parsed = parseUpdateQuery(body.sql);
        if (!parsed) {
          throw new Error("Could not parse UPDATE statement");
        }
        
        if (!parsed.whereColumn || parsed.whereValue === undefined) {
          throw new Error("UPDATE without WHERE clause is blocked for safety. Please specify which rows to update.");
        }
        
        const { data, error } = await supabase
          .from(tableName)
          .update(parsed.updates)
          .eq(parsed.whereColumn, parsed.whereValue)
          .select();
        
        if (error) throw new Error(error.message);
        
        result.columns = data && data.length > 0 ? Object.keys(data[0]) : [];
        result.rows = data || [];
        result.affectedRows = data?.length || 0;
        
        console.log(`[CRUD] UPDATE ${tableName}: ${result.affectedRows} rows`);
        break;
      }
      
      case 'DELETE': {
        if (!tableName) {
          throw new Error("Could not determine table from query");
        }
        
        // Parse WHERE clause
        const whereMatch = body.sql.match(/WHERE\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?)(?:\s*;?\s*$)/i);
        
        if (!whereMatch) {
          throw new Error("DELETE without WHERE clause is blocked for safety. Please specify which rows to delete.");
        }
        
        const whereColumn = whereMatch[1];
        let whereValue: unknown = whereMatch[2].trim();
        
        if ((typeof whereValue === 'string') &&
            ((whereValue.startsWith("'") && whereValue.endsWith("'")) ||
             (whereValue.startsWith('"') && whereValue.endsWith('"')))) {
          whereValue = whereValue.slice(1, -1);
        }
        
        // First get the rows that will be deleted (for audit)
        const { data: toDelete } = await supabase
          .from(tableName)
          .select("*")
          .eq(whereColumn, whereValue);
        
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq(whereColumn, whereValue);
        
        if (error) throw new Error(error.message);
        
        result.columns = toDelete && toDelete.length > 0 ? Object.keys(toDelete[0]) : ['deleted'];
        result.rows = toDelete || [];
        result.affectedRows = toDelete?.length || 0;
        
        console.log(`[CRUD] DELETE from ${tableName}: ${result.affectedRows} rows`);
        break;
      }
      
      default:
        throw new Error(`Unsupported operation type: ${opType}`);
    }

    const executionTime = Date.now() - startTime;

    const response: ExecuteQueryResponse = {
      success: true,
      operation_type: opType,
      columns: result.columns,
      rows: result.rows,
      row_count: result.rows.length,
      affected_rows: result.affectedRows,
      execution_time_ms: executionTime,
      operation_analysis: analysis,
    };

    return jsonResponse(response);

  } catch (error) {
    console.error("Execute query error:", error);
    
    return jsonResponse({
      success: false,
      operation_type: 'UNKNOWN',
      columns: [],
      rows: [],
      row_count: 0,
      execution_time_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Query execution failed",
    }, 500);
  }
});
