#!/usr/bin/env node
// scripts/call-quote-linter.mjs

const [, , origin, quoteId] = process.argv;

if (!origin || !quoteId) {
  console.error("Usage: node scripts/call-quote-linter.mjs <url> <quoteId>");
  process.exit(1);
}

async function main() {
  const url = `${origin.replace(/\/$/, "")}/api/quote-linter`;
  console.log("🔍 Calling direct quoteLinter →", url);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  const payload = await res.json();
  console.log("✅ Tool executed successfully");
  console.log("📦 Tool response:");
  console.dir(payload, { depth: null });
}

main().catch((err) => {
  console.error("❌ Unhandled error:", err);
  process.exit(1);
});
