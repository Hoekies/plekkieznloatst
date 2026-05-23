# Prompts per fase voor Claude Code

Project: Nederlandstalige PWA voor route-gebaseerd spel op een kaart  
Stack: Next.js / React / TypeScript / Leaflet / OpenStreetMap / Supabase / Vercel

Gebruik dit bestand stap voor stap. Geef Claude Code steeds maar één fase tegelijk. Laat hem na elke fase kort uitleggen wat hij heeft gemaakt en welke bestanden zijn aangepast.

---

## Fase 0 — Projectanalyse en aanpak

```txt
Ik wil een Nederlandstalige PWA bouwen voor een route-gebaseerd spel op een kaart.

Stack:
- Next.js / React
- TypeScript
- Leaflet met OpenStreetMap
- Supabase voor Auth, database, storage en realtime
- Hosting via Vercel

De app heeft twee interfaces:
1. Beheerder-app voor desktop
2. Speler-app voor mobiel

Algemeen:
- Alles moet Nederlandstalig zijn.
- Geen dark mode.
- De speler-app moet responsive zijn voor mobiele schermen.
- De app moet als PWA installeerbaar zijn.
- Offline spelen is niet vereist.
- Kaarttegels hoeven niet offline beschikbaar te zijn.
- Toon een duidelijke melding bij geen internetverbinding.

Werk niet direct alles uit in code.
Maak eerst:
- technisch ontwerp
- datamodel
- Supabase-tabellen
- RLS/policies op hoofdlijnen
- routes/pages
- componentstructuur
- bouwvolgorde
- belangrijkste randgevallen

Geef daarna aan welke bestanden je in fase 1 gaat maken.
```

---

## Fase 1 — Projectsetup

```txt
Maak nu de basis van het project.

Eisen:
- Next.js met TypeScript
- duidelijke mappenstructuur
- Supabase client setup
- environment variables voorbeeldbestand
- Leaflet dependencies
- PWA configuratie
- basislayout voor admin en speler
- eenvoudige Nederlandstalige navigatie
- geen dark mode

Maak nog geen complexe functionaliteit.
Zorg dat het project lokaal kan starten.

Gewenste structuur:
- /app
- /components
- /lib
- /types
- /styles
- /public
- /supabase

Lever ook een korte uitleg:
- welke bestanden zijn gemaakt
- welke env variables nodig zijn
- hoe ik lokaal start
```

---

## Fase 2 — Supabase schema en datamodel

```txt
Maak het Supabase datamodel en SQL-migratiebestanden.

Gebruik minimaal deze tabellen:

routes
- id
- name
- status
- is_active
- created_at
- updated_at

route_points
- id
- route_id
- order_index
- type
- name
- description
- latitude
- longitude
- radius_meters
- points
- image_path
- sound_path
- created_at
- updated_at

questions
- id
- route_point_id
- type
- question_text
- question_image_path
- points
- correct_text_answers
- numeric_answer
- numeric_tolerance
- created_at
- updated_at

answer_options
- id
- question_id
- order_index
- color
- answer_type
- text
- image_path
- is_correct

players
- id
- group_name
- auth_user_id
- active_device_id
- created_at

player_sessions
- id
- player_id
- route_id
- started_at
- finished_at
- current_point_id
- score
- status

player_point_progress
- id
- session_id
- route_point_id
- reached_at
- answered_at
- selected_answer_id
- open_answer_text
- is_correct
- points_awarded

location_updates
- id
- session_id
- latitude
- longitude
- accuracy_meters
- public_latitude
- public_longitude
- created_at

Belangrijke regels:
- Er mag maar één route tegelijk actief/gepubliceerd zijn.
- Een speler/groep mag maar één actieve sessie hebben.
- Eén groep mag maar op één apparaat tegelijk actief zijn.
- selected_answer_id is gevuld bij meerkeuzevragen en null bij open vragen.
- open_answer_text is gevuld bij open vragen en null bij meerkeuzevragen.
- Voeg indexes toe waar logisch.
- Voeg constraints toe waar logisch.
- Voeg RLS policies op hoofdlijnen toe.
- Maak TypeScript types voor deze tabellen.

Geef na afloop uitleg over:
- belangrijkste relaties
- constraints
- wat nog server-side afgedwongen moet worden
```

---

## Fase 3 — Authenticatie en rollen

