import GroepenBeheer from "@/components/admin/GroepenBeheer";

export default function GroepenPagina() {
  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel">Groepen</span>
      </div>
      <div className="admin-content">
        <GroepenBeheer />
      </div>
    </>
  );
}
