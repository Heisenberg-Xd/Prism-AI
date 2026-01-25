/**
 * SQL Validator Module - Core Intelligence for Prism AI
 * 
 * This module implements rule-based validation for:
 * - SELECT queries (always allowed)
 * - CRUD operations (INSERT, UPDATE, DELETE) with risk analysis
 * - Role-based access control (Creator vs User)
 * - Safety enforcement and impact analysis
 * 
 * SECURITY MODEL:
 * - Users: SELECT only (read-only access)
 * - Creators: Full CRUD with explicit confirmation required
 * - All operations require table/column validation
 */

export interface SchemaColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

export interface SchemaTable {
  table_name: string;
  columns: SchemaColumn[];
}

export type OperationType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL' | 'UNKNOWN';
export type RiskLevel = 'safe' | 'moderate' | 'high' | 'critical';

export interface OperationAnalysis {
  operation_type: OperationType;
  risk_level: RiskLevel;
  affected_tables: string[];
  affected_columns: string[];
  estimated_rows: string; // "single", "multiple", "all", "unknown"
  warnings: string[];
  requires_confirmation: boolean;
}

export interface ValidationResult {
  is_valid: boolean;
  reason?: string;
  sanitized_sql?: string;
  operation_analysis?: OperationAnalysis;
}

// Role-based operation permissions - Both roles can now perform CRUD
const ROLE_PERMISSIONS: Record<string, OperationType[]> = {
  creator: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  user: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
};

// Maximum row limit
const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 100;

// DDL keywords - always blocked
const DDL_KEYWORDS = [
  'DROP',
  'ALTER',
  'TRUNCATE',
  'CREATE',
  'GRANT',
  'REVOKE',
];

// System-level dangerous patterns - always blocked
const BLOCKED_PATTERNS = [
  'INTO OUTFILE',
  'INTO DUMPFILE',
  'LOAD_FILE',
  'EXECUTE',
  'EXEC',
];

// SQL comment patterns for injection prevention
const COMMENT_PATTERNS = [
  /--.*$/gm,
  /\/\*[\s\S]*?\*\//g,
  /#.*$/gm,
];

/**
 * Remove SQL comments to prevent injection attacks
 */
