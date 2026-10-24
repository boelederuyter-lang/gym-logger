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

## Trainingsschema

Tabblad **Trainen → Schema**: vijf vragen (doel, niveau, dagen, tijd, apparatuur) en je krijgt een blok van 4 weken met progressie (basis, +1 rep, zwaarder, deload). Bij vetverlies komt er na elke training een cardioblok bij.

- **Start training** bij een dag opent een gelogde workout met de sets, reps en rust van die week. In week 3 staat het gewicht al +2,5 kg (boven) of +5 kg (onder) hoger klaar, in de deload weer terug.
- Afgeronde schema-workouts tellen automatisch als gedaan; het startscherm zet de volgende schema-training klaar.
- **Wissel oefening**: klap een oefening open en kies een variant met hetzelfde bewegingspatroon. Een gedeelde link neemt je wissels mee.
- Schema-oefeningen zijn gekoppeld aan de oefeningenbibliotheek, dus PR's, voortgang en animaties werken gewoon. Oefeningen die niet in de bibliotheek staan worden als eigen oefening aangemaakt.
- Met de deelknop stuur je een link waarmee een vriend precies hetzelfde schema krijgt. Het oude adres `/schema/` verwijst door.
- Code: `src/plan/` (oefeningendatabase, generator, opslag, workouts starten) en `src/screens/PlanScreen.tsx`.

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
