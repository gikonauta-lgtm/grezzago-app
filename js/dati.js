/**
 * Strato dati: unisce i dati ufficiali (calendario e risultati importati dai
 * comunicati del Comitato Regionale), le modifiche fatte dal pannello di
 * gestione su questo dispositivo e il feed del Comune in un unico stato.
 *
 * Le viste leggono solo da qui.
 */

import { caricaFeedComune } from './rss.js';

const CHIAVI = {
  eventi: 'grezzago:eventi:v1',
  risultati: 'grezzago:risultati:v1',
  tema: 'grezzago:tema:v1',
};

/* ------------------------------------------------------------------ */
/* Archivio locale (tollerante: in incognito può lanciare eccezioni)   */
/* ------------------------------------------------------------------ */

export const archivio = {
  leggi(chiave, fallback = null) {
    try {
      const grezzo = localStorage.getItem(chiave);
      return grezzo ? JSON.parse(grezzo) : fallback;
    } catch { return fallback; }
  },
  scrivi(chiave, valore) {
    try { localStorage.setItem(chiave, JSON.stringify(valore)); return true; }
    catch { return false; }
  },
  rimuovi(chiave) {
    try { localStorage.removeItem(chiave); } catch { /* ignoro */ }
  },
};

export { CHIAVI };

/** L'istante di riferimento dell'app: l'ora vera, sempre. */
export function adesso() {
  return new Date();
}

/* ------------------------------------------------------------------ */
/* Caricamento                                                         */
/* ------------------------------------------------------------------ */

async function json(percorso) {
  const risposta = await fetch(percorso, { cache: 'no-cache' });
  if (!risposta.ok) throw new Error(`${percorso}: HTTP ${risposta.status}`);
  return risposta.json();
}

async function jsonFacoltativo(percorso) {
  try { return await json(percorso); } catch { return null; }
}

/**
 * Carica tutto. Il feed RSS del Comune e la coppa sono facoltativi: se non
 * ci sono l'app funziona lo stesso.
 */
export async function caricaTutto({ conFeed = true } = {}) {
  const [stagione, eventiFile, luoghi, coppa] = await Promise.all([
    json('data/stagione.json'),
    json('data/eventi.json'),
    json('data/luoghi.json'),
    jsonFacoltativo('data/coppa.json'),
  ]);

  // I risultati ufficiali vengono dal file. Quelli inseriti dal pannello di
  // gestione valgono solo su questo dispositivo: servono a provarli prima di
  // pubblicarli, non a sostituire quelli del Comitato per tutti.
  const risultati = { ...stagione.risultati, ...(archivio.leggi(CHIAVI.risultati, {}) || {}) };

  let dalComune = [];
  if (conFeed) {
    try { dalComune = await caricaFeedComune(); }
    catch { dalComune = []; }
  }

  const eventiDiBase = [...eventiFile.eventi, ...partiteInCasa(stagione)];

  return {
    config: stagione.config,
    squadre: stagione.squadre,
    partite: stagione.partite,
    riposi: stagione.riposi,
    impianti: stagione.impianti || {},
    risultati,
    coppa,
    categorie: eventiFile.categorie,
    eventiFile: eventiDiBase,
    eventi: componiEventi(eventiDiBase, dalComune),
    luoghi,
    feedAttivo: dalComune.length > 0,
  };
}

/**
 * Le partite casalinghe sono eventi del paese a tutti gli effetti: la domenica
 * al «Solcia» ci va mezzo Grezzago. Invece di duplicarle a mano nel file degli
 * eventi, le ricavo dal calendario ufficiale — così restano sempre allineate.
 */
function partiteInCasa(stagione) {
  const nostra = stagione.config.squadraDiCasa;
  const nomi = new Map(stagione.squadre.map((s) => [s.id, s.nome]));

  return stagione.partite
    .filter((p) => p.casa === nostra && p.ora)
    .map((p) => {
      const inizio = new Date(`${p.data}T${p.ora}:00`);
      const fine = new Date(inizio.getTime() + 105 * 60 * 1000);
      return {
        id: `partita-${p.id}`,
        titolo: `${nomi.get(p.casa)} — ${nomi.get(p.ospite)}`,
        sottotitolo: `${p.giornata}ª giornata di campionato`,
        categoria: 'sport',
        inizio: inizio.toISOString(),
        fine: fine.toISOString(),
        luogo: 'Campo Sportivo «A. Solcia»',
        indirizzo: 'Via Don Luigi Sturzo, 10 — Grezzago (MI)',
        descrizione: `L'A.S.D. Grezzago 1981 ospita ${nomi.get(p.ospite)} per la ${p.giornata}ª giornata `
          + 'del girone A di Terza Categoria. Ingresso libero.',
        organizzatore: 'A.S.D. Grezzago 1981',
        gratuito: true,
        verificato: true,
        fonte: 'Calendario ufficiale CRL LND — Delegazione di Monza',
        daCalendario: true,
      };
    });
}

