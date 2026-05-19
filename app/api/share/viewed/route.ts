import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all students the current user is viewing
    const { data: access, error: accessError } = await supabase
      .from("share_access")
      .select(`
        id,
        share_code_id,
        activated_at,
        is_active,
        share_codes!inner (
          user_id,
          profiles!share_codes_user_id_fkey (
            email,
            display_name,
            avatar_url,
            created_at
          )
        )
      `)
      .eq("viewer_id", user.id)
      .eq("is_active", true);

    if (accessError) {
      console.error("Error getting viewed students:", accessError);
      return NextResponse.json({ error: "Failed to get viewed students" }, { status: 500 });
    }

    const formattedStudents = access?.map((a: any) => ({
      id: a.id,
      share_code_id: a.share_code_id,
      student_id: a.share_codes.user_id,
      student_email: a.share_codes.profiles?.email,
      student_display_name: a.share_codes.profiles?.display_name,
      student_avatar_url: a.share_codes.profiles?.avatar_url,
      student_member_since: a.share_codes.profiles?.created_at,
      activated_at: a.activated_at,
      is_active: a.is_active,
    })) || [];

    return NextResponse.json({ students: formattedStudents });
  } catch (error) {
    console.error("Error in share viewed API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accessId } = await request.json();

    if (!accessId || typeof accessId !== "string") {
      return NextResponse.json({ error: "Invalid access ID" }, { status: 400 });
    }

    // Check if this access belongs to the current user (as viewer)
    const { data: access, error: accessError } = await supabase
      .from("share_access")
      .select("id")
      .eq("id", accessId)
      .eq("viewer_id", user.id)
      .single();

    if (accessError || !access) {
      return NextResponse.json({ error: "Access not found" }, { status: 404 });
    }

    // Deactivate access
    const { error: updateError } = await supabase
      .from("share_access")
      .update({ is_active: false })
      .eq("id", accessId);

    if (updateError) {
      console.error("Error deactivating access:", updateError);
      return NextResponse.json({ error: "Failed to deactivate access" }, { status: 500 });
    }

    return NextResponse.json({ message: "Access deactivated" });
  } catch (error) {
    console.error("Error in share viewed DELETE API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
