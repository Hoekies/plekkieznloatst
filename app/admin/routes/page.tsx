import RoutesOverzicht from "@/components/admin/RoutesOverzicht";

export default function RoutesPage() {
  return (
    <>
      <div className="admin-topbar">
        <h1>Routes</h1>
      </div>
      <div className="admin-content">
        <RoutesOverzicht />
      </div>
    </>
  );
}
