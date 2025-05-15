#!/usr/bin/env node
// scripts/call-apply-surface.mjs
// Simple JSON POST to your /api/server endpoint—no streaming, no SDK.

const [, , origin, quoteId] = process.argv;

if (!origin || !quoteId) {
  console.error("Usage: node scripts/call-apply-surface.mjs <url> <quoteId>");
  process.exit(1);
}

async function main() {
  // Build the URL and ensure no trailing slash
  const url = `${origin.replace(/\/$/, "")}/api/server`;
  console.log("🔧 Calling applySurfaceEstimates →", url);

  // MCP tool_request payload
  const body = {
    type: "tool_request",
    tool: "applySurfaceEstimates",
    arguments: { quoteId },
  };

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("❌ Network error:", err.message);
    process.exit(1);
  }

  if (!res.ok) {
    console.error(`❌ Server returned ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }

  let payload;
  try {
    payload = await res.json();
  } catch (err) {
    console.error("❌ Failed to parse JSON:", err.message);
    process.exit(1);
  }

  console.log("📦 Tool response:");
  console.dir(payload, { depth: null });
}

main();
