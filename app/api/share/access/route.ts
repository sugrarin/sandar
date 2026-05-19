import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    // Use security definer function to get owner's share access
    const { data: access, error: accessError } = await supabase.rpc(
      "get_owner_share_access",
      { p_owner_id: user.id },
    );

    if (accessError) {
      console.error("Error getting share access:", accessError);
      return NextResponse.json(
        { error: "Failed to get share access" },
        { status: 500 },
      );
    }

    const formattedAccess =
      access?.map((a: any) => ({
        id: a.id,
        share_code_id: a.share_code_id,
        viewer_id: a.viewer_id,
        viewer_email: a.viewer_email,
        viewer_display_name: a.viewer_display_name,
        viewer_avatar_url: a.viewer_avatar_url,
        activated_at: a.activated_at,
        is_active: a.is_active,
      })) || [];

    return NextResponse.json({ access: formattedAccess });
  } catch (error) {
    console.error("Error in share access API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
