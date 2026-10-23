// Foutmeldingen die uitleggen wat er misging én wat je eraan doet.
// Gebruik: toonMelding(await foutUitleg(res, "Opslaan"), "fout")
// `res` mag null zijn (geen verbinding); `data` als de body al gelezen is.

// Technische servermeldingen die een beheerder niets zeggen: dan liever de uitleg bij de statuscode
const TECHNISCH = /(_id|\bid\b|ontbreekt|ongeldig|undefined|null|violates|constraint|relation|column|syntax|JSON)/i;

export function uitlegBijStatus(status: number, actie: string, serverTekst?: string | null): string {
  const tekst = serverTekst && !TECHNISCH.test(serverTekst) ? serverTekst.replace(/\.$/, "") : null;
  // Ontbrekende database-migratie: die uitleg altijd tonen (de beheerder kan er zelf iets aan doen)
  if (serverTekst && /migratie|SQL-bestand/i.test(serverTekst)) return `${actie} mislukt: ${serverTekst.replace(/\.$/, "")}.`;
  if (status === 0 || status === 503) return `${actie} mislukt: geen verbinding met de server. Controleer je internet en probeer het opnieuw.`;
  if (status === 401) return `${actie} mislukt: je bent uitgelogd. Log opnieuw in en probeer het nog eens.`;
  if (status === 403) return `${actie} mislukt: je hebt hiervoor geen rechten. Log in met een beheerdersaccount.`;
  if (status === 404) return `${actie} mislukt: dit bestaat niet meer (misschien net verwijderd). Herlaad de pagina.`;
  if (status === 413) return `${actie} mislukt: het bestand is te groot. Kies een kleiner bestand of verklein de afbeelding.`;
  if (status === 429) return `${actie} mislukt: te veel verzoeken achter elkaar. Wacht even en probeer het opnieuw.`;
  if (status >= 500) return `${actie} mislukt: er ging iets mis op de server. Probeer het over een minuut opnieuw; blijft het misgaan, herlaad dan de pagina.`;
  if (tekst) return `${actie} mislukt: ${tekst}.`;
  return `${actie} mislukt: controleer wat je hebt ingevuld en probeer het opnieuw.`;
}

export async function foutUitleg(res: Response | null, actie: string, data?: { fout?: string } | null): Promise<string> {
  if (!res) return uitlegBijStatus(0, actie);
  let body = data;
  if (body === undefined) body = await res.clone().json().catch(() => null);
  return uitlegBijStatus(res.status, actie, body?.fout);
}

// Ook bruikbaar voor fetch die zelf faalt (geen verbinding): fetch(...).catch(() => null)
