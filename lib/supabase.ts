// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

// Remove non-null assertions and add validation
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required Supabase environment variables");
  // In a serverless function, we can't throw here as it would prevent the function from initializing
  // Instead, we'll log the error and create a client with empty strings
  // The actual operations will fail gracefully with proper error messages
}

// Create the Supabase client with fallbacks to empty strings if variables are missing
export const supabase = createClient(
  supabaseUrl || "",
  supabaseServiceKey || "",
  {
    auth: {
      persistSession: false, // Important for serverless functions
    },
  }
);

// Add a helper function to check connection status
export async function checkSupabaseConnection() {
  try {
    // A simple query to test the connection
    const { data, error } = await supabase.from("quotes").select("id").limit(1);

    if (error) {
      console.error("Supabase connection error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to connect to Supabase:", err);
    return false;
  }
}
