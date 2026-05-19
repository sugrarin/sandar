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

    const { data: sessions, error: sessionsError } = await supabase.rpc(
      "get_student_activity",
      { p_student_id: studentId },
    );

    const rows = sessionsError || !sessions ? [] : sessions;
    const activityData = rows.map((s: any) => ({
      date: s.created_at,
      sessions: 1,
      questions: s.total_questions,
      correct: s.correct_answers,
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
