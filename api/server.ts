export const config = { runtime: "edge" };
// ─────────────────────────────────────────────────────────────────────────────
// /api/server.ts
// Single Edge Function for MCP: handles SSE (on GET+Accept) and JSON POST
// ─────────────────────────────────────────────────────────────────────────────

import { createMcpHandler } from "@vercel/mcp-adapter";
import { registerTools } from "../lib/mcp-tools.js";

/**
 * This one handler will:
 * - Stream SSE when you do GET + Accept: text/event-stream
 * - Respond to tool_request JSON when you POST a MCP payload
 */
const handler = createMcpHandler(
  registerTools,
  {},
  {
    verboseLogs: true,
    maxDuration: 120, // 2 minutes max per request
    redisUrl: process.env.REDIS_URL, // Upstash Redis (rediss://…)
  }
);

// **DEFAULT EXPORT** so Vercel Functions actually invoke this handler
export default handler;