function removeComments(sql: string): string {
  let cleaned = sql;
  for (const pattern of COMMENT_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  return cleaned.trim();
}

/**
 * Check for multiple statements
 */
function hasMultipleStatements(sql: string): boolean {
  const cleaned = removeComments(sql);
  const noStrings = cleaned
    .replace(/'[^']*'/g, '')
    .replace(/"[^"]*"/g, '');
  
  const statements = noStrings.split(';').filter(s => s.trim().length > 0);
  return statements.length > 1;
}

/**
 * Detect operation type from SQL
 */
export function detectOperationType(sql: string): OperationType {
  const cleaned = removeComments(sql).toUpperCase().trim();
  
  // Check DDL first (always blocked)
  for (const keyword of DDL_KEYWORDS) {
    if (new RegExp(`^${keyword}\\b`).test(cleaned) || 
        new RegExp(`\\b${keyword}\\s+(TABLE|INDEX|VIEW|DATABASE)`, 'i').test(cleaned)) {
      return 'DDL';
    }
  }
  
  if (cleaned.startsWith('SELECT') || cleaned.startsWith('WITH')) {
    return 'SELECT';
  }
  if (cleaned.startsWith('INSERT')) {
    return 'INSERT';
  }
  if (cleaned.startsWith('UPDATE')) {
    return 'UPDATE';
  }
  if (cleaned.startsWith('DELETE')) {
    return 'DELETE';
  }
  
  return 'UNKNOWN';
}

/**
 * Extract table names from SQL query
 */
export function extractTableNames(sql: string): string[] {
  const cleaned = removeComments(sql);
  const tables: Set<string> = new Set();
  
  // FROM clause
  const fromRegex = /\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  let match;
  while ((match = fromRegex.exec(cleaned)) !== null) {
    tables.add(match[1].toLowerCase());
  }
  
  // JOIN clause
  const joinRegex = /\bJOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  while ((match = joinRegex.exec(cleaned)) !== null) {
    tables.add(match[1].toLowerCase());
  }
  
  // INSERT INTO
  const insertRegex = /\bINSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  while ((match = insertRegex.exec(cleaned)) !== null) {
    tables.add(match[1].toLowerCase());
  }
  
  // UPDATE
  const updateRegex = /\bUPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  while ((match = updateRegex.exec(cleaned)) !== null) {
    tables.add(match[1].toLowerCase());
  }
  
  // DELETE FROM
  const deleteRegex = /\bDELETE\s+FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  while ((match = deleteRegex.exec(cleaned)) !== null) {
    tables.add(match[1].toLowerCase());
  }
  
  return Array.from(tables);
}

/**
 * Extract column names from SQL
 */
export function extractColumnNames(sql: string): string[] {
  const cleaned = removeComments(sql);
  const columns: Set<string> = new Set();
  const upperCleaned = cleaned.toUpperCase();
  
  // SELECT columns
  const selectMatch = cleaned.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
  if (selectMatch && selectMatch[1].trim() !== '*') {
    const parts = selectMatch[1].split(',');
    for (const part of parts) {
      const colMatch = part.trim().match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (colMatch) {
        columns.add(colMatch[1].toLowerCase());
      }
    }
  }
  
  // INSERT columns
  const insertMatch = cleaned.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i);
  if (insertMatch) {
    const cols = insertMatch[1].split(',').map(c => c.trim().toLowerCase());
    cols.forEach(c => columns.add(c));
  }
  
  // UPDATE SET columns
  const updateMatch = cleaned.match(/SET\s+([\s\S]+?)(?:WHERE|$)/i);
  if (updateMatch) {
    const setClause = updateMatch[1];
    const setRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=/gi;
    let match;
    while ((match = setRegex.exec(setClause)) !== null) {
      columns.add(match[1].toLowerCase());
    }
  }
  
  // WHERE clause columns
  const whereMatch = cleaned.match(/WHERE\s+([\s\S]+?)(?:ORDER|GROUP|LIMIT|$)/i);
  if (whereMatch) {
    const colRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|<|>|LIKE|IN|IS|BETWEEN)/gi;
    let match;
    while ((match = colRegex.exec(whereMatch[1])) !== null) {
      columns.add(match[1].toLowerCase());
    }
  }
  
  return Array.from(columns);
}

/**
 * Analyze the risk level and impact of an operation
 */
