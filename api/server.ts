// ─────────────────────────────────────────────────────────────────────────────
// /api/server.ts
// Single Function for MCP: serves both SSE (GET + text/event‑stream)
// and JSON tool calls (POST + application/json)
// ─────────────────────────────────────────────────────────────────────────────

import { createMcpHandler } from "@vercel/mcp-adapter";
import { registerTools } from "../lib/mcp-tools.js";

// Remove the runtime config as suggested by Vercel
// export const config = { runtime: "nodejs" };

/**
 * One handler to rule them all:
 *  • GET + Accept:text/event‑stream → SSE
 *  • POST + JSON payload            → tool invocation
 */
const handler = createMcpHandler(
  registerTools,
  {}, // Keep server options empty to avoid TypeScript errors
  {
    verboseLogs: true,
    maxDuration: 120, // 2 minutes max
    // Comment out Redis URL to disable SSE temporarily
    // redisUrl: process.env.REDIS_URL,
    basePath: "/api",
  }
);

// default export is what Vercel will execute for ALL HTTP methods
export default handler;
