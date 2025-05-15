// /api/sse.ts
import { createMcpHandler } from "@vercel/mcp-adapter";

// Standalone SSE endpoint (for MCP debugging or async responses)
const handler = createMcpHandler(
  () => {
    // Tools are defined in server.ts
  },
  {},
  {
    verboseLogs: true,
    maxDuration: 60,
    basePath: "/api",
  }
);

export const GET = handler;
