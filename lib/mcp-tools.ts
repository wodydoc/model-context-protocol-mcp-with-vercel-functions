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
      console.log(`[MCP] ⚙️ START: applySurfaceEstimates for quote ${quoteId}`);

      try {
        // Step 1: Fetch quote data
        console.log(`[MCP] 🔍 Fetching data for quote ${quoteId}...`);
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

        // Handle fetch errors
        if (error || !data) {
          console.error(
            `[MCP] ❌ ERROR: Failed to fetch quote ${quoteId}: ${error?.message}`
          );
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `❌ Fetch failed: ${
                  error?.message || "No data returned"
                }`,
              },
            ],
          };
        }

        // Log retrieved data
        console.log(`[MCP] ✅ Data retrieved for quote ${quoteId}:`, data);

        // Step 2: Calculate surface estimates
        const S = data.surface ?? 75;
        const H = data.height ?? 2.6;
        const M2 = S * H;
        const P2 = S;
        const M1 = M2 * 0.2;
        const P1 = P2 * 0.2;

        console.log(`[MCP] 📊 Calculated estimates for quote ${quoteId}:`, {
          S,
          H,
          M1,
          M2,
          P1,
          P2,
        });

        // Step 3: Update the quote
        console.log(
          `[MCP] 💾 Updating quote ${quoteId} with calculated estimates...`
        );
        const { error: upd } = await withTimeout<{ error: any }>(
          supabase
            .from("quotes")
            .update({ M1, M2, P1, P2 })
            .eq("id", quoteId) as unknown as Promise<{ error: any }>,
          5000
        );

        // Handle update errors
        if (upd) {
          console.error(
            `[MCP] ❌ ERROR: Failed to update quote ${quoteId}: ${upd.message}`
          );
          return {
            isError: true,
            content: [
              { type: "text", text: `❌ Write failed: ${upd.message}` },
            ],
          };
        }

        // Log success
        console.log(
          `[MCP] ✅ COMPLETE: Surface estimates applied to quote ${quoteId}`
        );

        return {
          content: [
            {
              type: "text",
              text: `✅ Surface estimates applied to ${quoteId}:\n• Surface: ${S}m²\n• Height: ${H}m\n• M1: ${M1.toFixed(
                2
              )}m²\n• M2: ${M2.toFixed(2)}m²\n• P1: ${P1.toFixed(
                2
              )}m²\n• P2: ${P2.toFixed(2)}m²`,
            },
          ],
        };
      } catch (err: any) {
        // Comprehensive error logging
        console.error(
          `[MCP] 🚨 CRITICAL ERROR in applySurfaceEstimates for ${quoteId}:`,
          err
        );
        console.error(err.stack);

        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `❌ Error: ${err.message || "Unknown error occurred"}`,
            },
          ],
        };
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────
  // 5) fillMissingInfo: patch missing brand/coats/color/finish fields
  // ─────────────────────────────────────────────────────────────────
  server.tool(
    "fillMissingInfo",
    { quoteId: z.string() },
    async (input: { quoteId: string }) => {
      const { quoteId } = input;
      console.log(`[MCP] fillMissingInfo → ${quoteId}`);
      try {
        const { data, error } = await withTimeout<{
          data: {
            brand?: string;
            coats?: number;
            color?: string;
            finish?: string;
          };
          error: any;
        }>(
          supabase
            .from("quotes")
            .select("brand, coats, color, finish")
            .eq("id", quoteId)
            .single() as unknown as Promise<{
            data: {
              brand?: string;
              coats?: number;
              color?: string;
              finish?: string;
            };
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

        const patch: Record<string, any> = {};
        if (!data.brand) patch.brand = "generic";
        if (data.coats == null) patch.coats = 2;
        if (!data.color) patch.color = "white";
        if (!data.finish) patch.finish = "matte";

        if (Object.keys(patch).length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `✅ Nothing to update — all fields already filled for ${quoteId}`,
              },
            ],
          };
        }

        const { error: upd } = await withTimeout<{ error: any }>(
          supabase
            .from("quotes")
            .update(patch)
            .eq("id", quoteId) as unknown as Promise<{
            error: any;
          }>,
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
              text:
                `✅ Missing info patched for ${quoteId}: ` +
                Object.entries(patch)
                  .map(([k, v]) => `• ${k}: ${v}`)
                  .join("\n"),
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
  // 6) quoteLinter: non-destructive validator
  // ─────────────────────────────────────────────────────────────────
  server.tool("quoteLinter", { quoteId: z.string() }, async ({ quoteId }) => {
    console.log(`[MCP] quoteLinter → ${quoteId}`);
    try {
      const { data, error } = await withTimeout<{
        data: {
          items?: QuoteItem[];
          vat?: number;
          brand?: string;
          coats?: number;
          surface?: number;
          height?: number;
        };
        error: any;
      }>(
        supabase
          .from("quotes")
          .select("items, vat, brand, coats, surface, height")
          .eq("id", quoteId)
          .single() as unknown as Promise<{
          data: {
            items?: QuoteItem[];
            vat?: number;
            brand?: string;
            coats?: number;
            surface?: number;
            height?: number;
          };
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

      const issues: string[] = [];

      if (!Array.isArray(data.items) || data.items.length === 0)
        issues.push("🚫 Quote has no items");
      if (data.vat == null || data.vat < 0 || data.vat > 1)
        issues.push("⚠️ VAT is missing or out of bounds");
      if (!data.brand) issues.push("⚠️ Brand is missing");
      if (data.coats == null) issues.push("⚠️ Number of coats missing");
      if (!data.surface || !data.height)
        issues.push("⚠️ Surface or height not set");

      return {
        content: [
          {
            type: "text",
            text:
              issues.length === 0
                ? `✅ Quote ${quoteId} passed linting`
                : `🧹 Lint Results for ${quoteId}:\n` +
                  issues.map((msg) => `• ${msg}`).join("\n"),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `❌ Error: ${err.message}` }],
      };
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // 7) roundLineItemPrices: round item prices to nearest integer
  // ─────────────────────────────────────────────────────────────────
  server.tool(
    "roundLineItemPrices",
    { quoteId: z.string() },
    async ({ quoteId }) => {
      console.log(`[MCP] roundLineItemPrices → ${quoteId}`);
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

        const updatedItems = data.items.map((item) => ({
          ...item,
          price: Math.round(item.price ?? 0),
        }));

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
              text: `✅ Prices rounded for all items in quote ${quoteId}`,
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
  // 8) inferMissingPrices: fill item prices using heuristics
  // ─────────────────────────────────────────────────────────────────
  server.tool(
    "inferMissingPrices",
    { quoteId: z.string() },
    async ({ quoteId }) => {
      console.log(`[MCP] inferMissingPrices → ${quoteId}`);
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

        const heuristics: Record<string, number> = {
          peinture: 25,
          pose: 40,
          fourniture: 60,
          demontage: 15,
        };

        let updated = 0;
        const updatedItems = data.items.map((item) => {
          if ((item.price == null || item.price === 0) && item.type) {
            const unitPrice = heuristics[item.type.toLowerCase()] ?? 30;
            updated++;
            return { ...item, price: unitPrice };
          }
          return item;
        });

        if (updated === 0) {
          return {
            content: [
              {
                type: "text",
                text: `✅ All item prices already filled for ${quoteId}`,
              },
            ],
          };
        }

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
              text: `✅ ${updated} missing prices filled for quote ${quoteId}`,
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
  // 9) groupLineItemsByRoom: group quote items by room
  // ─────────────────────────────────────────────────────────────────
  server.tool(
    "groupLineItemsByRoom",
    { quoteId: z.string() },
    async ({ quoteId }) => {
      console.log(`[MCP] groupLineItemsByRoom → ${quoteId}`);
      try {
        // Step 1: Fetch the quote items
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

        const items = data.items;

        // Step 2: Group items by room
        const groupedItems: { [room: string]: QuoteItem[] } = {};
        for (const item of items) {
          const room = item.room?.trim() || "Unassigned";
          if (!groupedItems[room]) {
            groupedItems[room] = [];
          }
          groupedItems[room].push(item);
        }

        // Step 3: Flatten grouped items with room headers
        const updatedItems: QuoteItem[] = [];
        for (const [room, roomItems] of Object.entries(groupedItems)) {
          // Insert a header item for the room
          updatedItems.push({
            type: "header",
            description: `Room: ${room}`,
            price: 0,
          });
          // Append the room's items
          updatedItems.push(...roomItems);
        }

        // Step 4: Update the quote with grouped items
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
              text: `✅ Items grouped by room for quote ${quoteId}`,
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
