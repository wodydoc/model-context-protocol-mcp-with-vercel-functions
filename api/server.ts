// /api/server.ts
import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
// import { PostgrestResponse } from "@supabase/postgrest-js";

// Quote item typing
type QuoteItem = {
  type: string;
  price: number;
  [key: string]: any;
};

// Timeout wrapper that works with both Promises and Supabase query builders
function withTimeout<T>(
  promise: Promise<T> | { then: (onfulfilled: (value: T) => any) => any },
  ms: number
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise), // This handles both Promise and thenable objects
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Operation timed out")), ms)
    ),
  ]);
}

const handler = createMcpHandler(
  (server) => {
    server.tool("echo", { message: z.string() }, async ({ message }) => ({
      content: [{ type: "text", text: `Tool echo: ${message}` }],
    }));

    server.tool(
      "updateVAT",
      {
        quoteId: z.string(),
        newVat: z.number().min(0).max(1),
      },
      async ({ quoteId, newVat }) => {
        console.log(`[MCP] updateVAT → quoteId=${quoteId} newVat=${newVat}`);

        try {
          const { error } = await withTimeout(
            supabase.from("quotes").update({ vat: newVat }).eq("id", quoteId),
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
                text: `❌ Error: ${err?.message || "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    server.tool(
      "splitPoseItems",
      { quoteId: z.string() },
      async ({ quoteId }) => {
        console.log(`[MCP] splitPoseItems → quoteId=${quoteId}`);

        try {
          const { data, error } = await withTimeout(
            supabase.from("quotes").select("items").eq("id", quoteId).single(),
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

          const updatedItems = (data.items as QuoteItem[]).flatMap((item) =>
            item.type === "fourniture_pose"
              ? [
                  { ...item, type: "fourniture", price: item.price * 0.5 },
                  { ...item, type: "pose", price: item.price * 0.5 },
                ]
              : item
          );

          const { error: updateError } = await withTimeout(
            supabase
              .from("quotes")
              .update({ items: updatedItems })
              .eq("id", quoteId),
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
                text: `❌ Error: ${err?.message || "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    server.tool(
      "applySurfaceEstimates",
      { quoteId: z.string() },
      async ({ quoteId }) => {
        console.log(`[MCP] applySurfaceEstimates START → quoteId=${quoteId}`);

        try {
          console.log(`[MCP] Fetching surface+height...`);
          const { data, error } = await withTimeout(
            supabase
              .from("quotes")
              .select("surface, height")
              .eq("id", quoteId)
              .single(),
            5000
          );

          if (error || !data) {
            console.error(`[MCP] FETCH FAIL → ${error?.message}`);
            return {
              content: [
                { type: "text", text: `❌ Fetch error: ${error?.message}` },
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

          console.log(`[MCP] Updating quote fields with S=${S}, H=${H}...`);
          const { error: updateError } = await withTimeout(
            supabase
              .from("quotes")
              .update({ M1, M2, P1, P2 })
              .eq("id", quoteId),
            5000
          );

          if (updateError) {
            console.error(`[MCP] UPDATE FAIL → ${updateError.message}`);
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

          console.log(`[MCP] DONE → Surface applied to quote ${quoteId}`);
          return {
            content: [
              {
                type: "text",
                text: `✅ Surface formulas applied (S=${S}, H=${H}) to quote ${quoteId}`,
              },
            ],
          };
        } catch (err: any) {
          console.error(`[MCP] ERROR → ${err?.message || err}`);
          return {
            content: [
              {
                type: "text",
                text: `❌ Async update failed: ${
                  err?.message || "Unknown error"
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
  {}, // Empty or valid options
  {
    verboseLogs: true,
    maxDuration: 120, // Increased from 60 to 120 seconds
    basePath: "/api",
  }
);

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
