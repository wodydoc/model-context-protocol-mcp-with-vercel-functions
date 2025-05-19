// /api/update-vat.ts — Direct API for updateVAT

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
    const { quoteId, newVat } = req.body;
    if (!quoteId || typeof newVat !== "number") {
      return res.status(400).json({ error: "Missing quoteId or newVat" });
    }

    const { error } = await supabase
      .from("quotes")
      .update({ vat: newVat })
      .eq("id", quoteId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      message: `VAT updated for ${quoteId} to ${newVat * 100}%`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
