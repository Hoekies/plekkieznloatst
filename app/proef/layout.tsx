import { createAdminClient } from "@/lib/supabase-admin";
import { confettiInstelling } from "@/lib/huisstijl";
import ConfettiThema from "@/components/speler/ConfettiThema";

export const dynamic = "force-dynamic";

// 🧪 QR-proef van een vraag: zelfde confetti als de spelers
export default async function ProefLayout({ children }: { children: React.ReactNode }) {
  const confetti = await confettiInstelling(createAdminClient());
  return (
    <>
      <ConfettiThema sleutel={confetti.sleutel} emoji={confetti.emoji} />
      {children}
    </>
  );
}
