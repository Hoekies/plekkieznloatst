import AntwoordenOverzicht from "@/components/admin/AntwoordenOverzicht";

export default function AntwoordenPagina() {
  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel">Antwoorden &amp; uitslag</span>
      </div>
      <div className="admin-content">
        <AntwoordenOverzicht />
      </div>
    </>
  );
}
