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

  // 📐 applySurfaceEstimates Tool — timeout-safe, log-rich, type-safe
  // 📐 applySurfaceEstimates Tool — correct, safe, TS-clean
  server.tool(
    "applySurfaceEstimates",
    {
      quoteId: z.string(),
    },
    async ({ quoteId }) => {
      console.log(`[MCP] applySurfaceEstimates → quoteId=${quoteId}`);

      const { data, error } = await supabase
        .from("quotes")
        .select("surface, height")
        .eq("id", quoteId)
        .single();

      if (error || !data) {
        console.error("[MCP] ❌ Fetch error", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to fetch quote: ${error?.message}`,
            },
          ],
          isError: true,
        };
      }

      const S = data.surface ?? 75;
      const H = data.height ?? 2.6;
      const M2 = S * H;
      const P2 = S;
      const M1 = M2 * 0.2;
      const P1 = P2 * 0.2;

      console.log(`[MCP] Computed: M1=${M1}, M2=${M2}, P1=${P1}, P2=${P2}`);

      try {
        const updateResult = await withTimeout(
          supabase
            .from("quotes")
            .update({ M1, M2, P1, P2 })
            .eq("id", quoteId)
            .throwOnError() as unknown as Promise<{
            error: null | Error;
            data: unknown;
          }>,
          8000
        );

        if (updateResult.error) {
          console.error("[MCP] ❌ Update error", updateResult.error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to apply surface formulas: ${updateResult.error.message}`,
              },
            ],
            isError: true,
          };
        }

        console.log("[MCP] ✅ Supabase update completed");
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Unknown timeout or update error";
        console.error("[MCP] ❌ Update failure", err);
        return {
          content: [
            {
              type: "text",
              text: `❌ Supabase update failed: ${message}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `✅ Surface formulas applied (S=${S}, H=${H}) → M1=${M1}, M2=${M2}, P1=${P1}, P2=${P2}`,
          },
        ],
      };
    }
  );
});

export { handler as GET, handler as POST, handler as DELETE };
