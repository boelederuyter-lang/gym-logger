import {
  APPARATUUR_KEUZES,
  DOELEN,
  NIVEAUS,
  WEKEN,
  formatReps,
  formatRust,
  genereerSchema,
  nieuweSeed,
  normaliseerInvoer,
  weekSchema,
} from './generator.js';
import { bewaar, bewaarThema, laad, laadThema } from './storage.js';

const app = document.getElementById('app');
const STANDAARD = { doel: 'spiermassa', niveau: 'beginner', dagen: 3, tijd: 60, apparatuur: 'gym' };

let staat = laad();
let bewerken = false; // formulier tonen terwijl er al een schema is

// ---------------------------------------------------------------------------
// Hulpjes

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let toastTimer;
function toast(tekst) {
  const el = document.getElementById('toast');
  el.textContent = tekst;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('zichtbaar'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('zichtbaar');
    setTimeout(() => (el.hidden = true), 250);
  }, 3200);
}

function opslaan() {
  bewaar(staat);
}

function nieuwSchema(invoer, seed = nieuweSeed()) {
  return {
    versie: 1,
    invoer,
    schema: genereerSchema(invoer, seed),
    blok: 1,
    week: 1,
    gedaan: {},
    gestart: new Date().toISOString(),
  };
}

const datum = (iso) => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });

// Een gedeelde link bevat alleen de invoer en de seed; de ontvanger genereert hetzelfde schema.
function deelLink() {
  const { invoer, schema } = staat;
  const code = [invoer.doel, invoer.niveau, invoer.dagen, invoer.tijd, invoer.apparatuur, schema.seed].join('.');
  const url = new URL(location.href);
  url.hash = `s=${code}`;
  return url.toString();
}

