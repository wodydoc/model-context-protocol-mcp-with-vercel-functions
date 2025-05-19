// /api/infer-prices.ts — Direct API for inferMissingPrices

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

    const { data, error } = await supabase
      .from("quotes")
      .select("items")
      .eq("id", quoteId)
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || "Not found" });
    }

    const heuristics: Record<string, number> = {
      peinture: 25,
      pose: 40,
      fourniture: 60,
      demontage: 15,
    };

    let updated = 0;
    const updatedItems = data.items.map((item: any) => {
      if ((item.price == null || item.price === 0) && item.type) {
        const price = heuristics[item.type.toLowerCase()] ?? 30;
        updated++;
        return { ...item, price };
      }
      return item;
    });

    if (updated === 0) {
      return res.status(200).json({
        success: true,
        message: "All prices already filled",
        updatedCount: 0,
      });
    }

    const { error: updateError } = await supabase
      .from("quotes")
      .update({ items: updatedItems })
      .eq("id", quoteId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: `Filled ${updated} missing prices`,
      updatedCount: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
