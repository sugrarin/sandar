import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get share code for current user
    const { data: shareCode, error: codeError } = await supabase
      .from("share_codes")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (codeError || !shareCode) {
      return NextResponse.json({ access: [] });
    }

    // Get all viewers for this share code with their profile info
    const { data: access, error: accessError } = await supabase
      .from("share_access")
      .select(`
        id,
        share_code_id,
        viewer_id,
        activated_at,
        is_active,
        profiles!share_access_viewer_id_fkey (
          email,
          display_name,
          avatar_url
        )
      `)
      .eq("share_code_id", shareCode.id)
      .eq("is_active", true);

    if (accessError) {
      console.error("Error getting share access:", accessError);
      return NextResponse.json({ error: "Failed to get share access" }, { status: 500 });
    }

    const formattedAccess = access?.map((a: any) => ({
      id: a.id,
      share_code_id: a.share_code_id,
      viewer_id: a.viewer_id,
      viewer_email: a.profiles?.email,
      viewer_display_name: a.profiles?.display_name,
      viewer_avatar_url: a.profiles?.avatar_url,
      activated_at: a.activated_at,
      is_active: a.is_active,
    })) || [];

    return NextResponse.json({ access: formattedAccess });
  } catch (error) {
    console.error("Error in share access API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
