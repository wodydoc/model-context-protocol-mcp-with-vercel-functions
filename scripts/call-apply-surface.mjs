#!/usr/bin/env node
// scripts/call-apply-surface.mjs

const [, , origin, quoteId] = process.argv;

if (!origin || !quoteId) {
  console.error("Usage: node scripts/call-apply-surface.mjs <url> <quoteId>");
  process.exit(1);
}

async function main() {
  const url = `${origin.replace(/\/$/, "")}/api/server`;
  console.log("🔧 Calling applySurfaceEstimates →", url);

  const body = {
    type: "tool_request",
    tool: "applySurfaceEstimates",
    arguments: { quoteId },
  };

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("❌ Network error:", err.message);
    process.exit(1);
  }

  if (!res.ok) {
    console.error(`❌ Server returned ${res.status} ${res.statusText}`);
    try {
      // Try to parse error as JSON for better formatting
      const errorText = await res.text();
      const errorJson = JSON.parse(errorText);
      console.error(JSON.stringify(errorJson, null, 2));
    } catch (e) {
      // Fallback to raw text if not JSON
      console.error(await res.text());
    }
    process.exit(1);
  }

  let payload;
  try {
    payload = await res.json();
  } catch (err) {
    console.error("❌ Failed to parse JSON:", err.message);
    console.error("Raw response:", await res.text());
    process.exit(1);
  }

  console.log("✅ Tool executed successfully");
  console.log("📦 Tool response:");
  console.dir(payload, { depth: null });
}

main().catch((err) => {
  console.error("❌ Unhandled error:", err);
  process.exit(1);
});
