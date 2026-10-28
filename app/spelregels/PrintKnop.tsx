"use client";

// 🖨️ De lichte printversie (A5, zwart op wit): het printen zelf regelt spelregels.css
export default function PrintKnop() {
  return <button type="button" className="sr-print" onClick={() => window.print()}>🖨️ Printen (A5, licht)</button>;
}
