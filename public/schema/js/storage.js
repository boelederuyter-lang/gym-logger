// Alles wordt lokaal in de browser bewaard (localStorage), dus ieder z'n eigen schema
// op z'n eigen telefoon. Elke toegang zit in try/catch: in een privévenster of met
// geblokkeerde opslag werkt de app gewoon, alleen zonder onthouden.

const KEY = 'trainingsschema.v1';
const THEMA_KEY = 'trainingsschema.thema';

export function laad() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && data.versie === 1 && data.schema && data.invoer) return data;
  } catch {
    /* leeg of onleesbaar: begin opnieuw */
  }
  return null;
}

export function bewaar(staat) {
  try {
    localStorage.setItem(KEY, JSON.stringify(staat));
  } catch {
    /* opslag niet beschikbaar */
  }
}

export function laadThema() {
  try {
    return localStorage.getItem(THEMA_KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

export function bewaarThema(thema) {
  try {
    localStorage.setItem(THEMA_KEY, thema);
  } catch {
    /* opslag niet beschikbaar */
  }
}
