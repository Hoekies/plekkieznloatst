import fs from "fs";
import path from "path";
import { marked } from "marked";

// De beheerdershandleiding (docs/beheerdershandleiding.md) als leesbare pagina in het beheer
export default function UitlegPagina() {
  let html = "<p>De handleiding kon niet geladen worden.</p>";
  try {
    const tekst = fs.readFileSync(path.join(process.cwd(), "docs", "beheerdershandleiding.md"), "utf8");
    html = marked.parse(tekst, { async: false }) as string;
  } catch { /* bestand ontbreekt: melding hierboven */ }

  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel">📖 Handleiding</span>
      </div>
      <div className="admin-content">
        {/* Eigen bestand uit de repository, geen invoer van gebruikers */}
        <article className="uitleg-tekst" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </>
  );
}
