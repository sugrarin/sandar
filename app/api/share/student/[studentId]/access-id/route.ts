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

    // Get the access ID for unlinking
    const { data: access, error: accessError } = await supabase
      .from("share_access")
      .select("id, share_code_id")
      .eq("viewer_id", user.id)
      .eq("is_active", true)
      .single();

    if (accessError) {
      return NextResponse.json({ error: "Access not found" }, { status: 404 });
    }

    // Verify this access is for the correct student
    const { data: shareCode } = await supabase
      .from("share_codes")
      .select("user_id")
      .eq("id", access.share_code_id)
      .single();

    if (!shareCode || shareCode.user_id !== studentId) {
      return NextResponse.json({ error: "Access not found" }, { status: 404 });
    }

    return NextResponse.json({ access_id: access.id });
  } catch (error) {
    console.error("Error in student access-id API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