```txt
Bouw de authenticatie.

Eisen:
- Gebruik Supabase Auth.
- Geen hardcoded wachtwoorden in frontend-code.
- Geen e-mail-reset in MVP.
- Admin en groepen worden beheerd via het admin-dashboard.
- De beheerder kan groepen aanmaken.
- Elke groep heeft een eigen login en wachtwoord.
- Wachtwoorden moeten wijzigbaar zijn in de adminomgeving.
- Eén groep mag maar op één apparaat tegelijk actief zijn.
- Als dezelfde groep op een tweede apparaat probeert in te loggen, blokkeer de tweede login.
- Als dezelfde groep opnieuw opent op hetzelfde apparaat, moet de sessie hervatten waar deze gebleven was.
- Login bepaalt welke interface zichtbaar is:
  - admin -> beheerder-app
  - speler/groep -> speler-app

Maak:
- loginpagina
- logout
- role-check
- route guards
- device-id opslag in browser
- foutmeldingen in het Nederlands

Werk veilig:
- geen wachtwoorden loggen
- geen wachtwoorden in client opslaan
```

---

## Fase 4 — Admin route-editor

```txt
Bouw de beheerder route-editor.

Eisen:
- Beheerder kan routes aanmaken
- routes wijzigen
- routes verwijderen
- routes publiceren/depubliceren
- actieve route kiezen
- er mag maar één route actief zijn
- punten plaatsen door op de kaart te klikken
- punten verslepen
- volgorde van punten handmatig aanpassen
- route als polyline tonen
- puntgegevens bewerken:
  - naam
  - beschrijving
  - type: vraagpunt / informatiepunt / eindpunt
  - radius_meters, standaard 10
  - points
  - afbeelding
  - geluid

Geen adreszoekfunctie.
Geen handmatige invoer van coördinaten nodig.

Gebruik Leaflet met OpenStreetMap.
Zorg dat de interface praktisch werkt op desktop.
```

---

## Fase 5 — Vraag-editor en uploads

```txt
Bouw de vraag-editor bij routepunten.

Vraagtypes:
1. meerkeuze tekst
2. meerkeuze afbeelding
3. open tekst/numeriek antwoord

Meerkeuzevragen:
- exact drie antwoorden
- per vraag zijn alle antwoorden hetzelfde type:
  - allemaal tekst
  - of allemaal afbeelding
- gemengde antwoordtypes binnen één meerkeuzevraag zijn niet toegestaan
- antwoordkleuren zijn vast:
  - geel
  - blauw
  - rood
- exact één correct antwoord
- vraag zelf mag optioneel een afbeelding bevatten
- bij fout antwoord wordt later altijd het juiste antwoord getoond
- geen uitlegveld nodig
- speler mag vraag niet opnieuw proberen

Open vragen:
- speler vult zelf antwoord in
- geschikt voor rekenvragen
- beheerder stelt één of meerdere correcte tekst-antwoorden in, of één numeriek antwoord
- tekstantwoorden hoofdletterongevoelig controleren
- spaties aan begin/einde negeren
- numeriek antwoord kan optioneel tolerantie hebben
- geen AI-beoordeling
- geen handmatige beoordeling in MVP

Voorbeelden open numerieke vragen:
Vraag: Hoeveel is 12 x 8?
Correct antwoord: 96
Tolerantie: 0

Vraag: Hoeveel meter is 1,98 km?
Correct antwoord: 1980
Tolerantie: 1
Dan worden 1979, 1980 en 1981 goed gerekend.

Numerieke invoer:
- 1,5 en 1.5 moeten beide als 1.5 verwerkt worden.

Uploads:
- toegestaan: jpg, png, webp
- afbeeldingen vóór upload comprimeren in browser naar max. 500 kB
- maximale breedte na compressie: 1200 px
- opslaan in Supabase Storage
- afbeeldingen mogen nooit via externe website-URL’s gebruikt worden
```

---

## Fase 6 — Speler startflow en PWA-intro

