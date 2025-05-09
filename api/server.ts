// /api/server.ts
import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

// 👆 Quote item typing
type QuoteItem = {
  type: string;
  price: number;
  [key: string]: any;
};

// ⏱ Timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Operation timed out")), ms)
    ),
  ]);
}

const handler = createMcpHandler((server) => {
  // 🔁 Echo Tool
  server.tool("echo", { message: z.string() }, async ({ message }) => ({
    content: [{ type: "text", text: `Tool echo: ${message}` }],
  }));

  // 💸 updateVAT Tool
  server.tool(
    "updateVAT",
    {
      quoteId: z.string(),
      newVat: z.number().min(0).max(1),
    },
    async ({ quoteId, newVat }) => {
      const { error } = await supabase
        .from("quotes")
        .update({ vat: newVat })
        .eq("id", quoteId);

      if (error) {
        return {
          content: [
            { type: "text", text: `❌ Failed to update VAT: ${error.message}` },
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
    }
  );

  // 🪚 splitPoseItems Tool
  server.tool(
    "splitPoseItems",
    {
      quoteId: z.string(),
    },
    async ({ quoteId }) => {
      const { data, error: fetchError } = await supabase
        .from("quotes")
        .select("items")
        .eq("id", quoteId)
        .single();

      if (fetchError || !data) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Could not fetch quote: ${fetchError?.message}`,
            },
          ],
          isError: true,
        };
      }

      const updatedItems = (data.items as QuoteItem[]).flatMap((item) => {
        if (item.type === "fourniture_pose") {
          return [
            { ...item, type: "fourniture", price: item.price * 0.5 },
            { ...item, type: "pose", price: item.price * 0.5 },
          ];
        }
        return item;
      });

      const { error: updateError } = await supabase
        .from("quotes")
        .update({ items: updatedItems })
        .eq("id", quoteId);

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
    }
  );

  // 📐 applySurfaceEstimates Tool — FINAL TS-CLEAN, VERBOSE, TIMEOUT-SAFE
  server.tool(
    "applySurfaceEstimates",
    {
      quoteId: z.string(),
    },
    async ({ quoteId }) => {
      console.log(`[MCP] applySurfaceEstimates → quoteId=${quoteId}`);

      // Fire-and-forget async logic
      void (async () => {
        try {
          const { data, error } = await supabase
            .from("quotes")
            .select("surface, height")
            .eq("id", quoteId)
            .single();

          if (error || !data) {
            console.error(`[MCP] ❌ Fetch error: ${error?.message}`);
            return;
          }

          const S = data.surface ?? 75;
          const H = data.height ?? 2.6;
          const M2 = S * H;
          const P2 = S;
          const M1 = M2 * 0.2;
          const P1 = P2 * 0.2;

          await supabase
            .from("quotes")
            .update({ M1, M2, P1, P2 })
            .eq("id", quoteId)
            .select()
            .throwOnError();

          console.log(`[MCP] ✅ Surface formulas applied (S=${S}, H=${H})`);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error(`[MCP] ❌ Async update failed: ${message}`);
        }
      })();

      // 🧠 This resolves immediately!
      return {
        content: [
          {
            type: "text",
            text: `🧠 Surface estimate launched. Will update quote ${quoteId} shortly.`,
          },
        ],
        isError: false,
      };
    }
  );
});

export { handler as GET, handler as POST, handler as DELETE };
