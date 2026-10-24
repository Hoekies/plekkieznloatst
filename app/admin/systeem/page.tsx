import Systeemcheck from "@/components/admin/Systeemcheck";
import MenuIcoon from "@/components/admin/MenuIcoon";

// 🩺 Systeemcheck: database (migraties), opslag en instellingen in één overzicht
export default function SysteemPagina() {
  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel"><MenuIcoon naam="systeem" />Systeemcheck</span>
      </div>
      <div className="admin-content">
        <Systeemcheck />
      </div>
    </>
  );
}
