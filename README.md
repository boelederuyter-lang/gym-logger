# Gym Logger

Een simpele, snelle workout-logger voor de iPhone. Het is een PWA: je opent hem in Safari en zet hem op je beginscherm.

## Wat kan hij

- **Schema's**: maak vaste trainingen (bijv. Push / Pull / Legs) met oefeningen, sets en reps.
- **Losse workouts**: start een lege workout en voeg onderweg oefeningen toe.
- **Vorige keer**: bij elke set zie je wat je de vorige keer deed. Gewichten worden alvast ingevuld.
- **Afvinken = klaar**: tik ✓ en de rusttimer start. Het gewicht wordt doorgezet naar de volgende sets.
- **Rusttimer** met piepje, ±15 seconden en instelbare standaardtijd.
- **PR's**: na je workout zie je je nieuwe records.
- **Historie** per workout en per oefening (zwaarste set, geschat 1RM).
- **Offline**: alles staat lokaal op je telefoon. Export en import via ⚙︎ voor backups.

## Op je iPhone zetten

1. Open de app-URL in **Safari**.
2. Tik op Delen → **Zet op beginscherm**.
3. Open hem vanaf je beginscherm. Hij draait dan fullscreen en werkt ook zonder internet.

Elke telefoon heeft zijn eigen data, dus een vriend kan dezelfde link gebruiken.

## Ontwikkelen

```bash
npm install
npm run dev      # lokale dev-server
npm run build    # productie-build in dist/
```

Stack: Vite, React, TypeScript, Dexie (IndexedDB) en vite-plugin-pwa.

## Deployen

Bij een push naar `main` bouwt en publiceert `.github/workflows/deploy.yml` de app op GitHub Pages.
Zet eenmalig in de repo-instellingen: **Settings → Pages → Source: GitHub Actions**.
