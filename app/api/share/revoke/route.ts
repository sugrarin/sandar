import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accessId } = await request.json();

    if (!accessId || typeof accessId !== "string") {
      return NextResponse.json({ error: "Invalid access ID" }, { status: 400 });
    }

    // Use security definer function to revoke access by owner
    const { error: revokeError } = await supabase.rpc(
      "revoke_access_by_owner",
      { p_access_id: accessId, p_owner_id: user.id },
    );

    if (revokeError) {
      console.error("Error revoking access:", revokeError);
      return NextResponse.json(
        { error: "Failed to revoke access" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Access revoked" });
  } catch (error) {
    console.error("Error in share revoke API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