export function analyzeOperation(sql: string, schema: SchemaTable[]): OperationAnalysis {
  const opType = detectOperationType(sql);
  const tables = extractTableNames(sql);
  const columns = extractColumnNames(sql);
  const upperSQL = sql.toUpperCase();
  
  const warnings: string[] = [];
  let riskLevel: RiskLevel = 'safe';
  let estimatedRows: string = 'unknown';
  let requiresConfirmation = false;
  
  // Determine risk based on operation type
  switch (opType) {
    case 'SELECT':
      riskLevel = 'safe';
      estimatedRows = 'multiple';
      break;
      
    case 'INSERT':
      riskLevel = 'moderate';
      requiresConfirmation = true;
      warnings.push('This will add new records to the database.');
      
      // Check if VALUES or SELECT
      if (upperSQL.includes('VALUES')) {
        const valuesCount = (upperSQL.match(/\),\s*\(/g) || []).length + 1;
        estimatedRows = valuesCount === 1 ? 'single' : 'multiple';
        warnings.push(`Inserting ${valuesCount} row(s).`);
      } else if (upperSQL.includes('SELECT')) {
        estimatedRows = 'multiple';
        riskLevel = 'high';
        warnings.push('INSERT from SELECT may affect many rows.');
      }
      break;
      
    case 'UPDATE':
      requiresConfirmation = true;
      
      if (!upperSQL.includes('WHERE')) {
        riskLevel = 'critical';
        estimatedRows = 'all';
        warnings.push('⚠️ NO WHERE CLAUSE - This will update ALL rows in the table!');
      } else {
        riskLevel = 'high';
        estimatedRows = 'multiple';
        warnings.push('This will modify existing records.');
        
        // Check for common "update all" patterns
        if (upperSQL.includes('WHERE 1=1') || upperSQL.includes('WHERE TRUE')) {
          riskLevel = 'critical';
          estimatedRows = 'all';
          warnings.push('⚠️ WHERE clause matches ALL rows!');
        }
      }
      break;
      
    case 'DELETE':
      requiresConfirmation = true;
      
      if (!upperSQL.includes('WHERE')) {
        riskLevel = 'critical';
        estimatedRows = 'all';
        warnings.push('⚠️ NO WHERE CLAUSE - This will DELETE ALL rows in the table!');
      } else {
        riskLevel = 'high';
        estimatedRows = 'multiple';
        warnings.push('This will permanently delete records.');
        
        if (upperSQL.includes('WHERE 1=1') || upperSQL.includes('WHERE TRUE')) {
          riskLevel = 'critical';
          estimatedRows = 'all';
          warnings.push('⚠️ WHERE clause matches ALL rows!');
        }
      }
      break;
      
    case 'DDL':
      riskLevel = 'critical';
      requiresConfirmation = true;
      warnings.push('DDL operations are blocked for safety.');
      break;
      
    default:
      riskLevel = 'high';
      requiresConfirmation = true;
      warnings.push('Unknown operation type detected.');
  }
  
  return {
    operation_type: opType,
    risk_level: riskLevel,
    affected_tables: tables,
    affected_columns: columns,
    estimated_rows: estimatedRows,
    warnings,
    requires_confirmation: requiresConfirmation,
  };
}

/**
 * Check for blocked patterns
 */
function hasBlockedPatterns(sql: string): string | null {
  const upper = sql.toUpperCase();
  
  for (const pattern of BLOCKED_PATTERNS) {
    if (upper.includes(pattern)) {
      return pattern;
    }
  }
  
  return null;
}

/**
 * Enforce LIMIT for SELECT queries
 */
function enforceLimit(sql: string): string {
  const cleaned = sql.trim();
  const existingLimit = sql.match(/\bLIMIT\s+(\d+)/i);
  
  if (existingLimit) {
    const limit = parseInt(existingLimit[1], 10);
    if (limit > MAX_LIMIT) {
      return cleaned.replace(/\bLIMIT\s+\d+/i, `LIMIT ${MAX_LIMIT}`);
    }
    return cleaned;
  }
  
  // Only add LIMIT to SELECT queries
  if (detectOperationType(sql) === 'SELECT') {
    const withoutSemicolon = cleaned.replace(/;*\s*$/, '');
    return `${withoutSemicolon} LIMIT ${DEFAULT_LIMIT}`;
  }
  
  return cleaned;
}

/**
 * Main validation function
 */