/**
 * Aggiunge allo stato gli eventi del feed comunale.
 *
 * Il feed è una risorsa esterna e può metterci qualche secondo: l'app si
 * disegna subito con i dati locali e chiama questa funzione dopo, così non si
 * resta mai davanti a una schermata vuota per colpa di un server altrui.
 *
 * @returns {boolean} true se sono arrivati contenuti nuovi
 */
export async function aggiungiFeed(stato) {
  let dalComune = [];
  try { dalComune = await caricaFeedComune(); }
  catch { return false; }

  if (!dalComune.length) return false;

  stato.eventi = componiEventi(stato.eventiFile, dalComune);
  stato.feedAttivo = true;
  return true;
}

/* ------------------------------------------------------------------ */
/* Eventi: file + admin + feed del Comune                              */
/* ------------------------------------------------------------------ */

function componiEventi(daFile, daComune) {
  const locali = archivio.leggi(CHIAVI.eventi, { aggiunti: [], rimossi: [] })
    || { aggiunti: [], rimossi: [] };
  const rimossi = new Set(locali.rimossi || []);

  const perId = new Map();
  for (const e of [...daFile, ...daComune, ...(locali.aggiunti || [])]) {
    if (rimossi.has(e.id)) continue;
    perId.set(e.id, e); // gli aggiunti in coda sovrascrivono: l'admin ha l'ultima parola
  }

  return togliDoppioni([...perId.values()]).sort(
    (a, b) => new Date(a.inizio) - new Date(b.inizio)
  );
}

/**
 * Lo stesso evento può arrivare due volte: curato a mano nel file e ripreso
 * dal feed del Comune, con un titolo scritto diversamente.
 *
 * Se cadono nello stesso giorno e hanno in comune una parola lunga e
 * caratteristica («camminata», «processione»), tengo la versione curata: è
 * quella con orario, luogo, descrizione e link alle iscrizioni.
 */
function togliDoppioni(eventi) {
  const giorno = (e) => String(e.inizio).slice(0, 10);
  const paroleLunghe = (e) => new Set(
    String(e.titolo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((parola) => parola.length >= 8)
  );

  const curati = eventi.filter((e) => !e.daFeed);

  return eventi.filter((e) => {
    if (!e.daFeed || e.soloAvviso) return true;
    const sue = paroleLunghe(e);
    return !curati.some((c) => giorno(c) === giorno(e)
      && [...paroleLunghe(c)].some((parola) => sue.has(parola)));
  });
}

/** Salva o aggiorna un evento inserito dal pannello admin. */
export function salvaEvento(evento) {
  const locali = archivio.leggi(CHIAVI.eventi, { aggiunti: [], rimossi: [] })
    || { aggiunti: [], rimossi: [] };
  const aggiunti = (locali.aggiunti || []).filter((e) => e.id !== evento.id);
  aggiunti.push(evento);
  const rimossi = (locali.rimossi || []).filter((id) => id !== evento.id);
  return archivio.scrivi(CHIAVI.eventi, { aggiunti, rimossi });
}

/** Nasconde un evento (anche se arriva dal file o dal feed del Comune). */
export function rimuoviEvento(id) {
  const locali = archivio.leggi(CHIAVI.eventi, { aggiunti: [], rimossi: [] })
    || { aggiunti: [], rimossi: [] };
  const aggiunti = (locali.aggiunti || []).filter((e) => e.id !== id);
  const rimossi = [...new Set([...(locali.rimossi || []), id])];
  return archivio.scrivi(CHIAVI.eventi, { aggiunti, rimossi });
}

/** Registra un risultato su questo dispositivo (anteprima prima della pubblicazione). */
export function salvaRisultato(idPartita, golCasa, golOspite) {
  const attuali = archivio.leggi(CHIAVI.risultati, {}) || {};
  attuali[idPartita] = [Number(golCasa), Number(golOspite)];
  return archivio.scrivi(CHIAVI.risultati, attuali);
}

export function eliminaRisultato(idPartita) {
  const attuali = archivio.leggi(CHIAVI.risultati, {}) || {};
  delete attuali[idPartita];
  return archivio.scrivi(CHIAVI.risultati, attuali);
}

/** Esporta ciò che l'admin ha inserito, per portarlo nei file del sito. */
export function esportaModifiche() {
  return {
    generatoIl: new Date().toISOString(),
    eventi: archivio.leggi(CHIAVI.eventi, { aggiunti: [], rimossi: [] }),
    risultati: archivio.leggi(CHIAVI.risultati, {}),
  };
}
