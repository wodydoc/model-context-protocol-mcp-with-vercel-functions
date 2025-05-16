/**
 * /lib/mcp‑tools.ts
 *
 * Centralized registration of all your MCP tools.
 * Import & pass `registerTools` into your handler so HTTP & SSE
 * both share the same tool definitions.
 */

import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { supabase } from "./supabase.js";

/**
 * Derive the MCP‑server type from createMcpHandler’s signature:
 * 1. typeof createMcpHandler = (init, opts, config) => Handler
 * 2. The first parameter `init` has type: (server: McpServer) => void
 * 3. So `Server` = the type of that `server` parameter.
 */
type Server = Parameters<Parameters<typeof createMcpHandler>[0]>[0];

/** shared shape for quote‐item arrays */
type QuoteItem = {
  type: string;
  price: number;
  [key: string]: any;
};

/** wrap any thenable in a timeout (casts to Promise internally) */
function withTimeout<T>(promise: any, ms: number): Promise<T> {
  return Promise.race([
    promise as Promise<T>,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Operation timed out")), ms)
    ),
  ]);
}

/** Register all your tools here */
export function registerTools(server: Server) {
  // ─────────────────────────────────────────────────────────────────
  // 1) echo: simple round‑trip
  // ─────────────────────────────────────────────────────────────────
  server.tool(
    "echo",
    { message: z.string() },
    async (input: { message: string }) => ({
      content: [{ type: "text", text: `Tool echo: ${input.message}` }],
    })
  );

  // ─────────────────────────────────────────────────────────────────
  // 2) updateVAT: adjust the VAT on a quote
  // ─────────────────────────────────────────────────────────────────
  server.tool(
    "updateVAT",
    { quoteId: z.string(), newVat: z.number().min(0).max(1) },
    async (input: { quoteId: string; newVat: number }) => {
      const { quoteId, newVat } = input;
      console.log(`[MCP] updateVAT → ${quoteId} @ ${newVat}`);
      try {
        const { error } = await withTimeout<{ error: any }>(
          supabase
            .from("quotes")
            .update({ vat: newVat })
            .eq("id", quoteId) as unknown as Promise<{ error: any }>,
          5000
        );
        if (error) {
          return {
            isError: true,
            content: [{ type: "text", text: `❌ Failed: ${error.message}` }],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `✅ VAT updated for ${quoteId} to ${(newVat * 100).toFixed(
                1
              )}%`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `❌ Error: ${err.message}` }],
        };
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────
  // 3) splitPoseItems: split fourniture_pose line‑items
  // ─────────────────────────────────────────────────────────────────
  server.tool(
    "splitPoseItems",
    { quoteId: z.string() },
    async (input: { quoteId: string }) => {
      const { quoteId } = input;
      console.log(`[MCP] splitPoseItems → ${quoteId}`);
      try {
        const { data, error } = await withTimeout<{
          data: { items: QuoteItem[] };
          error: any;
        }>(
          supabase
            .from("quotes")
            .select("items")
            .eq("id", quoteId)
            .single() as unknown as Promise<{
            data: { items: QuoteItem[] };
            error: any;
          }>,
          5000
        );
        if (error || !data) {
          return {
            isError: true,
            content: [
              { type: "text", text: `❌ Fetch failed: ${error?.message}` },
            ],
          };
        }
        const updatedItems = data.items.flatMap((item) =>
          item.type === "fourniture_pose"
            ? [
                { ...item, type: "fourniture", price: item.price * 0.5 },
                { ...item, type: "pose", price: item.price * 0.5 },
              ]
            : [item]
        );
        const { error: upd } = await withTimeout<{ error: any }>(
          supabase
            .from("quotes")
            .update({ items: updatedItems })
            .eq("id", quoteId) as unknown as Promise<{ error: any }>,
          5000
        );
        if (upd) {
          return {
            isError: true,
            content: [
              { type: "text", text: `❌ Write failed: ${upd.message}` },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `✅ Split fourniture_pose for ${quoteId}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `❌ Error: ${err.message}` }],
        };
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────
  // 4) applySurfaceEstimates: compute M1/M2/P1/P2
  // ─────────────────────────────────────────────────────────────────
  server.tool(
    "applySurfaceEstimates",
    { quoteId: z.string() },
    async (input: { quoteId: string }) => {
      const { quoteId } = input;
      console.log(`[MCP] applySurfaceEstimates → ${quoteId}`);
      try {
        const { data, error } = await withTimeout<{
          data: { surface?: number; height?: number };
          error: any;
        }>(
          supabase
            .from("quotes")
            .select("surface, height")
            .eq("id", quoteId)
            .single() as unknown as Promise<{
            data: { surface?: number; height?: number };
            error: any;
          }>,
          5000
        );
        if (error || !data) {
          return {
            isError: true,
            content: [
              { type: "text", text: `❌ Fetch failed: ${error?.message}` },
            ],
          };
        }
        const S = data.surface ?? 75;
        const H = data.height ?? 2.6;
        const M2 = S * H;
        const P2 = S;
        const M1 = M2 * 0.2;
        const P1 = P2 * 0.2;
        const { error: upd } = await withTimeout<{ error: any }>(
          supabase
            .from("quotes")
            .update({ M1, M2, P1, P2 })
            .eq("id", quoteId) as unknown as Promise<{ error: any }>,
          5000
        );
        if (upd) {
          return {
            isError: true,
            content: [
              { type: "text", text: `❌ Write failed: ${upd.message}` },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `✅ Surface estimates applied to ${quoteId} (S=${S}, H=${H})`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `❌ Error: ${err.message}` }],
        };
      }
    }
  );
}
