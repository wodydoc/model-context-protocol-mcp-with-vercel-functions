// ─────────────────────────────────────────────────────────────────────────────
// /api/server.ts
// Edge‐runtime MCP HTTP endpoint: registers all tools and handles GET/POST/DELETE
// ─────────────────────────────────────────────────────────────────────────────

export const config = { runtime: "edge" };

import { createMcpHandler } from "@vercel/mcp-adapter";
import { registerTools } from "../lib/mcp-tools.js";

/**
 * Construct the MCP handler:
 * - registerTools: centralized tool registrations
 * - {}: no additional init options
 * - config: basePath, logging, timeouts, and Redis URL
 */
const handler = createMcpHandler(
  registerTools,
  {},
  {
    basePath: "/api",
    verboseLogs: true,
    maxDuration: 120, // 2 minutes max per request
    redisUrl: process.env.REDIS_URL, // Upstash Redis (rediss://…)
  }
);

/** Expose HTTP methods for the MCP handler */
export const GET = handler;
export const POST = handler;
export const DELETE = handler;
