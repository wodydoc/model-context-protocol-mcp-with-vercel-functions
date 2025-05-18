# 🧠 Renalto MCP Server — Vercel + Supabase

This repo powers the **Model Context Protocol (MCP)** server for Renalto's AI quote agent system.

We expose structured tools callable by LLM agents to **perform micro-edits on renovation quotes** — without full regeneration. The backend runs serverless on **Vercel Functions**, with a **PostgreSQL engine (Supabase)** for data persistence.

---

## 🚀 Live Tools

The following tools are registered via `/api/server.ts` and callable via MCP:

| Tool Name        | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `echo`           | Development echo test                                       |
| `updateVAT`      | Updates the VAT (`vat`) field of a quote                    |
| `splitPoseItems` | Splits `"fourniture_pose"` items into `fourniture` + `pose` |
| `applySurfaceEstimates` | Computes M1/M2 and P1/P2 fields from `surface × height`      |
| `fillMissingInfo`    | Fills missing `brand`, `coats`, `color`, `finish` with default values   |
| `quoteLinter`        | Validates quote structure without making edits                          |


All tools are typed with `zod` and safely integrated via Supabase.

---

## 🛠️ Tech Stack

* 🧠 **MCP Adapter** — `@vercel/mcp-adapter`
* 💃 **Supabase** — JSON-based row mutation and tool state
* 🔧 **Zod** — Schema validation for all tools
* 💻 **Vercel Functions** — Fluid compute, edge-ready tools

---

## 🧬 Project Structure

```
.
├── api
│   ├── apply-surface.ts         # Direct API endpoint for surface estimates
│   ├── fill-missing.ts         # Direct API endpoint to patch missing quote fields
│   ├── quote-linter.ts         # Direct API endpoint to lint quote structure
│   ├── health.ts                # Health check endpoint for Supabase connection
│   └── server.ts                # MCP handler with Node.js runtime config
├── lib
│   ├── mcp-tools.ts             # Tool definitions with enhanced logging
│   └── supabase.ts              # Supabase client with connection validation
├── public
│   └── index.html               # Basic landing page
├── scripts
│   ├── call-apply-surface-direct.mjs  # Script to test direct API endpoint
│   ├── call-apply-surface.mjs         # Script to test via MCP
│   ├── call-fill-missing.mjs         # Script to test fillMissingInfo via direct API
│   ├── call-quote-linter.mjs         # Script to test quoteLinter via direct API
│   ├── test-client.mjs          # Client to invoke tools via HTTP
│   └── test-streamable-http-client.mjs
├── .env                         # Populated via `vercel env pull`
├── vercel.json                  # Vercel config (duration, memory)
├── README.md
└── package.json

```

---

## 🔌 Direct API Implementation

To avoid SSE-related issues with the MCP adapter in serverless environments, we've implemented a direct API approach for critical tools:

```ts
// Direct API endpoint that bypasses MCP adapter
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../lib/supabase.js";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// Implementation details...
}
```

This approach:
- Avoids the `addEventListener` error in serverless functions
- Provides more reliable operation without Redis dependency
- Maintains the same business logic as the MCP tool

---

## 🧪 Testing Locally

Install dependencies:

```sh
pnpm install
```

Run a local server with:

```sh
vercel dev
```

Test the health endpoint:

```sh
curl http://localhost:3000/api/health
```

Trigger specific tools:

```sh
# Test the applySurfaceEstimates tool
node scripts/call-apply-surface.mjs http://localhost:3000 YOUR_QUOTE_ID

# Test other tools
node scripts/test-client.mjs http://localhost:3000
```

---

## ☁️ Deploy on Vercel

You’ll need:

* ✅ [Fluid compute enabled](https://vercel.com/docs/functions/fluid-compute)
* ✅ `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set in Vercel Environment
* ✅ Node.js runtime (not Edge) for MCP adapter compatibility

Pull `.env` locally:

```sh
vercel env pull .env
```

---

🔄 Runtime Configuration
The MCP server now uses the Node.js runtime instead of Edge to avoid compatibility issues with the MCP adapter:

```ts
// Force Node.js runtime instead of Edge
export const config = { runtime: "nodejs" };
```

SSE (Server-Sent Events) functionality is temporarily disabled to prevent the addEventListener error in serverless functions. Redis configuration can be re-enabled once SSE support is needed:

```ts
// Temporarily disabled for stability
// redisUrl: process.env.REDIS_URL,
```

## 🧽 Roadmap

* ✅ `applySurfaceEstimates` tool (S × H rules)
* ✅ Implement direct API fallback for MCP adapter issues
* ✅ `fillMissingInfo` tool (e.g. coats, brands, sizes)
* ✅ `quoteLinter` validator agent (non-destructive)
* [ ] Implement proper SSE support with Redis
* [ ] Optional: migrate to standalone MCP server when >10 tools

---

## 📂 Related Links

* 🗪 [Model Context Protocol (MCP) with Vercel Functions](https://vercel.com/templates/other/model-context-protocol-mcp-with-vercel-functions)
* 🗪 [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
* ⚡️ [Renalto Assistant Beta](https://beta.renalto.com/accueil)

---

## 👨‍💼 Contributors

* **@codydow** — Project lead, dev

---

## License

MIT
