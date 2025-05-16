// export const config = { runtime: "edge" };
// ─────────────────────────────────────────────────────────────────────────────
// /api/server.ts
// Single Edge Function for MCP: serves both SSE (GET + text/event‑stream)
// and JSON tool calls (POST + application/json)
// ─────────────────────────────────────────────────────────────────────────────

import { createMcpHandler } from "@vercel/mcp-adapter";
import { registerTools } from "../lib/mcp-tools.js";

/**
 * One handler to rule them all:
 *  • GET + Accept:text/event‑stream → SSE
 *  • POST + JSON payload            → tool invocation
 */
const handler = createMcpHandler(
  registerTools,
  {
    // Server options - keep this empty or add valid options
  },
  {
    verboseLogs: true,
    maxDuration: 120, // 2 minutes max
    redisUrl: process.env.REDIS_URL,
    // Add basePath to properly configure endpoints
    basePath: "/api",
    // ⇢ No basePath needed here! the function lives at /api/server
  }
);

// default export is what Vercel will execute for ALL HTTP methods
export default handler;
