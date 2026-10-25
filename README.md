# Gym Logger

Een snelle, overzichtelijke workout-logger voor de iPhone. Het is een PWA: je opent hem in Safari en zet hem op je beginscherm.

## Wat kan hij

- **Trainen**: één tabblad met je gegenereerde **Schema** en je eigen **Programma's** (vaste trainingen met oefeningen, sets, reps, rusttijd en supersets).
- **Losse workouts**: start leeg en voeg onderweg oefeningen toe (meerdere tegelijk).
- **Vorige keer**: per set zie je wat je de vorige keer deed, alvast ingevuld.
- **Progressie**: haalde je vorige keer in elke set de bovenkant van je reps, dan staat er 2,5 kg (benen met stang: 5 kg) meer klaar.
- **Afvinken**: tik ✓ en de rusttimer start. Het gewicht schuift door naar de volgende sets. Onder de volgende set staan grote −/+ knoppen.
- **Supersets**: koppel een oefening aan de volgende; de rust start pas na de laatste.
- **Bezet?** Machine of bank bezet: kies via het menu van de oefening een vervanger die hetzelfde traint. Je open sets gaan mee.
- **Weinig tijd?** Kies hoeveel minuten je nog hebt; de app kort de rest van je training slim in (eerst rust, dan sets, dan de laatste oefeningen).
- **Scherm blijft aan** tijdens een workout, en het piepje aan het einde van de rust kun je uitzetten.
- **PR's**: zwaarste gewicht, beste geschatte 1RM en meeste reps, met een gouden banner en een trofee op de set.
- **Warming-up sets**: automatisch berekend vanuit je werkgewicht.
- **Voortgang**: grafieken per oefening (1RM, zwaarste gewicht, volume of reps) met periodes en een tabel. Afgeronde workouts kun je achteraf bewerken.
- **Oefeningenbibliotheek**: 129 oefeningen met een geanimeerd poppetje, uitvoeringstip, aliassen en je eigen notitie.
- **Offline**: alles staat lokaal op je telefoon. Eén keer per week vraagt de app om een backup (bewaar hem in iCloud Drive); export en import staan ook onder ⚙︎.

## Op je iPhone zetten

1. Open https://boelederuyter-lang.github.io/gym-logger/ in **Safari**.
2. Tik op Delen → **Zet op beginscherm**.
3. Open hem vanaf je beginscherm. Hij draait dan fullscreen en werkt ook zonder internet.

Elke telefoon heeft zijn eigen data, dus een vriend kan dezelfde link gebruiken.

## Coach en trainingsschema

Tabblad **Trainen → Schema**: een korte vragenlijst (doel, ervaring, dagen, tijd, materiaal, prioriteit, blessures, kracht) en de coach maakt je schema. Alles draait op je telefoon met vaste regels: geen AI, geen internet.

- **Indeling** op basis van je dagen: 2 = full body A/B, 3 = full body A/B/C (ervaren: push/pull/legs), 4 = upper/lower, 5 = upper/lower + push/pull/legs, 6 = push/pull/legs ×2.
- **Oefeningen** passen bij je materiaal en niveau en belasten geen geblesseerd gewricht. Bekende basisoefeningen gaan voor.
- **Reps** volgen je doel, **sets en aantal oefeningen** je tijd. Prioriteitsspieren krijgen 1–2 extra sets per week.
- **Startgewicht**: vul je je kracht in, dan rekent de coach met de Epley-formule een startgewicht uit (iets aan de lichte kant). Anders staat er welk gewicht je moet kiezen.
- **Wissel oefening** per plek, **Opnieuw genereren** voor andere keuzes, **Profiel aanpassen** voor andere antwoorden.
- Elke week begin je opnieuw met afvinken; haal je alle sets bovenin het repbereik, dan staat de volgende keer meer gewicht klaar.
- Met de deelknop krijgt een vriend precies hetzelfde schema (zonder jouw kracht of lichaamsgewicht).
- Schema's van het oude formulier (blok van 4 weken) blijven werken tot je je profiel aanpast.
- Code: `src/coach/` (oefeningendatabase, profiel, generator; los te testen) en `src/plan/` (opslag, workouts starten), schermen `src/screens/Onboarding.tsx` en `src/screens/PlanScreen.tsx`.

## Ontwikkelen

```bash
npm install
npm run dev      # lokale dev-server (galerij met alle animaties: /#figuren)
npm test         # unit-tests (PR's, warming-up, grafieken, migratie, schema)
npm run build    # productie-build in dist/
npm run format   # Prettier
```

Stack: Vite, React, TypeScript, Dexie (IndexedDB), vite-plugin-pwa en Vitest.

## Deployen

Bij een push bouwt `.github/workflows/deploy.yml` de app, draait de tests en publiceert hem op GitHub Pages.
