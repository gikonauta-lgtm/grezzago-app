/**
 * Motore della classifica.
 *
 * Calcola tutto a partire dai risultati: niente tabella precompilata, così
 * quando arrivano i dati veri (pannello admin o fonte ufficiale) basta
 * aggiungere un risultato e classifica, forma, andamento e statistiche si
 * aggiornano da sole.
 */

const DURATA_TEMPO = 45;      // minuti per tempo
const INTERVALLO = 15;        // minuti di intervallo
const DURATA_TOTALE = DURATA_TEMPO * 2 + INTERVALLO; // 105 minuti dal fischio d'inizio

/* ------------------------------------------------------------------ */
/* Stato di una partita                                               */
/* ------------------------------------------------------------------ */

/** Momento del fischio d'inizio come Date locale. */
export function calcioDInizio(partita) {
  return new Date(`${partita.data}T${partita.ora || '15:30'}:00`);
}

/**
 * Stato della partita rispetto a un istante.
 * @returns {{stato:'programmata'|'in-corso'|'finita'|'attesa-risultato', minuto?:number, intervallo?:boolean}}
 */
export function statoPartita(partita, risultato, adesso) {
  const inizio = calcioDInizio(partita);
  const trascorsi = (adesso - inizio) / 60000;

  if (trascorsi < 0) return { stato: 'programmata' };

  if (trascorsi >= DURATA_TOTALE) {
    return risultato ? { stato: 'finita' } : { stato: 'attesa-risultato' };
  }

  const tempo = trascorsi < DURATA_TEMPO
    ? { minuto: Math.max(1, Math.floor(trascorsi)) }
    : trascorsi < DURATA_TEMPO + INTERVALLO
      ? { minuto: DURATA_TEMPO, intervallo: true }
      : { minuto: Math.floor(DURATA_TEMPO + (trascorsi - DURATA_TEMPO - INTERVALLO)) };

  // Si sta giocando. Il minuto lo sappiamo dall'orologio anche senza dati; il
  // punteggio no, e allora si dice «in corso» invece di inventarlo. Sono due
  // situazioni diverse da «finita ma il risultato non è ancora pubblicato».
  return risultato
    ? { stato: 'in-corso', ...tempo }
    : { stato: 'attesa-risultato', inCampo: true, ...tempo };
}

/* ------------------------------------------------------------------ */
/* Minuti delle marcature                                             */
/* ------------------------------------------------------------------ */

