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
    const { data: access, error: accessError } = await supabase
      .from("share_access")
      .select("id, share_code_id")
      .eq("viewer_id", user.id)
      .eq("is_active", true)
      .single();

    if (accessError) {
      // Check if the user is trying to view their own stats
      if (studentId !== user.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    } else {
      // Verify the access is for this student
      const { data: shareCode } = await supabase
        .from("share_codes")
        .select("user_id")
        .eq("id", access.share_code_id)
        .single();

      if (!shareCode || shareCode.user_id !== studentId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
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
