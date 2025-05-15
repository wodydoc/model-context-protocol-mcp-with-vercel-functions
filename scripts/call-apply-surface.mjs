// scripts/call-apply-surface.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { HttpClientTransport } from "@modelcontextprotocol/sdk/client/http.js";

const origin = process.argv[2];
const quoteId = process.argv[3];

if (!origin || !quoteId) {
  console.error("Usage: node scripts/call-apply-surface.mjs <url> <quoteId>");
  process.exit(1);
}

const DEBUG = true;

async function main() {
  const httpUrl = new URL(`${origin}/api/sse`);
  if (DEBUG) console.log("Connecting to HTTP endpoint:", httpUrl.toString());

  const transport = new HttpClientTransport(httpUrl);

  const client = new Client(
    { name: "test-runner", version: "1.0.0" },
    { capabilities: { prompts: {}, resources: {}, tools: {} } }
  );

  try {
    await client.connect(transport);
    console.log("🔧 Calling tool: applySurfaceEstimates...");
    const result = await client.callTool("applySurfaceEstimates", { quoteId });
    console.log("📦 Tool response:");
    console.dir(result, { depth: null });
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.code) console.error("Error code:", error.code);
    process.exit(1);
  }
}

main();
