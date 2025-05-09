// /api/server.ts
import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

// 👆 Add this just above createMcpHandler
type QuoteItem = {
  type: string;
  price: number;
  [key: string]: any;
};

const handler = createMcpHandler((server) => {
  // 🔁 Echo Tool
  server.tool("echo", { message: z.string() }, async ({ message }) => ({
    content: [{ type: "text", text: `Tool echo: ${message}` }],
  }));

  // 💸 updateVAT Tool — live Supabase update
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
        console.error(`[MCP] Failed VAT update:`, error.message);
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

  // 🪚 splitPoseItems Tool — real logic
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
        console.error("[MCP] Fetch error:", fetchError?.message);
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
        console.error("[MCP] Update error:", updateError.message);
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
});

export { handler as GET, handler as POST, handler as DELETE };
