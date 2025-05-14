// /api/sse.ts
import { createMcpHandler } from "@vercel/mcp-adapter";

// Create a dedicated SSE handler
const handler = createMcpHandler(
  () => {
    // This is intentionally empty as we're just setting up the SSE endpoint
    // All tools are registered in server.ts
  },
  {},
  {
    verboseLogs: true,
    maxDuration: 60,
    basePath: "/api",
  }
);

export const GET = handler;
