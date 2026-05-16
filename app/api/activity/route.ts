import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 26 * 7 + 1);

  const { data, error } = await supabase
    .from("sessions")
    .select("created_at, total_questions, correct_answers")
    .eq("user_id", user.id)
    .gte("created_at", since.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const buckets = new Map<
    string,
    { sessions: number; questions: number; correct: number }
  >();

  for (const row of data || []) {
    const day = new Date(row.created_at).toISOString().slice(0, 10);
    const cur = buckets.get(day) || {
      sessions: 0,
      questions: 0,
      correct: 0,
    };
    cur.sessions += 1;
    cur.questions += row.total_questions || 0;
    cur.correct += row.correct_answers || 0;
    buckets.set(day, cur);
  }

  const days: {
    date: string;
    sessions: number;
    questions: number;
    correct: number;
  }[] = [];

  buckets.forEach((value, date) => {
    days.push({ date, ...value });
  });
  days.sort((a, b) => (a.date < b.date ? -1 : 1));

  return NextResponse.json({
    since: since.toISOString().slice(0, 10),
    weeks: 26,
    days,
  });
}
