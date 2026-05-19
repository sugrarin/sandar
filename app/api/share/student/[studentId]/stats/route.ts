import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { studentId: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentId } = params;

    // Check access using security definer function
    const { data: accessCheck, error: accessError } = await supabase.rpc(
      "check_student_access",
      { p_viewer_id: user.id, p_student_id: studentId },
    );

    if (
      accessError ||
      !accessCheck ||
      accessCheck.length === 0 ||
      !accessCheck[0].has_access
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch student stats
    const { data: stats, error: statsError } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", studentId)
      .single();

    if (statsError) {
      // Return default stats if the student has no sessions yet
      return NextResponse.json({
        total_sessions: 0,
        total_questions: 0,
        total_correct: 0,
        total_wrong: 0,
        total_time_seconds: 0,
        total_xp: 0,
        current_streak: 0,
        best_streak: 0,
        streak_days: 0,
        last_session_at: null,
        last_session_date: null,
        updated_at: null,
      });
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error in student stats API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
