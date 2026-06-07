import RoutesOverzicht from "@/components/admin/RoutesOverzicht";

export default function RoutesPage() {
  return (
    <>
      <div className="admin-topbar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/help/routes.png" alt="Routes" style={{ height: 36, borderRadius: 6 }} />
      </div>
      <div className="admin-content">
        <RoutesOverzicht />
      </div>
    </>
  );
}
