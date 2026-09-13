/**
 * Importa il calendario ufficiale del girone dal PDF pubblicato dalla
 * Delegazione Provinciale di Monza del CRL LND.
 *
 * Uso:  node scripts/importa-calendario.mjs <calendario.pdf|.txt> [--girone=A] [--prova]
 *
 *   --prova   legge, controlla e stampa il riepilogo senza scrivere nulla
 *
 * Il PDF contiene tutti i gironi di Terza Categoria della delegazione: per
 * ognuno le giornate di andata (con la data del ritorno accanto) e la
 * tabella degli impianti. Il ritorno non è stampato: per regolamento ripete
 * gli accoppiamenti dell'andata a campi invertiti.
 *
 * Prima di scrivere controlla che il calendario sia un girone all'italiana
 * valido. Se qualcosa non torna si ferma: meglio nessun calendario che un
 * calendario sbagliato.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { estraiTesto, righe as inRighe } from './pdf-testo.mjs';
import { SQUADRE, risolviSquadra, provaARisolvere, squadrePerIlSito } from './squadre.mjs';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE_STAGIONE = join(RADICE, 'data', 'stagione.json');

const RE_GIORNATA = /^GIORNATA\s+(\d{1,2})$/i;
const RE_DATE = /^A\.\s*(\d{2})\/(\d{2})\/(\d{4})\s+R\.\s*(\d{2})\/(\d{2})\/(\d{4})$/i;
const RE_TABELLA_IMPIANTI = /^Societ[aà]\s+N\.\s+Campo/i;

// Una riga della tabella impianti, dopo l'estrazione, è tutta su una linea:
//   AURELIANA 22 C.S.COMUNALE-CAMPO A (E.A) CASSINA DE'PECCHI VIA GIUSEPPE MAZZINI SNC O.F. Domenica
// Il nome della società può contenere numeri («CITTA DI BUSNAGO 2026»,
// «ORATORIO SUISIO 2000 ASD»): il codice dell'impianto è il numero seguito
// dall'inizio del nome di un campo, non il primo numero che capita.
const RE_IMPIANTO = new RegExp(
  '^(.+?)\\s(\\d+)\\s'
  + '((?:C\\.\\s?S|PARROCCHIA|COMUNALE|CENTRO|CAMPO|STADIO|ORATORIO)\\S*.*?)\\s'
  + '((?:VIA|VIALE|PIAZZA|P\\.ZZA|LARGO|CORSO|STRADA|LOC\\.?|LOCALIT)\\b.*?)\\s'
  + '(O\\.F\\.|\\d{1,2}[:.]\\d{2})\\s(\\S+)$',
  'i'
);

const iso = (gg, mm, aaaa) => `${aaaa}-${mm}-${gg}`;

/* ------------------------------------------------------------------ */
/* Lettura                                                             */
/* ------------------------------------------------------------------ */

/** Divide il documento nei gironi: giornate seguite dalla tabella impianti. */
function dividiGironi(tutte) {
  const gironi = [];
  let inizio = 0;

  tutte.forEach((riga, i) => {
    if (!RE_TABELLA_IMPIANTI.test(riga)) return;

    const etichetta = tutte[i - 1]?.match(/^GIRONE\s+([A-Z])$/i)?.[1]?.toUpperCase() ?? null;
    let fine = i + 1;
    while (fine < tutte.length && !RE_GIORNATA.test(tutte[fine])) fine++;

    gironi.push({
      girone: etichetta,
      righeGiornate: tutte.slice(inizio, i),
      righeImpianti: tutte.slice(i + 1, fine),
    });
    inizio = fine;
  });

  return gironi;
}

/**
 * Legge le giornate di andata.
 *
 * Nel PDF le giornate sono disposte in colonne affiancate. Quando PDFKit
 * incontra più intestazioni di fila, le righe delle partite che seguono
 * arrivano intrecciate: la prima riga di ciascuna giornata, poi la seconda
 * di ciascuna, e così via. Con un'intestazione sola, le righe sono tutte sue.
 * La stessa regola copre entrambi i casi.
 */
