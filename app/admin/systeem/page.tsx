import Systeemcheck from "@/components/admin/Systeemcheck";

// 🩺 Systeemcheck: database (migraties), opslag en instellingen in één overzicht
export default function SysteemPagina() {
  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel">Systeemcheck</span>
      </div>
      <div className="admin-content">
        <Systeemcheck />
      </div>
    </>
  );
}
