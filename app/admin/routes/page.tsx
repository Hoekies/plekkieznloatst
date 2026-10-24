import RoutesOverzicht from "@/components/admin/RoutesOverzicht";
import MenuIcoon from "@/components/admin/MenuIcoon";

export default function RoutesPage() {
  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel"><MenuIcoon naam="routes" />Routes</span>
      </div>
      <div className="admin-content">
        <RoutesOverzicht />
      </div>
    </>
  );
}