function leggiGiornate(righe, righePerGiornata) {
  const giornate = [];
  let i = 0;

  while (i < righe.length) {
    if (!RE_GIORNATA.test(righe[i])) { i++; continue; } // scritte grafiche fra i blocchi

    const gruppo = [];
    while (i < righe.length && RE_GIORNATA.test(righe[i])) {
      const numero = Number(righe[i].match(RE_GIORNATA)[1]);
      const date = righe[i + 1]?.match(RE_DATE);
      if (!date) {
        throw new Error(`Giornata ${numero}: date illeggibili («${righe[i + 1] ?? 'fine del documento'}»)`);
      }
      gruppo.push({
        numero,
        andata: iso(date[1], date[2], date[3]),
        ritorno: iso(date[4], date[5], date[6]),
        righe: [],
      });
      i += 2;
    }

    for (let r = 0; r < gruppo.length * righePerGiornata; r++) {
      const [sinistra, trattino, destra] = righe.slice(i, i + 3);
      if (trattino !== '-' || !sinistra || !destra) {
        throw new Error(
          `Riga di partita malformata vicino a «${sinistra}» `
          + `(giornate ${gruppo.map((g) => g.numero).join(', ')})`
        );
      }
      gruppo[r % gruppo.length].righe.push([sinistra, destra]);
      i += 3;
    }

    giornate.push(...gruppo);
  }

  return giornate.sort((a, b) => a.numero - b.numero);
}

/** Legge la tabella degli impianti: campo, indirizzo e orario di ogni squadra. */
function leggiImpianti(righe) {
  const impianti = new Map();
  const note = [];

  for (const riga of righe) {
    if (/^La Societ/i.test(riga)) { note.push(riga); continue; }

    const m = riga.match(RE_IMPIANTO);
    if (!m) throw new Error(`Riga della tabella impianti illeggibile: «${riga}»`);

    const [, societa, codice, campo, indirizzo, orario, giorno] = m;
    const id = risolviSquadra(societa);
    if (impianti.has(id)) throw new Error(`Due impianti per la stessa squadra: «${societa}»`);

    impianti.set(id, {
      codice: Number(codice),
      campo: campo.trim(),
      indirizzo: indirizzo.trim(),
      // «O.F.» = orario federale: varia nel corso della stagione e lo fissa il
      // Comitato. Lo lascio vuoto invece di indovinarlo.
      ora: /^O\.F\.$/i.test(orario) ? null : orario.replace('.', ':').padStart(5, '0'),
      giorno: giorno.toLowerCase(),
    });
  }

  // Le note in calce («La Società X potrà giocare indistintamente...») vanno
  // con l'impianto della squadra a cui si riferiscono.
  for (const nota of note) {
    const id = provaARisolvere(nota);
    if (id && impianti.has(id)) impianti.get(id).nota = nota;
  }

  return impianti;
}

/* ------------------------------------------------------------------ */
/* Costruzione                                                         */
/* ------------------------------------------------------------------ */

/**
 * Orario ufficiale della domenica per la Terza Categoria, stagione 2026/27.
 * Fonte: Regolamento Campionati Dilettantistici CRL 2026/2027, art. 15.2.
 * Vale per le squadre che nella tabella impianti hanno «O.F.».
 *
 * È specifico della stagione: per importare un calendario di un'altra
 * stagione va aggiornato dal nuovo regolamento, altrimenti le partite
 * restano senza orario (e il riepilogo lo segnala).
 */
const ORARI_FEDERALI = {
  stagione: { dal: '2026-08-30', al: '2027-06-30' },
  fasce: [
    { dal: '2027-03-28', ora: '15:30' },
    { dal: '2026-10-25', ora: '14:30' },
    { dal: '2026-08-30', ora: '15:30' },
  ],
};

function orarioFederale(data) {
  const { stagione, fasce } = ORARI_FEDERALI;
  if (data < stagione.dal || data > stagione.al) return null;
  return fasce.find((f) => data >= f.dal)?.ora ?? null;
}

function costruisciPartita(giornata, data, casa, ospite, impianti) {
  const impianto = impianti.get(casa) ?? null;
  return {
    id: `g${giornata}-${casa}-${ospite}`,
    giornata,
    data,
    ora: impianto?.ora ?? orarioFederale(data),
    orarioFederale: !impianto?.ora,
    casa,
    ospite,
    impianto: impianto
      ? { campo: impianto.campo, indirizzo: impianto.indirizzo, codice: impianto.codice }
      : null,
  };
}

