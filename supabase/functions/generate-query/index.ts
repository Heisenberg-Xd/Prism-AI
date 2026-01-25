/**
 * POST /generate-query - AI-Powered SQL Generation (with CRUD support)
 * 
 * Uses LLM (Gemini via Lovable AI Gateway) to generate SQL from natural language.
 * Now supports CRUD operations with appropriate warnings for Creators.
 * 
 * SECURITY MODEL:
 * - Users: SELECT-only queries
 * - Creators: Full CRUD with risk analysis
 * 
 * IMPORTANT: LLM output is NEVER executed directly - it must pass through validation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { analyzeOperation, detectOperationType, OperationAnalysis } from "../_shared/sql-validator.ts";

interface GenerateQueryRequest {
  user_question: string;
  role: "creator" | "user";
  schema?: {
    tables: Array<{
      table_name: string;
      columns: Array<{
        column_name: string;
        data_type: string;
        is_nullable?: string;
      }>;
    }>;
  };
}

interface GenerateQueryResponse {
  sql: string | null;
  explanation: string;
  action_type: "READ" | "WRITE" | "STRUCTURAL" | "DESTRUCTIVE" | "UNKNOWN";
  confidence: "high" | "medium" | "low";
  operation_analysis?: OperationAnalysis;
  error?: string;
}

/**
 * Build schema-aware system prompt
 */
function buildSystemPrompt(schema: GenerateQueryRequest["schema"], role: "creator" | "user"): string {
  const schemaContext = schema?.tables?.map(table => {
    const cols = table.columns.map(c => `${c.column_name} (${c.data_type}${c.is_nullable === 'YES' ? ', nullable' : ''})`).join(", ");
    return `- ${table.table_name}: ${cols}`;
  }).join("\n") || "No schema available";

  const operationsAllowed = 'SELECT, INSERT, UPDATE, and DELETE';

  const crudInstructions = `
CRUD OPERATIONS (${role.toUpperCase()} Role):
- You CAN generate INSERT, UPDATE, and DELETE queries when explicitly requested
- Always include WHERE clauses for UPDATE and DELETE (unless user specifically wants all rows)
- For INSERT, use proper column lists and VALUES syntax
- For UPDATE, clearly identify which rows will be affected
- For DELETE, be explicit about what will be removed
- NEVER generate DROP, ALTER, CREATE, or TRUNCATE statements

CRUD RESPONSE REQUIREMENTS:
- Clearly explain what data will be modified
- Warn about potential impacts
- If the operation seems risky (no WHERE clause, affects many rows), express caution`;

  return `You are a SQL query generator for a PostgreSQL database. Your role is to convert natural language questions into safe SQL queries.

CURRENT ROLE: ${role.toUpperCase()}
ALLOWED OPERATIONS: ${operationsAllowed}

DATABASE SCHEMA:
${schemaContext}

STRICT RULES:
1. Only reference tables and columns that exist in the schema above
2. Use standard PostgreSQL syntax
3. For SELECT queries: ALWAYS include a LIMIT clause (max 100 unless specified)
4. NEVER include SQL comments
5. NEVER include multiple statements (no semicolon-separated queries)
6. If the question cannot be answered safely, respond with: CANNOT_GENERATE
7. If tables/columns don't exist, respond with: SCHEMA_MISMATCH
${crudInstructions}

RESPONSE FORMAT (JSON):
{
  "sql": "THE SQL QUERY",
  "explanation": "Plain language explanation of what this query does and its impact",
  "confidence": "high|medium|low"
}

Examples:
SELECT: {"sql": "SELECT name, email FROM demo_users LIMIT 100", "explanation": "Retrieves names and emails of all users.", "confidence": "high"}
INSERT: {"sql": "INSERT INTO demo_products (name, price, category) VALUES ('Widget', 29.99, 'Tools')", "explanation": "Adds a new product called 'Widget' priced at $29.99 in the Tools category.", "confidence": "high"}
UPDATE: {"sql": "UPDATE demo_users SET status = 'inactive' WHERE email = 'test@example.com'", "explanation": "Sets the status to 'inactive' for the user with email test@example.com. This affects 1 row.", "confidence": "high"}
DELETE: {"sql": "DELETE FROM demo_orders WHERE status = 'cancelled' AND created_at < '2024-01-01'", "explanation": "Removes all cancelled orders from before 2024. This is permanent and cannot be undone.", "confidence": "medium"}`;
}

