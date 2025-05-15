export const config = { runtime: "edge" };
// ─────────────────────────────────────────────────────────────────────────────
// /api/sse.ts
// Edge‐runtime MCP SSE endpoint: real‐time streaming for debugging or async
// ─────────────────────────────────────────────────────────────────────────────

import { createMcpHandler } from "@vercel/mcp-adapter";
import { registerTools } from "../lib/mcp-tools.js";

/**
 * Construct the MCP handler for SSE:
 * - registerTools: use same tool set as /api/server.ts
 * - {}: no additional init options
 * - config: basePath, logging, shorter timeout for streaming
 */
const handler = createMcpHandler(
  registerTools,
  {},
  {
    basePath: "/api",
    verboseLogs: true,
    maxDuration: 60, // 1 minute max for streaming
    redisUrl: process.env.REDIS_URL, // Upstash Redis (rediss://…)
  }
);

/** Expose GET only for SSE streams */
export const GET = handler;
