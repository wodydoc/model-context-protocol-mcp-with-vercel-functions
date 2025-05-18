#!/usr/bin/env node
// scripts/call-fill-missing.mjs

const [, , origin, quoteId] = process.argv;

if (!origin || !quoteId) {
  console.error("Usage: node scripts/call-fill-missing.mjs <url> <quoteId>");
  process.exit(1);
}

async function main() {
  const url = `${origin.replace(/\/$/, "")}/api/fill-missing`;
  console.log("🔧 Calling direct fillMissingInfo →", url);

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
      const errorText = await res.text();
      const errorJson = JSON.parse(errorText);
      console.error(JSON.stringify(errorJson, null, 2));
    } catch (e) {
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