```txt
Bouw de mobiele speler-startflow.

Eisen:
- Bij openen ziet speler eerst 5 seconden een statische cartoon-landkaart met logo-overlay op transparante achtergrond.
- Tijdens deze 5 seconden wordt nog geen locatie-permissie gevraagd.
- Gebruik voor MVP een eenvoudige placeholder-afbeelding in cartoonstijl.
- Deze moet later vervangbaar zijn via /public/intro-map.png.
- Logo wordt later in de projectmap geplaatst.
- Na intro:
  - locatie-permissie vragen
  - startknop tonen
  - bij weigeren locatie-permissie melding: spel kan niet gespeeld worden
- Tijd start pas wanneer speler op “Start spel” drukt.
- Bij refresh, telefoon vergrendelen of opnieuw openen moet speler verdergaan waar hij gebleven was.
- Toon melding bij geen internetverbinding.
```

---

## Fase 7 — Spelerkaart en puntdetectie

```txt
Bouw de spelerkaart.

Eisen:
- Speler ziet eigen locatie.
- Speler ziet alleen het actieve volgende punt en de reeds behaalde punten.
- Speler ziet geen toekomstige punten.
- Lijn/polyline alleen tussen behaalde punten tonen.
- Kaart mag meebewegen/draaien met de speler.
- Punten moeten in vaste volgorde bezocht worden.
- Volgende punt wordt pas zichtbaar als het vorige punt verwerkt is.
- Speler mag niet terug naar eerdere punten.

Punt bereiken:
- Punt wordt automatisch bereikt zodra speler binnen ingestelde radius komt.
- Puntdetectie is direct.
- Voeg knop “Controleer locatie” toe.
- Controleer GPS accuracy; als accuracy te slecht is, toon Nederlandstalige melding.
- Als GPS tijdelijk wegvalt, toon melding en wacht tot GPS terug is.
- Geen anti-GPS-spoofing nodig.
- Locatie wordt bijgewerkt bij beweging.
- Locatie-tracking stopt na het spel.

Bij bereiken van punt:
- standaardgeluid afspelen
- popup tonen met informatie of vraag
```

---

## Fase 8 — Vraag-popup, antwoordcontrole en score

```txt
Bouw de vraag-popup en antwoordcontrole.

Eisen:
- Popup verschijnt wanneer speler het actieve vraagpunt bereikt.
- Bij informatiepunt alleen informatie tonen en daarna doorgaan.
- Bij meerkeuzevraag:
  - toon drie opties in vaste kleuren geel/blauw/rood
  - tekst of afbeeldingen afhankelijk van vraagtype
  - speler mag één keer antwoorden
  - na antwoord direct feedback
  - bij fout antwoord juiste antwoord tonen
- Bij open vraag:
  - invoerveld tonen
  - antwoord normaliseren:
    - trim spaties
    - hoofdletterongevoelig voor tekst
    - komma en punt als decimaalteken ondersteunen
  - numeriek controleren met tolerantie
  - bij fout antwoord juiste antwoord tonen
- Score opslaan in player_point_progress en player_sessions.
- Na verwerken wordt het volgende punt actief.

Gebruik:
player_point_progress
- id
- session_id
- route_point_id
- reached_at
- answered_at
- selected_answer_id
- open_answer_text
- is_correct
- points_awarded
```

---

## Fase 9 — Eindpunt, finish en leaderboard

```txt
Bouw het eindpunt en finish-scherm.

Eindpunt:
- Eindpunt kan optioneel een vraag bevatten.
- Als eindpunt geen vraag heeft, stopt tijd direct bij bereiken.
- Als eindpunt wel een vraag heeft, stopt tijd na beantwoorden.
- Bij finish:
  - geluid afspelen
  - confetti tonen
  - gebruikte tijd tonen
  - behaalde punten tonen
  - top 3 leaderboard tonen

Ranking:
1. hoogste aantal punten
2. bij gelijke punten: kortste speeltijd

Geen tijdbonus.
Geen strafpunten voor langzaam spelen.

Leaderboard:
- toont punten en tijd
- scores worden live bijgewerkt
- speler ziet alleen top 3
- speler ziet niet zijn eigen positie buiten top 3
- top 3 moet live wijzigen als later iemand beter scoort of sneller finisht
```

---

## Fase 10 — Andere spelers op kaart

