/**
 * Prism AI API Service
 * 
 * Client-side service for interacting with Prism AI backend endpoints.
 * All database operations go through validated edge functions with CRUD support.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface SchemaColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default?: string | null;
}

export interface SchemaTable {
  table_name: string;
  columns: SchemaColumn[];
}

export interface SchemaResponse {
  tables: SchemaTable[];
  extracted_at: string;
  database_label: string;
}

export type OperationType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL' | 'UNKNOWN';
export type RiskLevel = 'safe' | 'moderate' | 'high' | 'critical';

export interface OperationAnalysis {
  operation_type: OperationType;
  risk_level: RiskLevel;
  affected_tables: string[];
  affected_columns: string[];
  estimated_rows: string;
  warnings: string[];
  requires_confirmation: boolean;
}

export interface GenerateQueryRequest {
  user_question: string;
  role: 'creator' | 'user';
  schema?: { tables: SchemaTable[] };
}

export interface GenerateQueryResponse {
  sql: string | null;
  explanation: string;
  action_type: 'READ' | 'WRITE' | 'STRUCTURAL' | 'DESTRUCTIVE' | 'UNKNOWN';
  confidence: 'high' | 'medium' | 'low';
  operation_analysis?: OperationAnalysis;
  error?: string;
}

export interface ValidateQueryRequest {
  sql: string;
  role: 'creator' | 'user';
  schema?: SchemaTable[];
  allowed_tables?: string[];
}

export interface ValidateQueryResponse {
  is_valid: boolean;
  sanitized_sql?: string;
  explanation: string;
  blocked_reason?: string;
  checks_performed: string[];
  operation_analysis?: OperationAnalysis;
}

export interface ExecuteQueryRequest {
  sql: string;
  role?: 'creator' | 'user';
  schema?: SchemaTable[];
  confirmed?: boolean;
  skip_revalidation?: boolean;
}

export interface ExecuteQueryResponse {
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

/**
 * Helper to call edge functions with error handling
 */
async function callEdgeFunction<T>(
  functionName: string,
  options?: {
    method?: 'GET' | 'POST';
    body?: unknown;
  }
): Promise<T> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  
  const response = await fetch(url, {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch database schema
 */
export async function fetchSchema(): Promise<SchemaResponse> {
  return callEdgeFunction<SchemaResponse>('schema');
}

/**
 * Generate SQL from natural language using AI
 */
export async function generateQuery(request: GenerateQueryRequest): Promise<GenerateQueryResponse> {
  return callEdgeFunction<GenerateQueryResponse>('generate-query', {
    method: 'POST',
    body: request,
  });
}

/**
 * Validate SQL query against rules
 */
export async function validateQuery(request: ValidateQueryRequest): Promise<ValidateQueryResponse> {
  return callEdgeFunction<ValidateQueryResponse>('validate-query', {
    method: 'POST',
    body: request,
  });
}

/**
 * Execute validated SQL query
 */
export async function executeQuery(request: ExecuteQueryRequest): Promise<ExecuteQueryResponse> {
  return callEdgeFunction<ExecuteQueryResponse>('execute-query', {
    method: 'POST',
    body: request,
  });
}

/**
 * Full pipeline: Generate → Validate → Execute (with confirmation step for writes)
 */
export async function processNaturalLanguageQuery(
  question: string,
  role: 'creator' | 'user' = 'user',
  confirmWrite: boolean = false
): Promise<{
  generated: GenerateQueryResponse;
  validated?: ValidateQueryResponse;
  executed?: ExecuteQueryResponse;
  requiresConfirmation?: boolean;
  error?: string;
}> {
  try {
    // Step 1: Generate SQL from question
    const generated = await generateQuery({ user_question: question, role });
    
    if (!generated.sql || generated.error) {
      return { generated, error: generated.explanation };
    }

    // Step 2: Validate generated SQL
    const validated = await validateQuery({ sql: generated.sql, role });
    
    if (!validated.is_valid) {
      return { generated, validated, error: validated.blocked_reason };
    }

    // Step 3: Check if confirmation is needed for write operations
    const opAnalysis = generated.operation_analysis;
    if (opAnalysis?.requires_confirmation && !confirmWrite) {
      return { 
        generated, 
        validated, 
        requiresConfirmation: true,
        error: 'This operation requires confirmation before execution.' 
      };
    }

    // Step 4: Execute validated SQL
    const executed = await executeQuery({ 
      sql: validated.sanitized_sql || generated.sql,
      role,
      confirmed: confirmWrite,
    });

    // Check if execution still requires confirmation
    if (executed.requires_confirmation) {
      return {
        generated,
        validated,
        executed,
        requiresConfirmation: true,
      };
    }

    return { generated, validated, executed };
    
  } catch (error) {
    return {
      generated: {
        sql: null,
        explanation: 'Failed to process query',
        action_type: 'UNKNOWN',
        confidence: 'low',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute a confirmed write operation
 */
export async function executeConfirmedQuery(
  sql: string,
  role: 'creator' | 'user' = 'creator'
): Promise<ExecuteQueryResponse> {
  return executeQuery({
    sql,
    role,
    confirmed: true,
  });
}
