// /api/split-pose.ts — Direct API for splitPoseItems

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

    const updatedItems = data.items.flatMap((item: any) =>
      item.type === "fourniture_pose"
        ? [
            { ...item, type: "fourniture", price: item.price * 0.5 },
            { ...item, type: "pose", price: item.price * 0.5 },
          ]
        : [item]
    );

    const { error: updateError } = await supabase
      .from("quotes")
      .update({ items: updatedItems })
      .eq("id", quoteId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: `Split fourniture_pose into fourniture + pose for ${quoteId}`,
      updatedCount: updatedItems.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
