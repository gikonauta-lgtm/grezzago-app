/**
 * Importa i risultati ufficiali del girone da un comunicato della
 * Delegazione Provinciale di Monza del CRL LND.
 *
 * Uso:
 *   node scripts/importa-risultati.mjs <comunicato.pdf | .txt | URL> [--prova] [--grezzo]
 *
 *   --prova    legge, abbina al calendario e stampa, senza scrivere nulla
 *   --grezzo   stampa solo ciò che ha letto nel documento, senza abbinarlo
 *              al calendario (per controllare un comunicato di un'altra stagione)
 *
 * Il comunicato della Delegazione esce in genere il giovedì dopo la giornata
 * e riporta, nella sezione TERZA CATEGORIA MONZA, blocchi come:
 *
 *   RISULTATI UFFICIALI GARE DEL 13/09/2026
 *   GIRONE A - 1 Giornata - A
 *   AURELIANA - GREZZAGO 1 - 2
 *   (1) FONAS ASD - MONS.ORSENIGO 0 - 0
 *   (1) - disputata il 12/09/2026
 *
 * Ogni risultato viene abbinato alla partita del calendario ufficiale con la
 * stessa giornata, la stessa squadra di casa e la stessa ospite. Se anche uno
 * solo non trova la sua partita, non viene scritto niente: un risultato
 * attaccato alla partita sbagliata sposterebbe punti fra squadre.
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { estraiTesto, righe as inRighe } from './pdf-testo.mjs';
import { risolviSquadra } from './squadre.mjs';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE_STAGIONE = join(RADICE, 'data', 'stagione.json');

const RE_SEZIONE = /^TERZA CATEGORIA MONZA$/i;
const RE_FINE_SEZIONE = /^GIUDICE SPORTIVO$/i;
const RE_DATA_GARE = /^RISULTATI UFFICIALI GARE DEL\s+(\d{2})\/(\d{2})\/(\d{4})$/i;
const RE_BLOCCO = /^GIRONE\s+([A-Z])\s*-\s*(\d{1,2})\s+Giornata\s*-\s*([AR])$/i;
const RE_NOTA = /^\((\d+)\)\s*-\s*disputata il\s+(\d{2})\/(\d{2})\/(\d{4})$/i;
const RE_RISULTATO = /^(?:\((\d+)\)\s*)?(.+?)\s+-\s+(.+?)\s+(\d{1,2})\s*-\s*(\d{1,2})$/;

const iso = (gg, mm, aaaa) => `${aaaa}-${mm}-${gg}`;

/* ------------------------------------------------------------------ */
/* Lettura del comunicato                                              */
/* ------------------------------------------------------------------ */

/**
 * Tutti i risultati della sezione Terza Categoria Monza, di tutti i gironi.
 * Le altre categorie del comunicato hanno blocchi identici («GIRONE A - 1
 * Giornata - A»): per questo si legge solo dentro la sezione giusta.
 */
export function leggiRisultati(tutte) {
  const letti = [];
  let inSezione = false;
  let inRisultati = false;
  let dataGare = null;
  let blocco = null;

  for (const riga of tutte) {
    if (RE_SEZIONE.test(riga)) { inSezione = true; inRisultati = false; blocco = null; continue; }
    if (!inSezione) continue;
    if (RE_FINE_SEZIONE.test(riga)) { inSezione = false; inRisultati = false; blocco = null; continue; }

    const data = riga.match(RE_DATA_GARE);
    if (data) { inRisultati = true; dataGare = iso(data[1], data[2], data[3]); blocco = null; continue; }
    if (!inRisultati) continue;

    const intestazione = riga.match(RE_BLOCCO);
    if (intestazione) {
      blocco = {
        girone: intestazione[1].toUpperCase(),
        numero: Number(intestazione[2]),
        fase: intestazione[3].toUpperCase(),
        righe: [],
      };
      continue;
    }

    // «(1) - disputata il ...»: vale per le righe del blocco marcate (1)
    const nota = riga.match(RE_NOTA);
    if (nota && blocco) {
      for (const r of blocco.righe) {
        if (r.nota === nota[1]) r.dataEffettiva = iso(nota[2], nota[3], nota[4]);
      }
      continue;
    }

    const risultato = riga.match(RE_RISULTATO);
    if (risultato && blocco) {
      const voce = {
        girone: blocco.girone,
        numero: blocco.numero,
        fase: blocco.fase,
        casa: risultato[2].trim(),
        ospite: risultato[3].trim(),
        gol: [Number(risultato[4]), Number(risultato[5])],
        nota: risultato[1] ?? null,
        dataGare,
        dataEffettiva: null,
      };
      blocco.righe.push(voce);
      letti.push(voce);
    }
  }

  return letti;
}

/**
 * Abbina i risultati letti alle partite del calendario ufficiale.
 * @returns {{ abbinati: Array, errori: string[] }}
 */
