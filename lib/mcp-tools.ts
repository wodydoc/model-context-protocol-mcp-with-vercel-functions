/**
 * /lib/mcp‑tools.ts
 *
 * Centralized registration of all MCP tools.
 * Import and pass `registerTools` into both `/api/server.ts` and `/api/sse.ts`
 * so that both HTTP and SSE endpoints share the same tool definitions.
 */

import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { supabase } from "./supabase.js";

/**
 * Derive the actual MCP server type from createMcpHandler’s signature:
 *
 * 1. typeof createMcpHandler is:
 *      (init: (server: McpServer) => void, opts: ..., config: ...) => Handler
 * 2. Parameters<typeof createMcpHandler>[0] is the “init” callback type:
 *      (server: McpServer) => void
 * 3. Parameters<…>[0] of that callback is the McpServer itself.
 */
type Server = Parameters<Parameters<typeof createMcpHandler>[0]>[0];

/** Shared item shape for splitPoseItems */
type QuoteItem = {
  type: string;
  price: number;
  [key: string]: any;
};

/**
 * Utility: wrap any (thenable) in a timeout.
 * We cast to Promise<T> below so TS won’t complain about Postgrest builders.
 */
function withTimeout<T>(promise: any, ms: number): Promise<T> {
  return Promise.race([
    promise as Promise<T>, // cast builder/thenable to Promise<T>
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Operation timed out")), ms)
    ),
  ]);
}

/**
 * registerTools
 *
 * Add all your server.tool(...) calls here, in one place.
 * Both /api/server.ts and /api/sse.ts should import & pass this into createMcpHandler.
 */
export function registerTools(server: Server) {
  // ─────────────────────────────────────────────────────────────────
  // 1) Echo
  // Simple ping tool that returns its input.
  // ─────────────────────────────────────────────────────────────────
  server.tool(
    "echo",
    { message: z.string() },
    async (input: { message: string }) => ({
      content: [
        {
          type: "text",
          text: `Tool echo: ${input.message}`,
        },
      ],
    })
  );

  // ─────────────────────────────────────────────────────────────────
  // 2) updateVAT
  // Update the VAT field on a quote record.
  // ─────────────────────────────────────────────────────────────────
  server.tool(
    "updateVAT",
    {
      quoteId: z.string(),
      newVat: z.number().min(0).max(1),
    },
    async (input: { quoteId: string; newVat: number }) => {
      const { quoteId, newVat } = input;
      console.log(`[MCP] updateVAT → quoteId=${quoteId} newVat=${newVat}`);

      try {
        // Cast the Postgrest builder to Promise<{ error: any }>
        const { error } = await withTimeout<{ error: any }>(
          supabase
            .from("quotes")
            .update({ vat: newVat })
            .eq("id", quoteId) as unknown as Promise<{ error: any }>,
          5000
        );

        if (error) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to update VAT: ${error.message}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `✅ Updated VAT for quote ${quoteId} to ${(
                newVat * 100
              ).toFixed(1)}%`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Error: ${err.message || "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────
  // 3) splitPoseItems
  // Split any "fourniture_pose" line into two separate items.
  // ─────────────────────────────────────────────────────────────────
  server.tool(
    "splitPoseItems",
    { quoteId: z.string() },
    async (input: { quoteId: string }) => {
      const { quoteId } = input;
      console.log(`[MCP] splitPoseItems → quoteId=${quoteId}`);

      try {
        // Read the items array
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
            content: [
              {
                type: "text",
                text: `❌ Could not fetch quote: ${error?.message}`,
              },
            ],
            isError: true,
          };
        }

        // Transform the items
        const updatedItems = data.items.flatMap((item) =>
          item.type === "fourniture_pose"
            ? [
                { ...item, type: "fourniture", price: item.price * 0.5 },
                { ...item, type: "pose", price: item.price * 0.5 },
              ]
            : [item]
        );

        // Write them back
        const { error: updateError } = await withTimeout<{ error: any }>(
          supabase
            .from("quotes")
            .update({ items: updatedItems })
            .eq("id", quoteId) as unknown as Promise<{ error: any }>,
          5000
        );

        if (updateError) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to split pose items: ${updateError.message}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `✅ Successfully split fourniture_pose items for quote ${quoteId}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Error: ${err.message || "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────
  // 4) applySurfaceEstimates
  // Calculate M1/M2/P1/P2 from surface & height, then save.
  // ─────────────────────────────────────────────────────────────────
  server.tool(
    "applySurfaceEstimates",
    { quoteId: z.string() },
    async (input: { quoteId: string }) => {
      const { quoteId } = input;
      console.log(`[MCP] applySurfaceEstimates START → quoteId=${quoteId}`);

      try {
        // Fetch surface & height
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
            content: [
              {
                type: "text",
                text: `❌ Fetch error: ${error?.message}`,
              },
            ],
            isError: true,
          };
        }

        // Compute estimates
        const S = data.surface ?? 75;
        const H = data.height ?? 2.6;
        const M2 = S * H;
        const P2 = S;
        const M1 = M2 * 0.2;
        const P1 = P2 * 0.2;

        // Save results
        const { error: updateError } = await withTimeout<{ error: any }>(
          supabase
            .from("quotes")
            .update({ M1, M2, P1, P2 })
            .eq("id", quoteId) as unknown as Promise<{ error: any }>,
          5000
        );

        if (updateError) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Update error: ${updateError.message}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `✅ Surface formulas applied (S=${S}, H=${H}) to quote ${quoteId}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Async update failed: ${err.message || "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
