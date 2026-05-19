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

    // Get rate limit status
    const { data: rateLimit, error: rateLimitError } = await supabase
      .from("share_rate_limit")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (rateLimitError && rateLimitError.code !== "PGRST116") {
      console.error("Error getting rate limit:", rateLimitError);
      return NextResponse.json(
        { error: "Failed to get rate limit" },
        { status: 500 },
      );
    }

    if (!rateLimit) {
      return NextResponse.json({
        failed_attempts: 0,
        locked_until: null,
        can_attempt: true,
      });
    }

    const isLocked =
      rateLimit.locked_until && new Date(rateLimit.locked_until) > new Date();
    const canAttempt = !isLocked;

    return NextResponse.json({
      failed_attempts: rateLimit.failed_attempts,
      locked_until: rateLimit.locked_until,
      canAttempt,
    });
  } catch (error) {
    console.error("Error in share rate limit API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