function semeDa(testo) {
  let h = 2166136261;
  for (let i = 0; i < testo.length; i++) {
    h ^= testo.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Assegna un minuto plausibile a ogni gol, in modo deterministico: la stessa
 * partita produce sempre gli stessi minuti, così il punteggio "live" cresce
 * in modo coerente a ogni aggiornamento invece di ballare.
 */
export function minutiGol(idPartita, golCasa, golOspite) {
  let stato = semeDa(idPartita);
  const prossimo = () => {
    stato = (Math.imul(stato ^ (stato >>> 15), stato | 1) + 0x6d2b79f5) >>> 0;
    return stato / 4294967296;
  };
  const genera = (quanti, etichetta) =>
    Array.from({ length: quanti }, () => Math.max(1, Math.min(90, Math.floor(prossimo() * 90) + 1)))
      .sort((a, b) => a - b)
      .map((minuto) => ({ minuto, lato: etichetta }));

  return [...genera(golCasa, 'casa'), ...genera(golOspite, 'ospite')]
    .sort((a, b) => a.minuto - b.minuto);
}

/** Punteggio parziale di una partita in corso, in base al minuto raggiunto. */
export function punteggioAlMinuto(idPartita, risultato, minuto) {
  const gol = minutiGol(idPartita, risultato[0], risultato[1]);
  let casa = 0; let ospite = 0;
  for (const g of gol) {
    if (g.minuto > minuto) break;
    if (g.lato === 'casa') casa++; else ospite++;
  }
  return [casa, ospite];
}

/* ------------------------------------------------------------------ */
/* Partite risolte                                                     */
/* ------------------------------------------------------------------ */

/**
 * Normalizza le partite: a ognuna attacca stato, punteggio visibile e
 * se conta per la classifica.
 */
export function risolviPartite({ partite, risultati, adesso }) {
  return partite.map((p) => {
    const finale = risultati[p.id] || null;
    const s = statoPartita(p, finale, adesso);

    let punteggio = null;
    let contaPerClassifica = false;

    if (s.stato === 'finita') {
      punteggio = finale;
      contaPerClassifica = true;
    } else if (s.stato === 'in-corso') {
      punteggio = punteggioAlMinuto(p.id, finale, s.minuto);
      // Una partita in corso non muove la classifica ufficiale.
    }

    return { ...p, ...s, punteggio, finale, contaPerClassifica };
  });
}

/* ------------------------------------------------------------------ */
/* Classifica                                                          */
/* ------------------------------------------------------------------ */

function rigaVuota(squadra) {
  return {
    squadra,
    id: squadra.id,
    g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, pt: 0,
    casa: { g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, pt: 0 },
    trasferta: { g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, pt: 0 },
    forma: [],          // ultimi risultati, dal più vecchio al più recente
    andamento: [],      // punti cumulati giornata per giornata
    ultimaGiornata: 0,
  };
}

function registra(riga, sotto, fatti, subiti, punti) {
  const applica = (t) => {
    t.g++; t.gf += fatti; t.gs += subiti; t.pt += punti;
    if (punti === 3) t.v++; else if (punti === 1) t.n++; else t.p++;
  };
  applica(riga);
  applica(riga[sotto]);
}

/**
 * @returns righe ordinate, con posizione e zone assegnate.
 */
export function calcolaClassifica({ squadre, partite, risultati, config, adesso }) {
  const risolte = risolviPartite({ partite, risultati, adesso });
  const righe = new Map(squadre.map((s) => [s.id, rigaVuota(s)]));

  const puntiV = config?.puntiVittoria ?? 3;
  const puntiN = config?.puntiPareggio ?? 1;

  const giocate = risolte
    .filter((p) => p.contaPerClassifica)
    .sort((a, b) => a.giornata - b.giornata);

  for (const p of giocate) {
    const [gc, go] = p.punteggio;
    const casa = righe.get(p.casa);
    const ospite = righe.get(p.ospite);
    if (!casa || !ospite) continue;

    const ptCasa = gc > go ? puntiV : gc === go ? puntiN : 0;
    const ptOspite = go > gc ? puntiV : gc === go ? puntiN : 0;

    registra(casa, 'casa', gc, go, ptCasa);
    registra(ospite, 'trasferta', go, gc, ptOspite);

    casa.forma.push(gc > go ? 'V' : gc === go ? 'N' : 'P');
    ospite.forma.push(go > gc ? 'V' : gc === go ? 'N' : 'P');

    casa.andamento.push({ giornata: p.giornata, punti: casa.pt });
    ospite.andamento.push({ giornata: p.giornata, punti: ospite.pt });

    casa.ultimaGiornata = Math.max(casa.ultimaGiornata, p.giornata);
    ospite.ultimaGiornata = Math.max(ospite.ultimaGiornata, p.giornata);
  }

  for (const riga of righe.values()) {
    riga.dr = riga.gf - riga.gs;
    riga.forma = riga.forma.slice(-5);
  }

  const ordinate = ordina([...righe.values()], giocate);

  const zone = config?.zone ?? { promozione: 1, playoff: 5 };
  ordinate.forEach((riga, i) => {
    riga.posizione = i + 1;
    if (riga.posizione <= zone.promozione) riga.zona = 'promozione';
    else if (riga.posizione <= zone.playoff) riga.zona = 'playoff';
    else riga.zona = null;
  });

  return ordinate;
}

/**
 * Ordinamento LND: punti, poi classifica avulsa fra le squadre a pari punti
 * (punti negli scontri diretti, differenza reti negli scontri diretti), poi
 * differenza reti generale, reti fatte e infine ordine alfabetico.
 */
function ordina(righe, giocate) {
  const gruppi = new Map();
  for (const r of righe) {
    if (!gruppi.has(r.pt)) gruppi.set(r.pt, []);
    gruppi.get(r.pt).push(r);
  }

  const risultato = [];
  for (const pt of [...gruppi.keys()].sort((a, b) => b - a)) {
    const gruppo = gruppi.get(pt);
    if (gruppo.length === 1) { risultato.push(gruppo[0]); continue; }

    // Regolamento CRL 2026/27 (art. 51 c. 6 NOIF): punti negli scontri
    // diretti, differenza reti negli scontri diretti, differenza reti
    // generale, reti fatte in tutto il campionato, sorteggio. I gol fatti
    // negli scontri diretti NON sono un criterio. Il sorteggio lo fa la
    // Delegazione: fino ad allora l'ordine alfabetico è solo provvisorio.
    const avulsa = miniClassifica(gruppo.map((r) => r.id), giocate);
    gruppo.sort((a, b) => {
      const ma = avulsa.get(a.id); const mb = avulsa.get(b.id);
      return (mb.pt - ma.pt)
        || (mb.dr - ma.dr)
        || (b.dr - a.dr)
        || (b.gf - a.gf)
        || a.squadra.nome.localeCompare(b.squadra.nome, 'it');
    });
    risultato.push(...gruppo);
  }
  return risultato;
}

/** Mini-classifica dei soli scontri diretti fra le squadre indicate. */
function miniClassifica(ids, giocate) {
  const insieme = new Set(ids);
  const tab = new Map(ids.map((id) => [id, { pt: 0, gf: 0, gs: 0, dr: 0 }]));

  for (const p of giocate) {
    if (!insieme.has(p.casa) || !insieme.has(p.ospite)) continue;
    const [gc, go] = p.punteggio;
    const casa = tab.get(p.casa); const ospite = tab.get(p.ospite);
    casa.gf += gc; casa.gs += go;
    ospite.gf += go; ospite.gs += gc;
    if (gc > go) casa.pt += 3;
    else if (gc < go) ospite.pt += 3;
    else { casa.pt++; ospite.pt++; }
  }
  for (const t of tab.values()) t.dr = t.gf - t.gs;
  return tab;
}

/* ------------------------------------------------------------------ */
/* Interrogazioni utili alle viste                                     */
/* ------------------------------------------------------------------ */

export function partiteDi(risolte, idSquadra) {
  return risolte
    .filter((p) => p.casa === idSquadra || p.ospite === idSquadra)
    .sort((a, b) => a.giornata - b.giornata);
}

/** La prossima partita della squadra: quella in corso se c'è, altrimenti la prima futura. */
export function prossimaPartita(risolte, idSquadra) {
  const mie = partiteDi(risolte, idSquadra);
  return mie.find((p) => p.stato === 'in-corso')
    ?? mie.find((p) => p.stato === 'programmata')
    ?? null;
}

export function ultimaGiocata(risolte, idSquadra) {
  const mie = partiteDi(risolte, idSquadra).filter((p) => p.stato === 'finita');
  return mie.length ? mie[mie.length - 1] : null;
}

/** Giornata da mostrare per prima: quella in corso, o la prossima in programma. */
export function giornataCorrente(risolte) {
  const inCorso = risolte.find((p) => p.stato === 'in-corso');
  if (inCorso) return inCorso.giornata;
  const futura = risolte
    .filter((p) => p.stato === 'programmata')
    .sort((a, b) => a.giornata - b.giornata)[0];
  if (futura) return futura.giornata;
  return Math.max(1, ...risolte.map((p) => p.giornata));
}

/** Statistiche di squadra per la scheda dedicata. */
export function statistiche(righe, idSquadra) {
  const riga = righe.find((r) => r.id === idSquadra);
  if (!riga || riga.g === 0) return null;

  const perAttacco = [...righe].sort((a, b) => b.gf - a.gf);
  const perDifesa = [...righe].sort((a, b) => a.gs - b.gs);

  let migliorStriscia = 0; let corrente = 0;
  for (const e of riga.forma) {
    if (e === 'V') { corrente++; migliorStriscia = Math.max(migliorStriscia, corrente); }
    else corrente = 0;
  }

  return {
    riga,
    mediaGolFatti: riga.gf / riga.g,
    mediaGolSubiti: riga.gs / riga.g,
    percentualeVittorie: (riga.v / riga.g) * 100,
    rangoAttacco: perAttacco.findIndex((r) => r.id === idSquadra) + 1,
    rangoDifesa: perDifesa.findIndex((r) => r.id === idSquadra) + 1,
    striscia: migliorStriscia,
    puntiPersiDaVincente: (righe[0]?.pt ?? 0) - riga.pt,
  };
}
