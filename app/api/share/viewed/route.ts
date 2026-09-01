import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use security definer function to get viewed students
    const { data: students, error: accessError } = await supabase.rpc(
      "get_viewed_students",
      { p_viewer_id: user.id },
    );

    if (accessError) {
      console.error("Error getting viewed students:", accessError);
      return NextResponse.json(
        { error: "Failed to get viewed students" },
        { status: 500 },
      );
    }

    return NextResponse.json({ students: students || [] });
  } catch (error) {
    console.error("Error in share viewed API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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
      return NextResponse.json(
        { error: "Failed to deactivate access" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Access deactivated" });
  } catch (error) {
    console.error("Error in share viewed DELETE API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
