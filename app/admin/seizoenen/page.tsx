import SeizoenAfbeeldingen from "@/components/admin/SeizoenAfbeeldingen";
import MenuIcoon from "@/components/admin/MenuIcoon";

// 🗓️ Seizoenen en feestdagen: achtergrond van het welkomstscherm en het spellogo, voor alle routes
export default function SeizoenenPagina() {
  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel"><MenuIcoon naam="seizoenen" />Seizoenen en feestdagen</span>
      </div>
      <div className="admin-content">
        <div className="pr-gem-panel" style={{ maxWidth: 900 }}>
          <div className="pr-gem-panel-inner">
            <SeizoenAfbeeldingen />
          </div>
        </div>
      </div>
    </>
  );
}
