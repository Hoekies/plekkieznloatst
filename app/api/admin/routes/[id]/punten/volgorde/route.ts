import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Body: { volgorde: ["uuid1", "uuid2", ...] }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const body = await request.json();
  const volgorde: string[] = body.volgorde;
  if (!Array.isArray(volgorde)) return NextResponse.json({ fout: "Ongeldig verzoek" }, { status: 400 });

  const admin = createAdminClient();

  await Promise.all(
    volgorde.map((id, i) =>
      admin.from("route_points").update({ order_index: i + 1 }).eq("id", id).eq("route_id", params.id)
    )
  );
  return NextResponse.json({ ok: true });
}
