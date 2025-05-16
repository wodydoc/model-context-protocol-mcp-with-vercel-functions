// /api/apply-surface.ts that bypasses the MCP adapter

import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../lib/supabase.js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { quoteId } = req.body;

    if (!quoteId) {
      return res.status(400).json({ error: "Missing quoteId" });
    }

    // Fetch quote data
    const { data, error } = await supabase
      .from("quotes")
      .select("surface, height")
      .eq("id", quoteId)
      .single();

    if (error) {
      console.error(`Failed to fetch quote ${quoteId}:`, error);
      return res.status(500).json({ error: error.message });
    }

    // Calculate surface estimates
    const S = data?.surface ?? 75;
    const H = data?.height ?? 2.6;
    const M2 = S * H;
    const P2 = S;
    const M1 = M2 * 0.2;
    const P1 = P2 * 0.2;

    // Update the quote
    const { error: updateError } = await supabase
      .from("quotes")
      .update({ M1, M2, P1, P2 })
      .eq("id", quoteId);

    if (updateError) {
      console.error(`Failed to update quote ${quoteId}:`, updateError);
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: `Surface estimates applied to ${quoteId}`,
      data: { S, H, M1, M2, P1, P2 },
    });
  } catch (error: any) {
    console.error("Error in apply-surface endpoint:", error);
    return res.status(500).json({ error: error.message || "Unknown error" });
  }
}