/**
 * Call Lovable AI Gateway
 */
async function callLLM(userQuestion: string, schema: GenerateQueryRequest["schema"], role: "creator" | "user"): Promise<{
  sql: string;
  explanation: string;
  confidence: "high" | "medium" | "low";
}> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const systemPrompt = buildSystemPrompt(schema, role);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuestion },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("API credits exhausted.");
    }
    const errorText = await response.text();
    console.error("LLM API error:", response.status, errorText);
    throw new Error(`AI service error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        sql: parsed.sql || "PARSE_ERROR",
        explanation: parsed.explanation || "Unable to explain query.",
        confidence: parsed.confidence || "low",
      };
    }
  } catch (e) {
    console.error("Failed to parse LLM response:", e);
  }

  // Fallback for raw SQL responses
  const upperContent = content.trim().toUpperCase();
  if (upperContent.startsWith("SELECT") || 
      upperContent.startsWith("INSERT") || 
      upperContent.startsWith("UPDATE") || 
      upperContent.startsWith("DELETE")) {
    return {
      sql: content.trim(),
      explanation: "Generated SQL from your question.",
      confidence: "low",
    };
  }

  return {
    sql: "GENERATION_FAILED",
    explanation: content || "Unable to generate a safe query.",
    confidence: "low",
  };
}

/**
 * Map operation type to action type
 */
function determineActionType(sql: string): GenerateQueryResponse["action_type"] {
  const opType = detectOperationType(sql);
  
  switch (opType) {
    case 'SELECT':
      return 'READ';
    case 'INSERT':
      return 'WRITE';
    case 'UPDATE':
      return 'WRITE';
    case 'DELETE':
      return 'DESTRUCTIVE';
    case 'DDL':
      return 'STRUCTURAL';
    default:
      return 'UNKNOWN';
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", 405);
  }

  try {
    const body: GenerateQueryRequest = await req.json();
    
    if (!body.user_question || body.user_question.trim().length === 0) {
      return errorResponse("user_question is required", 400);
    }

    const role = body.role || "user";
    
    // Default demo schema
    let schema = body.schema;
    if (!schema || !schema.tables || schema.tables.length === 0) {
      schema = {
        tables: [
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
        ],
      };
    }

    // Generate SQL
    const llmResult = await callLLM(body.user_question, schema, role);

    // Handle error codes
    if (llmResult.sql === "CANNOT_GENERATE") {
      return jsonResponse({
        sql: null,
        explanation: "This request cannot be safely converted to SQL. Please rephrase your question.",
        action_type: "UNKNOWN",
        confidence: "high",
        error: "CANNOT_GENERATE",
      });
    }

    if (llmResult.sql === "SCHEMA_MISMATCH") {
      return jsonResponse({
        sql: null,
        explanation: "The requested data doesn't match the available database schema.",
        action_type: "UNKNOWN",
        confidence: "high",
        error: "SCHEMA_MISMATCH",
      });
    }

    // Analyze the generated SQL
    const operationAnalysis = analyzeOperation(llmResult.sql, schema.tables.map(t => ({
      table_name: t.table_name,
      columns: t.columns.map(c => ({
        column_name: c.column_name,
        data_type: c.data_type,
        is_nullable: c.is_nullable || 'YES',
      })),
    })));

    // Add warnings to explanation for risky operations
    let enhancedExplanation = llmResult.explanation;
    if (operationAnalysis.warnings.length > 0 && operationAnalysis.risk_level !== 'safe') {
      enhancedExplanation += '\n\n⚠️ ' + operationAnalysis.warnings.join(' ');
    }

    const response: GenerateQueryResponse = {
      sql: llmResult.sql,
      explanation: enhancedExplanation,
      action_type: determineActionType(llmResult.sql),
      confidence: llmResult.confidence,
      operation_analysis: operationAnalysis,
    };

    return jsonResponse(response);

  } catch (error) {
    console.error("Generate query error:", error);
    return errorResponse(
      `Failed to generate query: ${error instanceof Error ? error.message : "Unknown error"}`,
      500
    );
  }
});
