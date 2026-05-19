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

    if (accessError) {
      console.error("check_student_access error:", accessError);
      return NextResponse.json(
        { error: "Access check failed" },
        { status: 500 },
      );
    }

    if (
      !accessCheck ||
      accessCheck.length === 0 ||
      !accessCheck[0].has_access
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch activity data (sessions grouped by date)
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("created_at, total_questions, correct_answers")
      .eq("user_id", studentId)
      .order("created_at", { ascending: false })
      .limit(180);

    if (sessionsError) {
      return NextResponse.json({ activity: [] });
    }

    // Process activity data into the format expected by ActivityHeatmap
    const activityData = (sessions || []).map((session: any) => ({
      date: session.created_at,
      sessions: 1,
      questions: session.total_questions,
      correct: session.correct_answers,
    }));

    return NextResponse.json({ activity: activityData });
  } catch (error) {
    console.error("Error in student activity API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
