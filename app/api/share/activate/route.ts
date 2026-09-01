import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const { data: shareCode, error: codeError } = await supabase.rpc(
      "validate_share_code",
      { p_code: code },
    );

    if (codeError || !shareCode || shareCode.length === 0) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    if (shareCode[0].user_id === user.id) {
      return NextResponse.json(
        { error: "Cannot activate your own code" },
        { status: 400 },
      );
    }

    const { data: existingAccess, error: existingError } = await supabase
      .from("share_access")
      .select("id, is_active")
      .eq("share_code_id", shareCode[0].id)
      .eq("viewer_id", user.id)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing access:", existingError);
      return NextResponse.json(
        { error: "Failed to check existing access" },
        { status: 500 },
      );
    }

    if (existingAccess) {
      if (existingAccess.is_active) {
        return NextResponse.json({
          message: "Already activated",
          student_id: shareCode[0].user_id,
        });
      } else {
        const { error: reactivateError } = await supabase
          .from("share_access")
          .update({ is_active: true })
          .eq("id", existingAccess.id);

        if (reactivateError) {
          console.error("Error reactivating access:", reactivateError);
          return NextResponse.json(
            { error: "Failed to reactivate access" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          message: "Access reactivated",
          student_id: shareCode[0].user_id,
        });
      }
    }

    const { error: insertError } = await supabase.from("share_access").insert({
      share_code_id: shareCode[0].id,
      viewer_id: user.id,
    });

    if (insertError) {
      console.error("Error creating access:", insertError);
      return NextResponse.json(
        { error: "Failed to create access" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Access activated",
      student_id: shareCode[0].user_id,
    });
  } catch (error) {
    console.error("Error in share activate API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