function leesDeelLink() {
  const match = location.hash.match(/^#s=([\w.]+)$/);
  if (!match) return null;
  const [doel, niveau, dagen, tijd, apparatuur, seed] = match[1].split('.');
  const invoer = normaliseerInvoer({ doel, niveau, dagen, tijd, apparatuur });
  const s = Number(seed);
  if (!invoer || !Number.isInteger(s) || s < 0) return null;
  return { invoer, seed: s };
}

// ---------------------------------------------------------------------------
// Formulier

const SPLIT_HINT = {
  2: 'Full body, 2× per week',
  3: 'Full body, 3× per week',
  4: 'Upper/lower: 2× boven, 2× onder',
  5: 'Push, pull, legs + upper en lower',
};

function keuzes(naam, opties, gekozen, kolommen) {
  return `<div class="chips" data-kol="${kolommen}" style="--kol:${kolommen}" role="radiogroup">
    ${opties
      .map(
        ([waarde, label, sub]) => `
      <label class="chip">
        <input type="radio" name="${naam}" value="${waarde}" ${String(waarde) === String(gekozen) ? 'checked' : ''} />
        <span class="chip-body"><span class="chip-label">${label}</span>${sub ? `<span class="chip-sub">${sub}</span>` : ''}</span>
      </label>`,
      )
      .join('')}
  </div>`;
}

function renderFormulier() {
  const i = staat?.invoer ?? STANDAARD;
  app.innerHTML = `
    <section class="intro">
      <h1>${bewerken ? 'Invoer aanpassen' : 'Jouw schema in 20 seconden'}</h1>
      <p>${bewerken ? 'Pas je keuzes aan en genereer een nieuw schema.' : 'Vijf vragen en je hebt een blok van 4 weken met progressie. Alles blijft op je eigen telefoon.'}</p>
    </section>
    <form id="formulier" class="card form" novalidate>
      <fieldset>
        <legend>Wat is je doel?</legend>
        ${keuzes('doel', [
          ['kracht', DOELEN.kracht, '4–6 reps'],
          ['spiermassa', DOELEN.spiermassa, '8–12 reps'],
          ['fitheid', 'Fitheid', '12–15 reps'],
        ], i.doel, 3)}
      </fieldset>
      <fieldset>
        <legend>Wat is je niveau?</legend>
        ${keuzes('niveau', [
          ['beginner', NIVEAUS.beginner, 'Minder dan 1 jaar'],
          ['gevorderd', NIVEAUS.gevorderd, '1 jaar of langer'],
        ], i.niveau, 2)}
      </fieldset>
      <fieldset>
        <legend>Hoeveel dagen per week?</legend>
        ${keuzes('dagen', [[2, '2'], [3, '3'], [4, '4'], [5, '5']], i.dagen, 4)}
        <p class="hint" id="split-hint">${SPLIT_HINT[i.dagen]}</p>
      </fieldset>
      <fieldset>
        <legend>Hoeveel tijd per training?</legend>
        ${keuzes('tijd', [[30, '30', 'min'], [45, '45', 'min'], [60, '60', 'min'], [75, '75+', 'min']], i.tijd, 4)}
      </fieldset>
      <fieldset>
        <legend>Welke apparatuur heb je?</legend>
        ${keuzes('apparatuur', [
          ['gym', APPARATUUR_KEUZES.gym, 'Barbells, machines, kabels'],
          ['dumbbells', APPARATUUR_KEUZES.dumbbells, 'Thuis of in een kleine gym'],
          ['thuis', 'Zonder spullen', 'Lichaamsgewicht, stoel, handdoek'],
        ], i.apparatuur, 1)}
      </fieldset>
      <div class="form-acties">
        <button class="btn btn-primair" type="submit">${bewerken ? 'Nieuw schema maken' : 'Maak mijn schema'}</button>
        ${bewerken ? '<button class="btn btn-stil" type="button" id="annuleer">Annuleren</button>' : ''}
      </div>
    </form>`;

  const form = document.getElementById('formulier');
  form.addEventListener('change', (e) => {
    if (e.target.name === 'dagen') document.getElementById('split-hint').textContent = SPLIT_HINT[e.target.value];
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const invoer = normaliseerInvoer(Object.fromEntries(new FormData(form)));
    if (!invoer) return toast('Maak bij elke vraag een keuze.');
    staat = nieuwSchema(invoer);
    bewerken = false;
    opslaan();
    render();
    window.scrollTo({ top: 0 });
    toast('Je schema staat klaar 💪');
  });
  document.getElementById('annuleer')?.addEventListener('click', () => {
    bewerken = false;
    render();
  });
}

// ---------------------------------------------------------------------------
// Schema

function renderOefening(o, nr) {
  const advies = o.advies ? `<span class="badge${o.advies === 'Deload' ? ' badge-stil' : ''}">${esc(o.advies)}</span>` : '';
  return `
    <li>
      <details class="oefening">
        <summary>
          <span class="nr">${nr}</span>
          <span class="oef-main">
            <span class="oef-naam">${esc(o.naam)}</span>
            <span class="oef-meta"><strong>${o.sets} × ${formatReps(o)}</strong><span class="dot">·</span>rust ${formatRust(o.rust)}</span>
          </span>
          ${advies}
          <svg class="chevron" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </summary>
        <div class="tip">
          <p>${esc(o.tip)}</p>
          <p class="tags"><span>${esc(o.spiergroep)}</span><span>${esc(o.apparatuur)}</span><span>${o.type === 'compound' ? 'Compound' : 'Isolatie'}</span></p>
        </div>
      </details>
    </li>`;
}

function renderDag(dag, index) {
  const gedaan = !!staat.gedaan[`${staat.week}-${index}`];
  return `
    <article class="card dag${gedaan ? ' is-gedaan' : ''}">
      <header class="dag-kop">
        <div>
          <p class="dag-nr">Dag ${index + 1} · ${esc(dag.focus)}</p>
          <h3>${esc(dag.naam)}</h3>
          <p class="dag-info">± ${dag.minuten} min · ${dag.oefeningen.length} oefeningen</p>
        </div>
        <button class="gedaan-knop" type="button" data-dag="${index}" aria-pressed="${gedaan}">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          ${gedaan ? 'Gedaan' : 'Afvinken'}
        </button>
      </header>
      <ol class="oefeningen">${dag.oefeningen.map((o, i) => renderOefening(o, i + 1)).join('')}</ol>
    </article>`;
}

function renderSchema() {
  const { invoer, schema, week, blok } = staat;
  const dagen = weekSchema(schema, week);
  const info = WEKEN[week - 1];
  const weekKlaar = (w) => schema.dagen.every((_, d) => staat.gedaan[`${w}-${d}`]);
  const aantalGedaan = schema.dagen.filter((_, d) => staat.gedaan[`${week}-${d}`]).length;

  app.innerHTML = `
    <section class="samenvatting card">
      <div class="sv-kop">
        <div>
          <p class="eyebrow">Blok ${blok} · gestart ${datum(staat.gestart)}</p>
          <h1>${esc(schema.split)}</h1>
        </div>
        <button class="icon-btn" type="button" id="deel" aria-label="Schema delen">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <p class="pills">
        <span>${DOELEN[invoer.doel]}</span><span>${NIVEAUS[invoer.niveau]}</span><span>${invoer.dagen}× per week</span><span>${invoer.tijd === 75 ? '75+' : invoer.tijd} min</span><span>${APPARATUUR_KEUZES[invoer.apparatuur]}</span>
      </p>
    </section>

    <nav class="weken" role="tablist" aria-label="Week van het blok">
      ${WEKEN.map(
        (w) => `
        <button role="tab" type="button" class="week-tab" data-week="${w.nr}" aria-selected="${w.nr === week}">
          <span class="wk-nr">Week ${w.nr}${weekKlaar(w.nr) ? ' ✓' : ''}</span>
          <span class="wk-label">${w.label}</span>
        </button>`,
      ).join('')}
    </nav>

    <section class="week-uitleg" role="tabpanel">
      <p>${info.uitleg}</p>
      ${invoer.apparatuur !== 'gym' ? '<p class="sub">Oefeningen met lichaamsgewicht te makkelijk? Kies een zwaardere variant of zak langzamer, zodat de laatste reps zwaar zijn.</p>' : ''}
      <p class="voortgang"><span style="--p:${(aantalGedaan / schema.dagen.length) * 100}%"></span>${aantalGedaan} van ${schema.dagen.length} trainingen gedaan</p>
    </section>

    <section class="dagen">${dagen.map(renderDag).join('')}</section>

    <section class="acties">
      ${week === 4 ? '<button class="btn btn-primair" type="button" id="nieuw-blok">Nieuw blok starten</button>' : ''}
      <div class="acties-rij">
        <button class="btn" type="button" id="opnieuw">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Opnieuw genereren
        </button>
        <button class="btn" type="button" id="aanpassen">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Invoer aanpassen
        </button>
      </div>
      ${week !== 4 ? '<button class="btn btn-stil" type="button" id="nieuw-blok">Nieuw blok starten</button>' : ''}
    </section>`;

  app.querySelectorAll('.week-tab').forEach((tab) =>
    tab.addEventListener('click', () => {
      staat.week = Number(tab.dataset.week);
      opslaan();
      render();
    }),
  );
  // Pijltjestoetsen tussen de tabs.
  app.querySelector('.weken').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    staat.week = ((staat.week - 1 + (e.key === 'ArrowRight' ? 1 : 3)) % 4) + 1;
    opslaan();
    render();
    app.querySelector(`.week-tab[data-week="${staat.week}"]`).focus();
  });

  app.querySelectorAll('.gedaan-knop').forEach((knop) =>
    knop.addEventListener('click', () => {
      const k = `${staat.week}-${knop.dataset.dag}`;
      if (staat.gedaan[k]) delete staat.gedaan[k];
      else staat.gedaan[k] = true;
      opslaan();
      render();
      if (weekKlaar(staat.week) && staat.gedaan[k]) toast(staat.week < 4 ? `Week ${staat.week} afgerond! Op naar week ${staat.week + 1}.` : 'Blok afgerond! Start een nieuw blok.');
    }),
  );

  document.getElementById('opnieuw').addEventListener('click', () => {
    if (Object.keys(staat.gedaan).length && !confirm('Nieuw schema met andere oefeningen? Je afgevinkte trainingen worden gewist.')) return;
    staat.schema = genereerSchema(staat.invoer, nieuweSeed());
    staat.gedaan = {};
    opslaan();
    render();
    toast('Nieuwe oefeningen gekozen');
  });

  document.getElementById('aanpassen').addEventListener('click', () => {
    bewerken = true;
    render();
    window.scrollTo({ top: 0 });
  });

  document.getElementById('nieuw-blok').addEventListener('click', () => {
    if (staat.week < 4 && !confirm('Nieuw blok starten? Je gaat terug naar week 1 en je afgevinkte trainingen worden gewist.')) return;
    staat.blok += 1;
    staat.week = 1;
    staat.gedaan = {};
    staat.gestart = new Date().toISOString();
    opslaan();
    render();
    window.scrollTo({ top: 0 });
    toast(`Blok ${staat.blok} gestart. Begin met je gewichten van week 3.`);
  });

  document.getElementById('deel').addEventListener('click', deel);
}

