// ✅ /api/sse.ts
import { createMcpHandler } from "@vercel/mcp-adapter";

const handler = createMcpHandler(() => {
  // no tools defined here – it's just the SSE handler endpoint
});

export const GET = handler;
