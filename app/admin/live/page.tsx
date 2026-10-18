import Link from "next/link";
import { haalLiveData } from "@/lib/admin-live";
import { haalGebruiker } from "@/lib/auth-server";
import AdminLiveKaart from "@/components/admin/AdminLiveKaart";

export default async function LiveKaartPagina() {
  const [initData, user] = await Promise.all([haalLiveData(), haalGebruiker()]);

  // Zonder actieve route valt er niets te volgen: melding in plaats van een lege kaart
  if (!initData.route) {
    const helper = user?.app_metadata?.rol === "helper";
    return (
      <>
        <div className="admin-topbar">
          <span className="admin-topbar-titel">Live kaart</span>
        </div>
        <div className="admin-content">
          <div className="card leeg-scherm">
            <p>Er is geen actieve route, dus er is nog niets live te volgen.{helper ? " Vraag de spelleider om een route te activeren." : " Activeer eerst een route."}</p>
            {!helper && <Link href="/admin/routes" className="rl-knop rl-knop--cyan actie-knop">🗺️ Naar routes</Link>}
          </div>
        </div>
      </>
    );
  }

  return <AdminLiveKaart initData={initData} />;
}
