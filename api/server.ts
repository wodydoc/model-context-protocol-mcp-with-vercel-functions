export const config = { runtime: "edge" };
// ─────────────────────────────────────────────────────────────────────────────
// /api/server.ts
// Single Edge Function for MCP: handles SSE (on GET+Accept) and JSON POST
// ─────────────────────────────────────────────────────────────────────────────

import { createMcpHandler } from "@vercel/mcp-adapter";
import { registerTools } from "../lib/mcp-tools.js";

/**
 * Single Edge Function for MCP:
 *  • GET + Accept:text/event-stream → SSE
 *  • POST + MCP JSON         → tool calls
 */
const handler = createMcpHandler(
  registerTools,
  {},
  {
    verboseLogs: true,
    maxDuration: 120, // 2 min
    redisUrl: process.env.REDIS_URL,
    basePath: "/api", // ← makes it match /api/server
  }
);

// **DEFAULT EXPORT** so Vercel Functions actually invoke this handler
export default handler;
