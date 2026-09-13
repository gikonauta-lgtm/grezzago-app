/**
 * Feed del Comune di Grezzago.
 *
 * Il sito istituzionale (HalleyWeb) pubblica un RSS pubblico, ma non manda
 * gli header CORS: un sito statico non può leggerlo direttamente dal browser.
 * Per questo passiamo da una piccola funzione serverless (`/api/rss`) che fa
 * da ponte. Se non è configurata, l'app continua a funzionare con i soli
 * eventi curati a mano.
 */

const PONTE = '/api/rss';

const MESI = {
  gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
  luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11,
};

/** Parole che segnalano un evento vero e non un avviso amministrativo. */
const SEGNALI = {
  festa: ['festa', 'sagra', 'patronale', 'carnevale', 'natale', 'befana', 'palio', 'processione'],
  sport: ['camminata', 'torneo', 'corsa', 'gara', 'partita', 'marcia', 'podistica', 'ciclistica', 'sportiv'],
  cultura: ['concerto', 'spettacolo', 'mostra', 'teatro', 'presentazione del libro', 'conferenza',
    'rassegna', 'cinema', 'commemorazione', 'inaugurazione'],
  bambini: ['bambini', 'ragazzi', 'centro estivo', 'laboratorio', 'open day', 'scuola dell\'infanzia',
    'letture', 'giocando'],
  mercato: ['mercatino', 'mercato', 'fiera', 'bancarelle'],
};

/** Un avviso amministrativo non è un evento, per quanto contenga una data. */
const RUMORE = ['ordinanza', 'avviso di', 'bando', 'graduatoria', 'isee', 'tari', 'imu',
  'allerta', 'determina', 'delibera', 'concorso pubblico', 'albo pretorio',
  'carta d\'identità', 'carta didentità', 'refezione scolastica', 'libri di testo'];

/* ------------------------------------------------------------------ */

/** Legge una data italiana in chiaro: «domenica 25 ottobre 2026», «25/10/2026». */
export function estraiData(testo, annoPredefinito) {
  const t = testo.toLowerCase().replace(/\s+/g, ' ');

  const esteso = t.match(/\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b(?:\s+(\d{4}))?/);
  if (esteso) {
    const [, gg, nomeMese, anno] = esteso;
    return new Date(Number(anno || annoPredefinito), MESI[nomeMese], Number(gg), 0, 0, 0);
  }

  const numerico = t.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
  if (numerico) {
    const [, gg, mm, anno] = numerico;
    return new Date(Number(anno), Number(mm) - 1, Number(gg), 0, 0, 0);
  }

  return null;
}

/** Cerca un orario: «ore 9:00», «alle 21», «ore 15.30». */
function estraiOra(testo) {
  const m = testo.toLowerCase().match(/\b(?:ore|alle)\s+(\d{1,2})[:.]?(\d{2})?\b/);
  if (!m) return null;
  return { ore: Number(m[1]), minuti: Number(m[2] || 0) };
}

function categorizza(testo) {
  const t = testo.toLowerCase();
  for (const [categoria, parole] of Object.entries(SEGNALI)) {
    if (parole.some((p) => t.includes(p))) return categoria;
  }
  return null;
}

function sembraRumore(testo) {
  const t = testo.toLowerCase();
  return RUMORE.some((p) => t.includes(p));
}

function ripulisci(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */

/**
 * Trasforma una voce RSS in un evento dell'app, oppure in un avviso.
 * @returns {object|null} null se la voce non è utilizzabile
 */
export function daVoceRss(voce) {
  const titolo = ripulisci(voce.titolo);
  const descrizione = ripulisci(voce.descrizione);
  if (!titolo) return null;

  const pubblicato = voce.data ? new Date(voce.data) : new Date();
  const testo = `${titolo} ${descrizione}`;

  const categoria = categorizza(testo);
  const rumore = sembraRumore(testo);
  const dataEvento = estraiData(testo, pubblicato.getFullYear());

  // È un evento se ha una data futura riconoscibile e non sa di burocrazia.
  const eVeroEvento = Boolean(dataEvento) && Boolean(categoria) && !rumore;

  const inizio = dataEvento || pubblicato;
  const orario = estraiOra(testo);
  if (orario && dataEvento) inizio.setHours(orario.ore, orario.minuti, 0, 0);

  return {
    id: `comune-${voce.id || titolo.slice(0, 40).replace(/\W+/g, '-').toLowerCase()}`,
    titolo,
    descrizione: descrizione || 'Comunicazione dal sito del Comune di Grezzago.',
    categoria: eVeroEvento ? categoria : 'comune',
    inizio: inizio.toISOString(),
    luogo: eVeroEvento ? 'Grezzago' : null,
    link: voce.link || null,
    linkEtichetta: 'Leggi sul sito del Comune',
    organizzatore: 'Comune di Grezzago',
    fonte: 'Comune di Grezzago',
    verificato: true,
    daFeed: true,
    soloAvviso: !eVeroEvento,
    pubblicato: pubblicato.toISOString(),
  };
}

/* ------------------------------------------------------------------ */

/** Scarica e converte il feed. In caso di problemi restituisce lista vuota. */
export async function caricaFeedComune() {
  let xml;
  try {
    const risposta = await fetch(PONTE, { cache: 'no-cache' });
    if (!risposta.ok) return [];
    xml = await risposta.text();
  } catch {
    return []; // ponte non configurato: si va avanti senza feed
  }

  let documento;
  try {
    documento = new DOMParser().parseFromString(xml, 'application/xml');
  } catch { return []; }

  if (documento.querySelector('parsererror')) return [];

  const voci = [...documento.querySelectorAll('item')].map((item) => ({
    titolo: item.querySelector('title')?.textContent || '',
    descrizione: item.querySelector('description')?.textContent || '',
    link: item.querySelector('link')?.textContent || '',
    data: item.querySelector('pubDate')?.textContent || '',
    id: item.querySelector('guid')?.textContent?.match(/id=(\d+)/)?.[1] || '',
  }));

  return voci.map(daVoceRss).filter(Boolean);
}
