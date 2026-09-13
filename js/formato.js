/** Formattazione in italiano: date, orari, numeri, testo. */

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu',
  'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const GIORNI_BREVI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

export const mesi = MESI;

/** Accetta Date | ISO string e restituisce sempre una Date nel fuso locale. */
export function aData(v) {
  if (v instanceof Date) return v;
  // Le date "nude" (2026-10-04) verrebbero lette come UTC: le ancoro a mezzogiorno locale.
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T12:00:00`);
  return new Date(v);
}

export const giorno = (v) => aData(v).getDate();
export const giornoSettimana = (v) => GIORNI[aData(v).getDay()];
export const giornoSettimanaBreve = (v) => GIORNI_BREVI[aData(v).getDay()];
export const meseBreve = (v) => MESI_BREVI[aData(v).getMonth()];
export const mese = (v) => MESI[aData(v).getMonth()];

/** «domenica 4 ottobre» — con anno solo se diverso da quello di riferimento. */
export function dataLunga(v, riferimento = new Date()) {
  const d = aData(v);
  const anno = d.getFullYear() !== aData(riferimento).getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}${anno}`;
}

/** «4 ott 2026» */
export function dataBreve(v) {
  const d = aData(v);
  return `${d.getDate()} ${MESI_BREVI[d.getMonth()]} ${d.getFullYear()}`;
}

/** «15:30» */
export function ora(v) {
  const d = aData(v);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** «ottobre 2026» — chiave di raggruppamento leggibile. */
export function meseAnno(v) {
  const d = aData(v);
  return `${MESI[d.getMonth()]} ${d.getFullYear()}`;
}

/** Distanza in linguaggio naturale: «oggi», «domani», «tra 5 giorni», «3 giorni fa». */
export function quando(v, adesso = new Date()) {
  const a = aData(v); const b = aData(adesso);
  const giorniDi = (x) => Math.floor(new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() / 86400000);
  const delta = giorniDi(a) - giorniDi(b);

  if (delta === 0) return 'oggi';
  if (delta === 1) return 'domani';
  if (delta === -1) return 'ieri';
  if (delta === 2) return 'dopodomani';
  if (delta > 1 && delta < 7) return `${giornoSettimana(a)}`;
  if (delta > 0) return `tra ${delta} giorni`;
  return `${Math.abs(delta)} giorni fa`;
}

/** Differenza reti con segno esplicito: +7, 0, −3 (meno tipografico). */
export function conSegno(n) {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '0';
}

/** «1ª», «2ª», «11ª» */
export const ordinaleF = (n) => `${n}ª`;

/** Scompone una durata in giorni/ore/minuti per il conto alla rovescia. */
export function scomponi(ms) {
  const tot = Math.max(0, Math.floor(ms / 1000));
  return {
    giorni: Math.floor(tot / 86400),
    ore: Math.floor((tot % 86400) / 3600),
    minuti: Math.floor((tot % 3600) / 60),
    secondi: tot % 60,
  };
}

/** Protegge da injection quando si interpola testo nei template. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Colore deterministico per lo stemma di una squadra senza logo. */
export function coloreSquadra(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsl(${h} 42% 42%)`;
}

/** Iniziali per lo stemma: «Virtus Acli Trecella» → «VT». */
export function iniziali(nome) {
  const parole = nome.replace(/[«».]/g, '').split(/\s+/).filter(Boolean);
  if (parole.length === 1) return parole[0].slice(0, 2).toUpperCase();
  return (parole[0][0] + parole[parole.length - 1][0]).toUpperCase();
}
