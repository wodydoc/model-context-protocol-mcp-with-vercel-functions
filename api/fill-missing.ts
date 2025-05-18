// /api/fill-missing.ts — Direct API for fillMissingInfo

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

    // Fetch the quote row
    const { data, error } = await supabase
      .from("quotes")
      .select("brand, coats, color, finish")
      .eq("id", quoteId)
      .single();

    if (error) {
      console.error(`Failed to fetch quote ${quoteId}:`, error);
      return res.status(500).json({ error: error.message });
    }

    const updates: Record<string, any> = {};
    if (!data.brand) updates.brand = "generic";
    if (!data.coats) updates.coats = 2;
    if (!data.color) updates.color = "white";
    if (!data.finish) updates.finish = "matte";

    if (Object.keys(updates).length === 0) {
      return res.status(200).json({
        success: true,
        message: "No missing fields to update.",
        data,
      });
    }

    const { error: updateError } = await supabase
      .from("quotes")
      .update(updates)
      .eq("id", quoteId);

    if (updateError) {
      console.error(`Failed to update quote ${quoteId}:`, updateError);
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: `Missing fields filled for ${quoteId}`,
      data: updates,
    });
  } catch (error: any) {
    console.error("Error in fill-missing endpoint:", error);
    return res.status(500).json({ error: error.message || "Unknown error" });
  }
}
