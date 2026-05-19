import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    // Check if user owns the share code for this access
    const { data: access, error: accessError } = await supabase
      .from("share_access")
      .select("share_code_id")
      .eq("id", accessId)
      .single();

    if (accessError || !access) {
      return NextResponse.json({ error: "Access not found" }, { status: 404 });
    }

    const { data: shareCode, error: codeError } = await supabase
      .from("share_codes")
      .select("user_id")
      .eq("id", access.share_code_id)
      .single();

    if (codeError || !shareCode) {
      return NextResponse.json({ error: "Share code not found" }, { status: 404 });
    }

    if (shareCode.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Revoke access
    const { error: updateError } = await supabase
      .from("share_access")
      .update({ is_active: false })
      .eq("id", accessId);

    if (updateError) {
      console.error("Error revoking access:", updateError);
      return NextResponse.json({ error: "Failed to revoke access" }, { status: 500 });
    }

    return NextResponse.json({ message: "Access revoked" });
  } catch (error) {
    console.error("Error in share revoke API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