```txt
Bouw live locaties van andere spelers.

Eisen:
- Spelers zien andere spelers live op de kaart.
- Andere spelers worden met naam getoond.
- Spelers zien alleen spelers in dezelfde actieve route/game.
- Locaties van andere spelers worden ongeveer getoond, niet exact.
- Voor spelers worden andere spelers als cirkel weergegeven.
- Afronden tot ongeveer 50 meter.
- Posities van andere spelers maximaal één keer per minuut publiceren.
- Geen continue realtime locatie-spam.
- Publiceer positie elke 60 seconden als speler beweegt.
- Spelers die klaar zijn blijven zichtbaar.
- Als locatie ouder is dan 2 minuten:
  - toon als grijze/verouderde cirkel
  - label: “laatst gezien >2 min”
- De beheerder ziet exacte laatst bekende locaties.
- De beheerder kan het tonen van andere spelers uitschakelen.

Als Supabase realtime tijdelijk niet werkt:
- toon melding “Live verbinding onderbroken”
- probeer automatisch opnieuw te verbinden
- speler moet waar mogelijk eigen route kunnen blijven spelen
```

---

## Fase 11 — Admin dashboard live functies

```txt
Bouw de live admin-dashboard functies.

Schermen:
- speler-overzicht
- leaderboard
- live kaart
- instellingen

Beheerder kan per groep zien:
- gestart om
- huidige score
- huidig punt
- bezochte punten
- laatst gezien
- status

Beheerder ziet:
- exacte laatst bekende locaties
- actuele leaderboard
- welke punten elke groep heeft gehad
- welk punt elke groep nu zoekt

Beheerder hoeft spelers niet te kunnen pauzeren.
Beheerder hoeft spelers niet individueel te resetten.
```

---

## Fase 12 — Resetfunctie

```txt
Bouw de resetfunctie voor de beheerder.

Eisen:
- Knop: “Nieuw spel starten / scores wissen”
- Toon duidelijke waarschuwing en bevestiging.
- Reset wist:
  - actieve spelersessies
  - starttijden
  - eindtijden
  - antwoorden
  - scores
  - locatiehistorie
  - leaderboard
- Reset behoudt:
  - routes
  - punten
  - vragen
  - antwoordopties
  - uploads
  - groepen/accounts
- Na reset kunnen groepen opnieuw starten.
- Controleer dat refresh/hervatten na reset niet terugvalt naar oude sessie.
```

---

## Fase 13 — Route export/import JSON

```txt
Bouw route export/import.

Eisen:
- Export als JSON-bestand.
- Import van JSON-bestand.
- Inclusief:
  - route
  - route_points
  - questions
  - answer_options
  - instellingen
- Afbeeldingen worden niet fysiek in JSON opgeslagen.
- Afbeeldingen worden gerefereerd via Supabase Storage paths.
- Voor volledige backup kan later ZIP-export toegevoegd worden.
- Valideer importbestand voordat gegevens worden opgeslagen.
- Geef duidelijke Nederlandstalige foutmeldingen.
- Voorkom dat import automatisch een route actief maakt zonder bevestiging.
```

---

## Fase 14 — Afwerking, foutafhandeling en testdata

```txt
Werk de app af.

Eisen:
- Nederlandstalige foutmeldingen
- loading states
- lege states
- mobiele layout nalopen
- admin desktop layout nalopen
- geen dark mode
- duidelijke meldingen voor:
  - geen internet
  - geen GPS
  - GPS accuracy te slecht
  - locatie-permissie geweigerd
  - realtime verbinding onderbroken
  - tweede apparaat geblokkeerd
- eenvoudige testdata/seed maken:
  - één route
  - meerdere punten
  - meerkeuze tekstvraag
  - meerkeuze afbeeldingsvraag
  - open numerieke vraag
  - eindpunt

Controleer ook:
- speler kan hervatten na refresh
- speler kan hervatten na opnieuw openen
- tweede apparaat wordt geblokkeerd
- reset werkt volledig
- leaderboard sorteert correct
- open vragen met komma-notatie werken
```

---

## Fase 15 — Eindcontrole

```txt
Voer een technische eindcontrole uit.

Controleer:
- TypeScript errors
- build errors
- lint errors
- ontbrekende environment variables
- Supabase policies
- onveilige client-side logica
- hardcoded wachtwoorden
- hardcoded secrets
- mobiele bruikbaarheid
- PWA-installatie
- foutafhandeling
- dataconsistentie bij refresh
- resetgedrag
- leaderboard-sortering
- locatie-updates
- uploadcompressie

Geef een lijst:
1. wat werkt
2. wat nog aandacht nodig heeft
3. bekende beperkingen
4. aanbevolen vervolgstappen
```