export function validateSQL(
  sql: string,
  schema: SchemaTable[],
  role: 'creator' | 'user' = 'user',
  allowedTables?: string[]
): ValidationResult {
  // Step 1: Empty check
  if (!sql || sql.trim().length === 0) {
    return {
      is_valid: false,
      reason: 'Query cannot be empty.',
    };
  }
  
  const cleaned = removeComments(sql);
  
  // Step 2: Multiple statements check
  if (hasMultipleStatements(cleaned)) {
    return {
      is_valid: false,
      reason: 'Multiple SQL statements are not allowed. Please submit one query at a time.',
    };
  }
  
  // Step 3: Blocked patterns check
  const blockedPattern = hasBlockedPatterns(cleaned);
  if (blockedPattern) {
    return {
      is_valid: false,
      reason: `Blocked pattern detected: "${blockedPattern}". This operation is not permitted.`,
    };
  }
  
  // Step 4: Detect operation type
  const opType = detectOperationType(cleaned);
  
  // Step 5: Check if DDL (always blocked)
  if (opType === 'DDL') {
    return {
      is_valid: false,
      reason: 'DDL operations (CREATE, DROP, ALTER, TRUNCATE) are not allowed. Only data operations are permitted.',
    };
  }
  
  // Step 6: Check role permissions
  const allowedOps = ROLE_PERMISSIONS[role] || ['SELECT'];
  if (!allowedOps.includes(opType)) {
    return {
      is_valid: false,
      reason: `Operation "${opType}" is not allowed for role "${role}". Allowed operations: ${allowedOps.join(', ')}.`,
    };
  }
  
  // Step 7: Validate table names
  const referencedTables = extractTableNames(cleaned);
  const schemaTableNames = schema.map(t => t.table_name.toLowerCase());
  
  for (const table of referencedTables) {
    if (!schemaTableNames.includes(table)) {
      return {
        is_valid: false,
        reason: `Table "${table}" does not exist. Available tables: ${schemaTableNames.join(', ')}.`,
      };
    }
  }
  
  // Step 8: Role-based table access for users
  if (role === 'user' && allowedTables) {
    const allowedLower = allowedTables.map(t => t.toLowerCase());
    for (const table of referencedTables) {
      if (!allowedLower.includes(table)) {
        return {
          is_valid: false,
          reason: `Access denied: Table "${table}" is not accessible with your permissions.`,
        };
      }
    }
  }
  
  // Step 9: Column validation (for referenced columns)
  const referencedColumns = extractColumnNames(cleaned);
  const tablesInQuery = schema.filter(t => referencedTables.includes(t.table_name.toLowerCase()));
  const columnsInQueryTables = tablesInQuery.flatMap(t => 
    t.columns.map(c => c.column_name.toLowerCase())
  );
  
  const skipList = ['count', 'sum', 'avg', 'max', 'min', 'now', 'current_timestamp', 'id'];
  for (const column of referencedColumns) {
    if (skipList.includes(column)) continue;
    
    if (columnsInQueryTables.length > 0 && !columnsInQueryTables.includes(column)) {
      return {
        is_valid: false,
        reason: `Column "${column}" does not exist in the queried table(s). Available: ${columnsInQueryTables.slice(0, 5).join(', ')}...`,
      };
    }
  }
  
  // Step 10: Apply LIMIT enforcement (SELECT only)
  const sanitizedSQL = enforceLimit(cleaned);
  
  // Step 11: Analyze operation for risk assessment
  const analysis = analyzeOperation(cleaned, schema);
  
  return {
    is_valid: true,
    sanitized_sql: sanitizedSQL,
    operation_analysis: analysis,
  };
}

/**
 * Get human-readable explanation
 */
export function getBlockedExplanation(result: ValidationResult): string {
  if (result.is_valid) {
    const analysis = result.operation_analysis;
    if (analysis && analysis.requires_confirmation) {
      return `Query is valid but requires confirmation. Risk level: ${analysis.risk_level.toUpperCase()}. ${analysis.warnings.join(' ')}`;
    }
    return 'Query is valid and safe to execute.';
  }
  return result.reason || 'Query was blocked for security reasons.';
}

/**
 * Generate impact summary for CRUD operations
 */
export function generateImpactSummary(analysis: OperationAnalysis): string {
  const lines: string[] = [];
  
  lines.push(`**Operation:** ${analysis.operation_type}`);
  lines.push(`**Risk Level:** ${analysis.risk_level.toUpperCase()}`);
  lines.push(`**Affected Tables:** ${analysis.affected_tables.join(', ') || 'Unknown'}`);
  lines.push(`**Estimated Rows:** ${analysis.estimated_rows}`);
  
  if (analysis.warnings.length > 0) {
    lines.push('');
    lines.push('**Warnings:**');
    analysis.warnings.forEach(w => lines.push(`- ${w}`));
  }
  
  return lines.join('\n');
}