export function abbina(letti, stagione, girone) {
  const giornateAndata = Math.max(...stagione.partite.map((p) => p.giornata)) / 2;
  const abbinati = [];
  const errori = [];

  for (const l of letti.filter((x) => x.girone === girone)) {
    const giornata = l.fase === 'A' ? l.numero : l.numero + giornateAndata;
    const etichetta = `${l.numero}ª ${l.fase === 'A' ? 'andata' : 'ritorno'}: ${l.casa} - ${l.ospite} ${l.gol.join('-')}`;

    let casa; let ospite;
    try {
      casa = risolviSquadra(l.casa);
      ospite = risolviSquadra(l.ospite);
    } catch (e) {
      errori.push(`${etichetta} — ${e.message}`);
      continue;
    }

    const partita = stagione.partite.find(
      (p) => p.giornata === giornata && p.casa === casa && p.ospite === ospite
    );
    if (!partita) {
      const invertita = stagione.partite.find(
        (p) => p.giornata === giornata && p.casa === ospite && p.ospite === casa
      );
      errori.push(`${etichetta} — ${invertita
        ? 'nel calendario la partita ha i campi invertiti'
        : 'nessuna partita corrispondente nel calendario'}`);
      continue;
    }

    abbinati.push({ partita, gol: l.gol, dataEffettiva: l.dataEffettiva });
  }

  return { abbinati, errori };
}

/* ------------------------------------------------------------------ */
/* Avvio                                                               */
/* ------------------------------------------------------------------ */

async function procura(sorgente) {
  if (!/^https?:\/\//i.test(sorgente)) return sorgente;

  const risposta = await fetch(sorgente, {
    headers: { 'User-Agent': 'GrezzagoApp/1.0 (app non ufficiale su Grezzago)' },
  });
  if (!risposta.ok) throw new Error(`Download non riuscito: HTTP ${risposta.status}`);

  const nome = decodeURIComponent(basename(new URL(sorgente).pathname)) || 'comunicato.pdf';
  const file = join(mkdtempSync(join(tmpdir(), 'grezzago-')), nome);
  writeFileSync(file, Buffer.from(await risposta.arrayBuffer()));
  return file;
}

async function principale() {
  const argomenti = process.argv.slice(2);
  const sorgente = argomenti.find((a) => !a.startsWith('--'));
  const soloProva = argomenti.includes('--prova');
  const grezzo = argomenti.includes('--grezzo');

  if (!sorgente) {
    console.error('Uso: node scripts/importa-risultati.mjs <comunicato.pdf|.txt|URL> [--prova] [--grezzo]');
    process.exit(2);
  }

  const file = await procura(sorgente);
  const letti = leggiRisultati(inRighe(estraiTesto(file)));

  if (grezzo) {
    console.log(`\n${letti.length} risultati nella sezione Terza Categoria Monza:\n`);
    for (const l of letti) {
      const quando = l.dataEffettiva ? ` (giocata il ${l.dataEffettiva})` : '';
      console.log(`  gir. ${l.girone} · ${String(l.numero).padStart(2)}ª ${l.fase} · ${l.casa} - ${l.ospite}  ${l.gol.join('-')}${quando}`);
    }
    console.log();
    return;
  }

  const stagione = JSON.parse(readFileSync(FILE_STAGIONE, 'utf8'));
  const girone = stagione.config.girone.match(/Girone\s+([A-Z])/i)?.[1]?.toUpperCase() ?? 'A';
  const { abbinati, errori } = abbina(letti, stagione, girone);

  if (!letti.some((l) => l.girone === girone)) {
    console.log(`\nNel documento non ci sono risultati del girone ${girone} di Terza Categoria Monza.\n`);
    return;
  }

  if (errori.length) {
    console.error(`\nRisultati NON importati: ${errori.length} non trovano la loro partita.\n`);
    for (const e of errori) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  const nomi = new Map(stagione.squadre.map((s) => [s.id, s.nome]));
  const nostra = stagione.config.squadraDiCasa;
  let nuovi = 0;
  let rettifiche = 0;

  console.log(`\nGirone ${girone}: ${abbinati.length} risultati ufficiali\n`);
  for (const { partita, gol, dataEffettiva } of abbinati) {
    const prima = stagione.risultati?.[partita.id];
    const stato = !prima ? 'nuovo' : (prima[0] === gol[0] && prima[1] === gol[1]) ? 'già presente' : `rettifica (era ${prima.join('-')})`;
    if (!prima) nuovi++;
    else if (stato.startsWith('rettifica')) rettifiche++;

    const nostraPartita = partita.casa === nostra || partita.ospite === nostra;
    const quando = dataEffettiva && dataEffettiva !== partita.data ? `, giocata il ${dataEffettiva}` : '';
    console.log(
      `  ${nostraPartita ? '▸' : ' '} ${String(partita.giornata).padStart(2)}ª  `
      + `${nomi.get(partita.casa)} - ${nomi.get(partita.ospite)}  ${gol.join('-')}  [${stato}${quando}]`
    );
  }

  if (soloProva) {
    console.log(`\n(prova: ${nuovi} nuovi, ${rettifiche} rettifiche — nessun file scritto)\n`);
    return;
  }

  stagione.risultati = stagione.risultati || {};
  for (const { partita, gol } of abbinati) stagione.risultati[partita.id] = gol;
  stagione.config.risultati = {
    documento: basename(file),
    importatoIl: new Date().toISOString().slice(0, 10),
  };

  writeFileSync(FILE_STAGIONE, JSON.stringify(stagione, null, 2) + '\n', 'utf8');
  console.log(`\n✓ ${nuovi} nuovi risultati, ${rettifiche} rettifiche. Scritto data/stagione.json\n`);
}

// Eseguo solo se lanciato da riga di comando: le funzioni di lettura
// restano importabili dai test senza effetti collaterali.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principale().catch((e) => { console.error(`\n✗ ${e.message}\n`); process.exit(1); });
}