function costruisciStagione(giornate, impianti) {
  const n = giornate.length;
  const partite = [];
  const riposi = {};

  for (const g of giornate) {
    for (const [sinistra, destra] of g.righe) {
      if (/^RIPOSO$/i.test(sinistra)) {
        const chi = risolviSquadra(destra);
        riposi[g.numero] = chi;
        riposi[g.numero + n] = chi;
        continue;
      }
      const casa = risolviSquadra(sinistra);
      const ospite = risolviSquadra(destra);
      partite.push(costruisciPartita(g.numero, g.andata, casa, ospite, impianti));
      partite.push(costruisciPartita(g.numero + n, g.ritorno, ospite, casa, impianti));
    }
  }

  partite.sort((a, b) => a.giornata - b.giornata);
  return { partite, riposi };
}

/* ------------------------------------------------------------------ */
/* Controlli                                                           */
/* ------------------------------------------------------------------ */

function controlla(giornate, partite, riposi, impianti) {
  const errori = [];
  const n = SQUADRE.length;
  const tutti = new Set(SQUADRE.map((s) => s.id));

  if (giornate.length !== n) {
    errori.push(`attese ${n} giornate di andata, trovate ${giornate.length}`);
  }
  giornate.forEach((g, i) => {
    if (g.numero !== i + 1) errori.push(`numerazione delle giornate non continua alla ${g.numero}ª`);
  });

  for (let g = 1; g <= n * 2; g++) {
    const presenti = partite.filter((p) => p.giornata === g).flatMap((p) => [p.casa, p.ospite]);
    if (riposi[g]) presenti.push(riposi[g]);
    const unici = new Set(presenti);
    if (presenti.length !== n || unici.size !== n || [...unici].some((id) => !tutti.has(id))) {
      errori.push(`${g}ª giornata: non tutte le squadre compaiono esattamente una volta`);
    }
  }

  const coppie = new Set();
  for (const p of partite.filter((x) => x.giornata <= n)) {
    const coppia = [p.casa, p.ospite].sort().join('|');
    if (coppie.has(coppia)) errori.push(`${p.casa}–${p.ospite} compare due volte nell'andata`);
    coppie.add(coppia);
  }
  if (coppie.size !== (n * (n - 1)) / 2) {
    errori.push(`attesi ${(n * (n - 1)) / 2} incontri nell'andata, trovati ${coppie.size}`);
  }

  const volteARiposo = {};
  for (let g = 1; g <= n; g++) {
    if (riposi[g]) volteARiposo[riposi[g]] = (volteARiposo[riposi[g]] || 0) + 1;
  }
  for (const id of tutti) {
    if (volteARiposo[id] !== 1) errori.push(`${id} riposa ${volteARiposo[id] || 0} volte nell'andata`);
    if (!impianti.has(id)) errori.push(`${id} non ha un impianto nella tabella`);
  }

  const dateAndata = giornate.map((g) => g.andata);
  const dateRitorno = giornate.map((g) => g.ritorno);
  const crescenti = (lista) => lista.every((d, i) => i === 0 || d > lista[i - 1]);
  if (!crescenti(dateAndata)) errori.push('le date dell\'andata non sono in ordine');
  if (!crescenti(dateRitorno)) errori.push('le date del ritorno non sono in ordine');
  if (dateRitorno[0] <= dateAndata[dateAndata.length - 1]) {
    errori.push('il ritorno comincia prima che finisca l\'andata');
  }

  return errori;
}

/* ------------------------------------------------------------------ */
/* Avvio                                                               */
/* ------------------------------------------------------------------ */

const argomenti = process.argv.slice(2);
const sorgente = argomenti.find((a) => !a.startsWith('--'));
const girone = (argomenti.find((a) => a.startsWith('--girone='))?.split('=')[1] || 'A').toUpperCase();
const soloProva = argomenti.includes('--prova');

