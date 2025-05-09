// /api/sse.ts
import { createMcpHandler } from "@vercel/mcp-adapter";

const handler = createMcpHandler(() => {
  // no tools, just SSE
});

export const GET = handler;
