// /api/group-by-room.ts — Direct API for groupLineItemsByRoom

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

    const items = data.items;

    const grouped: { [room: string]: any[] } = {};
    for (const item of items) {
      const room = item.room?.trim() || "Unassigned";
      if (!grouped[room]) grouped[room] = [];
      grouped[room].push(item);
    }

    const updatedItems: any[] = [];
    for (const [room, roomItems] of Object.entries(grouped)) {
      updatedItems.push({
        type: "header",
        description: `Room: ${room}`,
        price: 0,
      });
      updatedItems.push(...roomItems);
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
      message: `Items grouped by room for quote ${quoteId}`,
      updatedCount: updatedItems.length,
    });
  } catch (err: any) {
    console.error("❌ group-by-room error:", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
