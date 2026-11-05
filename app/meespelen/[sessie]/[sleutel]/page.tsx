import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalHuisstijl } from "@/lib/huisstijl";
import { themaScript } from "@/lib/kleurthema";
import { meespeelSleutelKlopt } from "@/lib/meespelen";
import MeespeelScherm from "@/components/speler/MeespeelScherm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meespelen | PointRush", robots: { index: false, follow: false } };

// 🤝 Meespeellink: openbaar met de geheime sleutel van dit spel, zonder inloggen. Zie lib/meespelen.ts
export default async function MeespeelPagina({ params }: { params: { sessie: string; sleutel: string } }) {
  const klopt = meespeelSleutelKlopt(params.sessie, params.sleutel);
  const huisstijl = klopt ? await haalHuisstijl(createAdminClient()) : null;
  return (
    <>
      {/* 🎨 Dezelfde kleur als de spelersapp, vóór het tekenen */}
      {huisstijl && <script dangerouslySetInnerHTML={{ __html: themaScript(huisstijl.thema) }} />}
      <MeespeelScherm sessie={params.sessie} sleutel={params.sleutel} linkKlopt={klopt} />
    </>
  );
}
