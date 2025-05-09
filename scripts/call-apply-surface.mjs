// scripts/call-apply-surface.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"; // 👈 use SSE

const origin = process.argv[2];
const quoteId = process.argv[3];

if (!origin || !quoteId) {
  console.error("Usage: node scripts/call-apply-surface.mjs <url> <quoteId>");
  process.exit(1);
}

async function main() {
  const transport = new SSEClientTransport(new URL(`${origin}/sse`)); // ✅ MATCHES test-client

  const client = new Client(
    { name: "test-runner", version: "1.0.0" },
    { capabilities: { prompts: {}, resources: {}, tools: {} } }
  );

  await client.connect(transport);
  console.log("🔧 Calling tool: applySurfaceEstimates...");

  const result = await client.callTool("applySurfaceEstimates", { quoteId });

  console.log("📦 Tool response:");
  console.dir(result, { depth: null });
}

main();
