# Gym Logger

Een snelle, overzichtelijke workout-logger voor de iPhone. Het is een PWA: je opent hem in Safari en zet hem op je beginscherm.

## Wat kan hij

- **Programma's**: vaste trainingen met oefeningen, sets, reps en rusttijd per oefening.
- **Losse workouts**: start leeg en voeg onderweg oefeningen toe (meerdere tegelijk).
- **Vorige keer**: per set zie je wat je de vorige keer deed, alvast ingevuld.
- **Afvinken**: tik ✓ en de rusttimer start. Het gewicht schuift door naar de volgende sets.
- **Spraak**: tik op de microfoon en zeg bijvoorbeeld “8 reps 60 kilo”, “3 sets van 8 met 60”, “nog een” of “rust 2 minuten”. Er is ook een handsfree-modus en een tekstveld als je liever typt.
- **PR's**: zwaarste gewicht, beste geschatte 1RM en meeste reps, met een gouden banner en een trofee op de set.
- **Warming-up sets**: automatisch berekend vanuit je werkgewicht.
- **Voortgang**: grafieken per oefening (1RM, zwaarste gewicht, volume of reps) met periodes en een tabel.
- **Oefeningenbibliotheek**: 73 oefeningen met een geanimeerd poppetje, uitvoeringstip, aliassen en je eigen notitie.
- **Offline**: alles staat lokaal op je telefoon. Export en import via ⚙︎ voor backups.

## Op je iPhone zetten

1. Open https://boelederuyter-lang.github.io/gym-logger/ in **Safari**.
2. Tik op Delen → **Zet op beginscherm**.
3. Open hem vanaf je beginscherm. Hij draait dan fullscreen en werkt ook zonder internet (spraakherkenning heeft wel internet nodig).

Elke telefoon heeft zijn eigen data, dus een vriend kan dezelfde link gebruiken.

## Ontwikkelen

```bash
npm install
npm run dev      # lokale dev-server (galerij met alle animaties: /#figuren)
npm test         # unit-tests (parser, PR's, warming-up, grafieken, migratie)
npm run build    # productie-build in dist/
npm run format   # Prettier
```

Stack: Vite, React, TypeScript, Dexie (IndexedDB), vite-plugin-pwa en Vitest.

## Deployen

Bij een push bouwt `.github/workflows/deploy.yml` de app, draait de tests en publiceert hem op GitHub Pages.
