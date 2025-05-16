#!/usr/bin/env node
// scripts/call-apply-surface-direct.mjs

const [, , origin, quoteId] = process.argv;

if (!origin || !quoteId) {
  console.error(
    "Usage: node scripts/call-apply-surface-direct.mjs <url> <quoteId>"
  );
  process.exit(1);
}

async function main() {
  const url = `${origin.replace(/\/$/, "")}/api/apply-surface`;
  console.log("🔧 Calling direct apply-surface →", url);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quoteId }),
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

  console.log("✅ Surface estimates applied successfully");
  console.log("📦 Response:");
  console.dir(payload, { depth: null });
}

main().catch((err) => {
  console.error("❌ Unhandled error:", err);
  process.exit(1);
});
