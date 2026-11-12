// Taal van de app: Nederlands of Engels.
//
// Hoe het werkt: overal waar tekst staat, schrijven we beide talen naast elkaar met
// tr('Nederlands', 'English'). Zo staat een vertaling altijd vlak bij de plek waar hij gebruikt
// wordt, en vergeet je er niet snel een.
//
// De taal volgt je telefoon (Nederlands als je telefoon op Nederlands staat, anders Engels),
// tenzij je in Instellingen zelf een taal kiest. Wisselen herlaadt de app, zodat alles in één
// keer in de nieuwe taal staat.

export type Lang = 'nl' | 'en';
export type LangChoice = Lang | 'auto';

const KEY = 'gym-logger-lang';

/** De taal van het apparaat; zonder browser (tests) Nederlands. */
export function deviceLang(): Lang {
  if (typeof navigator === 'undefined' || !navigator.language) return 'nl';
  return navigator.language.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

export function getLangChoice(): LangChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'nl' || v === 'en' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

let current: Lang = (() => {
  const c = getLangChoice();
  return c === 'auto' ? deviceLang() : c;
})();

export function lang(): Lang {
  return current;
}

/** Kies een taal ('auto' = volg de telefoon). Herlaadt de app als de taal verandert. */
export function setLangChoice(choice: LangChoice, reload = true) {
  try {
    if (choice === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // storage unavailable
  }
  const next = choice === 'auto' ? deviceLang() : choice;
  if (next === current) return;
  current = next;
  if (reload && typeof location !== 'undefined') location.reload();
}

/** Alleen voor tests: wissel de taal zonder op te slaan of te herladen. */
export function setLangForTest(l: Lang) {
  current = l;
}

/** Kies de tekst in de huidige taal. */
export function tr(nl: string, en: string): string {
  return current === 'en' ? en : nl;
}

/** Locale voor datums en getallen. */
export function locale(): string {
  return current === 'en' ? 'en-GB' : 'nl-NL';
}

/** Decimaalteken: komma in het Nederlands, punt in het Engels. */
export function decimal(n: number | string): string {
  const s = String(n);
  return current === 'en' ? s : s.replace('.', ',');
}
