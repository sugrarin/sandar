import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    // Check rate limit
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc(
      "check_rate_limit",
      { p_user_id: user.id },
    );

    if (rateLimitError) {
      console.error("Error checking rate limit:", rateLimitError);
      return NextResponse.json(
        { error: "Failed to check rate limit" },
        { status: 500 },
      );
    }

    if (
      !rateLimitCheck ||
      rateLimitCheck.length === 0 ||
      !rateLimitCheck[0].allowed
    ) {
      const check = rateLimitCheck?.[0];
      if (check?.error_message === "locked_day") {
        return NextResponse.json(
          {
            error: "locked_day",
            locked_until: check.locked_until,
          },
          { status: 429 },
        );
      } else if (check?.error_message === "locked_minute") {
        return NextResponse.json(
          {
            error: "locked_minute",
            locked_until: check.locked_until,
          },
          { status: 429 },
        );
      }
    }

    // Find the share code using the security definer function
    const { data: shareCode, error: codeError } = await supabase.rpc(
      "validate_share_code",
      { p_code: code },
    );

    if (codeError || !shareCode || shareCode.length === 0) {
      // Record failed attempt
      await supabase.rpc("record_failed_attempt", { p_user_id: user.id });

      // Check if this was the 4th attempt (ban for day)
      const { data: newRateLimit } = await supabase
        .from("share_rate_limit")
        .select("failed_attempts, locked_until")
        .eq("user_id", user.id)
        .single();

      if (newRateLimit && newRateLimit.failed_attempts >= 4) {
        return NextResponse.json(
          {
            error: "locked_day",
            locked_until: newRateLimit.locked_until,
          },
          { status: 429 },
        );
      } else if (newRateLimit && newRateLimit.failed_attempts >= 3) {
        return NextResponse.json(
          {
            error: "locked_minute",
            locked_until: newRateLimit.locked_until,
          },
          { status: 429 },
        );
      }

      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Check if user is trying to activate their own code
    if (shareCode[0].user_id === user.id) {
      return NextResponse.json(
        { error: "Cannot activate your own code" },
        { status: 400 },
      );
    }

    // Check if already activated
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
        // Already active, reset rate limit
        await supabase.rpc("reset_rate_limit", { p_user_id: user.id });
        return NextResponse.json({
          message: "Already activated",
          student_id: shareCode[0].user_id,
        });
      } else {
        // Reactivate
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

        await supabase.rpc("reset_rate_limit", { p_user_id: user.id });
        return NextResponse.json({
          message: "Access reactivated",
          student_id: shareCode[0].user_id,
        });
      }
    }

    // Create new access
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

    // Reset rate limit on success
    await supabase.rpc("reset_rate_limit", { p_user_id: user.id });

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
