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
│   └── server.ts                # MCP tool registration + handlers
├── lib
│   └── supabase.ts             # Supabase client connection
├── public
│   └── index.html              # Basic landing page
├── scripts
│   ├── test-client.mjs         # Client to invoke tools via SSE
│   └── test-streamable-http-client.mjs
├── .env                        # Populated via `vercel env pull`
├── vercel.json                 # Vercel config (duration, memory)
├── README.md
└── package.json
```

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

Trigger a tool using the test client:

```sh
node scripts/test-client.mjs http://localhost:3000
```

---

## ☁️ Deploy on Vercel

You’ll need:

* ✅ [Fluid compute enabled](https://vercel.com/docs/functions/fluid-compute)
* ✅ `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set in Vercel Environment
* ✅ Redis is *not used* in current setup

Pull `.env` locally:

```sh
vercel env pull .env
```

---

## 🧽 Roadmap

* [ ] `applySurfaceEstimates` tool (S × H rules)
* [ ] `fillMissingInfo` tool (e.g. coats, brands, sizes)
* [ ] Post-generation `quoteLinter` validator agent
* [ ] Optional: migrate to standalone MCP server when >10 tools

---

## 📂 Related Links

* 🗪 [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
* 🧠 [Renalto Assistant Vision](https://chat.openai.com/share/...insert-strategic-link-here)

---

## 👨‍💼 Contributors

* **@codydow** — Project lead, dev
* **@nico** — Product/UX lead
* **Grimoire** — AI toolsmith ✨

---

## License

MIT