if (!sorgente) {
  console.error('Uso: node scripts/importa-calendario.mjs <calendario.pdf|.txt> [--girone=A] [--prova]');
  process.exit(2);
}

const tutte = inRighe(estraiTesto(sorgente));
const trovato = dividiGironi(tutte).find((g) => g.girone === girone);
if (!trovato) {
  console.error(`Nel documento non c'è il girone ${girone}.`);
  process.exit(1);
}

const giornate = leggiGiornate(trovato.righeGiornate, Math.ceil(SQUADRE.length / 2));
const impianti = leggiImpianti(trovato.righeImpianti);
const { partite, riposi } = costruisciStagione(giornate, impianti);

const errori = controlla(giornate, partite, riposi, impianti);
if (errori.length) {
  console.error(`\nCalendario NON importato: ${errori.length} problemi.\n`);
  for (const e of errori) console.error(`  ✗ ${e}`);
  process.exit(1);
}

/* --- riepilogo --- */

const nomi = new Map(SQUADRE.map((s) => [s.id, s.nome]));
const nostra = 'grezzago';
const annoInizio = Number(giornate[0].andata.slice(0, 4));

console.log(`\nGirone ${girone}: ${giornate.length * 2} giornate, ${partite.length} partite`);
console.log(`Andata ${giornate[0].andata} → ${giornate.at(-1).andata} · ritorno ${giornate[0].ritorno} → ${giornate.at(-1).ritorno}`);
console.log(`\nIl ${nomi.get(nostra)}:`);
for (let g = 1; g <= giornate.length * 2; g++) {
  if (riposi[g] === nostra) { console.log(`  ${String(g).padStart(2)}ª  riposo`); continue; }
  const p = partite.find((x) => x.giornata === g && (x.casa === nostra || x.ospite === nostra));
  const dove = p.casa === nostra ? 'casa     ' : 'trasferta';
  const contro = nomi.get(p.casa === nostra ? p.ospite : p.casa);
  const ora = p.ora ?? 'O.F.';
  console.log(`  ${String(g).padStart(2)}ª  ${p.data}  ${ora.padEnd(5)}  ${dove}  ${contro}`);
}

if (soloProva) {
  console.log('\n(prova: nessun file scritto)\n');
  process.exit(0);
}

/* --- scrittura: i risultati già registrati restano, se la partita esiste ancora --- */

const precedente = existsSync(FILE_STAGIONE) ? JSON.parse(readFileSync(FILE_STAGIONE, 'utf8')) : {};
const idValidi = new Set(partite.map((p) => p.id));
const risultati = {};
const orfani = [];
for (const [id, r] of Object.entries(precedente.risultati || {})) {
  if (idValidi.has(id)) risultati[id] = r; else orfani.push(id);
}
if (orfani.length) {
  console.warn(`\nAttenzione: ${orfani.length} risultati non corrispondono a nessuna partita del nuovo calendario e sono stati scartati.`);
}

const stagione = {
  config: {
    stagione: `${annoInizio}/${String(annoInizio + 1).slice(2)}`,
    campionato: 'Terza Categoria',
    girone: `Monza Brianza — Girone ${girone}`,
    federazione: 'LND — Comitato Regionale Lombardia, Delegazione di Monza',
    squadraDiCasa: nostra,
    puntiVittoria: 3,
    puntiPareggio: 1,
    // Regolamento Campionati Dilettantistici CRL 2026/27, Terza Categoria:
    // la prima sale in Seconda Categoria, dalla 2ª alla 7ª si va ai play-off.
    zone: { promozione: 1, playoff: 7 },
    fonte: {
      nome: 'CRL LND — Delegazione di Monza',
      url: 'https://www.crlombardia.it/comunicati',
    },
    calendario: {
      documento: basename(sorgente),
      importatoIl: new Date().toISOString().slice(0, 10),
    },
  },
  squadre: squadrePerIlSito(),
  impianti: Object.fromEntries(impianti),
  riposi,
  partite,
  risultati,
};

writeFileSync(FILE_STAGIONE, JSON.stringify(stagione, null, 2) + '\n', 'utf8');
console.log(`\n✓ Scritto ${FILE_STAGIONE.replace(RADICE + '/', '')}\n`);
