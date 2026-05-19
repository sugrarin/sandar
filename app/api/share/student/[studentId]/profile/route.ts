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

    // Check if the current user has access to view this student's stats
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

    // Fetch student profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", studentId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error in student profile API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
