import AntwoordenOverzicht from "@/components/admin/AntwoordenOverzicht";
import { haalGebruiker } from "@/lib/auth-server";
import MenuIcoon from "@/components/admin/MenuIcoon";

export default async function AntwoordenPagina() {
  const user = await haalGebruiker();
  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel"><MenuIcoon naam="antwoorden" />Antwoorden &amp; uitslag</span>
      </div>
      <div className="admin-content">
        <AntwoordenOverzicht beperkt={user?.app_metadata?.rol === "helper"} />
      </div>
    </>
  );
}