async function deel() {
  const url = deelLink();
  const tekst = 'Dit is mijn trainingsschema. Open de link om het te bekijken, of maak je eigen schema.';
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Trainingsschema', text: tekst, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link gekopieerd. Stuur hem naar je vrienden!');
  } catch {
    prompt('Kopieer deze link:', url);
  }
}

// ---------------------------------------------------------------------------
// Thema

const THEMA_LABEL = { auto: 'Thema: automatisch', licht: 'Thema: licht', donker: 'Thema: donker' };
const THEMA_ICOON = {
  auto: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/></svg>',
  licht: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  donker: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
};

function zetThema(thema) {
  const root = document.documentElement;
  if (thema === 'licht') root.dataset.theme = 'light';
  else if (thema === 'donker') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  const knop = document.getElementById('thema-knop');
  knop.innerHTML = THEMA_ICOON[thema];
  knop.setAttribute('aria-label', THEMA_LABEL[thema]);
  knop.title = THEMA_LABEL[thema];
}

let thema = laadThema();
zetThema(thema);
document.getElementById('thema-knop').addEventListener('click', () => {
  thema = { auto: 'licht', licht: 'donker', donker: 'auto' }[thema] ?? 'auto';
  bewaarThema(thema);
  zetThema(thema);
  toast(THEMA_LABEL[thema]);
});

// ---------------------------------------------------------------------------

function render() {
  if (!staat || bewerken) renderFormulier();
  else renderSchema();
}

// Gedeelde link openen: schema van een vriend overnemen (na bevestiging als je al een eigen schema hebt).
const gedeeld = leesDeelLink();
if (gedeeld) {
  history.replaceState(null, '', location.pathname + location.search);
  const zelfde = staat && staat.schema.seed === gedeeld.seed && JSON.stringify(staat.invoer) === JSON.stringify(gedeeld.invoer);
  if (!zelfde && (!staat || confirm('Je opent een gedeeld schema. Wil je je eigen schema hiermee vervangen?'))) {
    staat = nieuwSchema(gedeeld.invoer, gedeeld.seed);
    opslaan();
    setTimeout(() => toast('Gedeeld schema geladen'), 300);
  }
}

render();
