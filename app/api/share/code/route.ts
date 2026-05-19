import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create share code using the database function
    const { data, error } = await supabase
      .rpc("get_or_create_share_code", { p_user_id: user.id });

    if (error) {
      console.error("Error getting share code:", error);
      return NextResponse.json({ error: "Failed to get share code" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No share code found" }, { status: 404 });
    }

    return NextResponse.json({ code: data[0].code, created_at: data[0].created_at });
  } catch (error) {
    console.error("Error in share code API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
