// /api/health.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../lib/supabase.js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check Supabase connection
    const { data, error } = await supabase.from("quotes").select("id").limit(1);

    if (error) {
      console.error("Health check failed - Supabase error:", error);
      return res.status(500).json({
        status: "error",
        database: "disconnected",
        error: error.message,
      });
    }

    // Return success response
    return res.status(200).json({
      status: "healthy",
      database: "connected",
      env: {
        supabaseUrl: process.env.SUPABASE_URL ? "set" : "missing",
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing",
        redisUrl: process.env.REDIS_URL ? "set" : "missing",
        nodeEnv: process.env.NODE_ENV,
      },
    });
  } catch (error: any) {
    console.error("Health check failed:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Unknown error",
    });
  }
}
