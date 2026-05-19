import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentId } = params;

    // Check access (same logic as profile)
    const { data: access } = await supabase
      .from("share_access")
      .select("share_code_id")
      .eq("viewer_id", user.id)
      .eq("is_active", true)
      .single();

    if (access) {
      const { data: shareCode } = await supabase
        .from("share_codes")
        .select("user_id")
        .eq("id", access.share_code_id)
        .single();

      if (!shareCode || shareCode.user_id !== studentId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else if (studentId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch student stats
    const { data: stats, error: statsError } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", studentId)
      .single();

    if (statsError) {
      return NextResponse.json({ error: "Stats not found" }, { status: 404 });
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error in student stats API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
