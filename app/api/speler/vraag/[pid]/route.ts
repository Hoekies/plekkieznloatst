import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Geeft vraag terug ZONDER is_correct op antwoordopties — nooit onthullen aan client vóór beantwoording
export async function GET(_: NextRequest, { params }: { params: { pid: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();

  const { data: vraag } = await admin
    .from("questions")
    .select(`
      id, route_point_id, type, question_text, question_image_path, points,
      answer_options(id, color, answer_type, text, image_path, order_index)
    `)
    .eq("route_point_id", params.pid)
    .order("order_index", { referencedTable: "answer_options" })
    .maybeSingle();

  return NextResponse.json(vraag ?? null);
}
