import GroepenBeheer from "@/components/admin/GroepenBeheer";
import HelpersBeheer from "@/components/admin/HelpersBeheer";

export default function GroepenPagina() {
  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel">Spelers</span>
      </div>
      <div className="admin-content">
        <GroepenBeheer />
        <HelpersBeheer />
      </div>
    </>
  );
}
