import RoutesOverzicht from "@/components/admin/RoutesOverzicht";

export default function RoutesPage() {
  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel">Routes</span>
      </div>
      <div className="admin-content">
        <RoutesOverzicht />
      </div>
    </>
  );
}
