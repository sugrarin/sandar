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

    // Check access
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

    // Fetch mode stats
    const { data: modeStats, error: modeStatsError } = await supabase
      .from("mode_stats")
      .select("*")
      .eq("user_id", studentId);

    if (modeStatsError) {
      return NextResponse.json({ mode_stats: [] });
    }

    return NextResponse.json({ mode_stats: modeStats || [] });
  } catch (error) {
    console.error("Error in student mode stats API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
