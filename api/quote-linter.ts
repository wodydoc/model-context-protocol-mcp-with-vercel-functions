// /api/quote-linter.ts — Direct API for quoteLinter

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
      .select("items, vat, brand, coats, surface, height")
      .eq("id", quoteId)
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || "Not found" });
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

    return res.status(200).json({
      success: true,
      quoteId,
      issues,
      passed: issues.length === 0,
      message:
        issues.length === 0
          ? "✅ Quote passed linting"
          : `🧹 Found ${issues.length} issue(s)`,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
