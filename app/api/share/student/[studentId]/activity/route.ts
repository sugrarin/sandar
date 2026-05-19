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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
