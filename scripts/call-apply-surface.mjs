// scripts/call-apply-surface.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// import { HttpClientTransport } from "@modelcontextprotocol/sdk/client/http.js"; // Changed from SSE to HTTP
// import { HttpClientTransport } from "@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const origin = process.argv[2];
const quoteId = process.argv[3];

if (!origin || !quoteId) {
  console.error("Usage: node scripts/call-apply-surface.mjs <url> <quoteId>");
  process.exit(1);
}

// Add debug flag to see what's happening
const DEBUG = true;

async function main() {
  // Update the URL to point to the server endpoint
  const httpUrl = new URL(`${origin}/api/server`); // No need for /sse with HTTP transport

  if (DEBUG) {
    console.log("Connecting to HTTP endpoint:", httpUrl.toString());
  }

  const transport = new StreamableHTTPClientTransport(httpUrl);

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
    if (error.code) {
      console.error("Error code:", error.code);
    }
    process.exit(1);
  }
}

main();
