/**
 * POST /validate-query - Rule-Based SQL Validation
 * 
 * This is the CORE INTELLIGENCE of Prism AI.
 * All safety, correctness, and access control is enforced here using
 * deterministic rule-based logic - NOT the LLM.
 * 
 * Validation checks:
 * - SELECT-only queries (blocks INSERT, UPDATE, DELETE, DROP, etc.)
 * - Table existence in schema
 * - Column existence in schema
 * - Role-based table access
 * - LIMIT clause enforcement
 * - Multiple statement detection
 * - Comment injection prevention
 * 
 * SCALABILITY NOTES:
 * - Pure function design - easily testable and scalable
 * - No external dependencies for validation logic
 * - Can be extended with custom rule plugins
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateSQL, getBlockedExplanation, SchemaTable } from "../_shared/sql-validator.ts";

interface ValidateQueryRequest {
  sql: string;
  role: "creator" | "user";
  schema?: SchemaTable[];
  allowed_tables?: string[]; // Tables allowed for 'user' role
}

interface ValidateQueryResponse {
  is_valid: boolean;
  sanitized_sql?: string;
  explanation: string;
  blocked_reason?: string;
  checks_performed: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only accept POST
  if (req.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", 405);
  }

  try {
    const body: ValidateQueryRequest = await req.json();

    // Validate required fields
    if (!body.sql || body.sql.trim().length === 0) {
      return jsonResponse({
        is_valid: false,
        explanation: "No SQL query provided.",
        blocked_reason: "Query cannot be empty.",
        checks_performed: ["empty_check"],
      });
    }

    const role = body.role || "user";
    
    // Use provided schema or demo schema
    const schema: SchemaTable[] = body.schema || [
      {
        table_name: "demo_users",
        columns: [
          { column_name: "id", data_type: "uuid", is_nullable: "NO" },
          { column_name: "email", data_type: "varchar", is_nullable: "NO" },
          { column_name: "name", data_type: "varchar", is_nullable: "YES" },
          { column_name: "created_at", data_type: "timestamp", is_nullable: "NO" },
        ],
      },
      {
        table_name: "demo_orders",
        columns: [
          { column_name: "id", data_type: "uuid", is_nullable: "NO" },
          { column_name: "user_id", data_type: "uuid", is_nullable: "NO" },
          { column_name: "total_amount", data_type: "numeric", is_nullable: "NO" },
          { column_name: "status", data_type: "varchar", is_nullable: "NO" },
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
          { column_name: "in_stock", data_type: "boolean", is_nullable: "NO" },
        ],
      },
    ];

    // Default allowed tables for 'user' role
    const allowedTables = body.allowed_tables || ["demo_users", "demo_products"];

    // Run validation
    const validationResult = validateSQL(body.sql, schema, role, allowedTables);

    // Build list of checks performed (for transparency)
    const checksPerformed = [
      "empty_query_check",
      "multiple_statements_check",
      "select_only_check",
      "dangerous_keywords_check",
      "table_existence_check",
      "column_existence_check",
      "role_access_check",
      "limit_enforcement",
    ];

    const response: ValidateQueryResponse = {
      is_valid: validationResult.is_valid,
      sanitized_sql: validationResult.sanitized_sql,
      explanation: getBlockedExplanation(validationResult),
      blocked_reason: validationResult.is_valid ? undefined : validationResult.reason,
      checks_performed: checksPerformed,
    };

    return jsonResponse(response);

  } catch (error) {
    console.error("Validate query error:", error);
    return errorResponse(
      `Failed to validate query: ${error instanceof Error ? error.message : "Unknown error"}`,
      500
    );
  }
});
