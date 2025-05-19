#!/usr/bin/env node
// scripts/call-split-pose.mjs

const [, , origin, quoteId] = process.argv;

if (!origin || !quoteId) {
  console.error("Usage: node scripts/call-split-pose.mjs <url> <quoteId>");
  process.exit(1);
}

async function main() {
  const url = `${origin.replace(/\/$/, "")}/api/split-pose`;
  console.log("🔪 Calling direct splitPoseItems →", url);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quoteId }),
  });

  if (!res.ok) {
    console.error(`❌ Server returned ${res.status} ${res.statusText}`);
    const text = await res.text();
    try {
      console.error(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      console.error(text);
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
