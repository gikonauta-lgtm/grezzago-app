/**
 * Cerca i comunicati nuovi della Delegazione di Monza e ne importa i risultati.
 *
 * Uso:  node scripts/aggiorna.mjs [--prova] [--da=33439] [--max=150]
 *
 *   --prova   cerca e mostra cosa troverebbe, senza importare niente
 *   --da      id del documento da cui ripartire (di norma è nel file)
 *   --max     quanti id esaminare al massimo in una passata
 *
 * PERCHÉ FUNZIONA COSÌ
 *
 * Il sito del Comitato non ha né feed RSS né sitemap, e l'elenco dei
 * comunicati non è nella pagina: il browser lo carica con una chiamata
 * interna, che non è documentata e può cambiare da un giorno all'altro.
 *
 * Le pagine dei singoli documenti invece sono pubbliche, numerate in ordine
 * (/documenti/33439/...) e dicono in chiaro il numero del comunicato e la
 * delegazione che l'ha pubblicato. Quindi si riparte dall'ultimo documento
 * già visto e si va avanti finché la numerazione finisce: nessun endpoint
 * privato, solo pagine che chiunque può aprire.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE_STAGIONE = join(RADICE, 'data', 'stagione.json');

const SITO = 'https://www.crlombardia.it';
const AGENTE = 'GrezzagoApp/1.0 (app non ufficiale su Grezzago)';
const DELEGAZIONE = /delegazione di monza/i;
const RE_COMUNICATO = /COMUNICATO UFFICIALE N°?\s*(\d+)/i;

// Da dove partire la prima volta: C.U. n. 12 del 10/09/2026 della Delegazione
// di Monza, l'ultimo uscito prima che l'app fosse messa in piedi.
const ID_INIZIALE = 33439;

// Quanti 404 di fila prima di concludere che la numerazione è finita. I
// documenti sono numerati su tutto il sito, non solo su Monza, quindi i buchi
// veri sono rari: dieci sono abbondanti.
const BUCHI_TOLLERATI = 10;

const PAUSA_MS = 300; // gentilezza verso il server del Comitato

const argomenti = process.argv.slice(2);
const soloProva = argomenti.includes('--prova');
const daRigaComando = Number(argomenti.find((a) => a.startsWith('--da='))?.split('=')[1]);
const massimo = Number(argomenti.find((a) => a.startsWith('--max='))?.split('=')[1]) || 150;

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
const senzaTag = (s) => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ */

/** Legge la pagina di un documento. Restituisce null se non esiste. */
async function leggiDocumento(id) {
  const risposta = await fetch(`${SITO}/documenti/${id}/x`, { headers: { 'User-Agent': AGENTE } });
  if (risposta.status === 404) return null;
  if (!risposta.ok) throw new Error(`documento ${id}: HTTP ${risposta.status}`);

  const html = await risposta.text();
  const titolo = senzaTag(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  const sottotitolo = senzaTag(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? '');

  const allegati = [...html.matchAll(/href="([^"]*storage\/uploads\/files\/\d+\/[^"]+\.pdf)"/gi)]
    .map((m) => {
      const url = m[1].replace(/&amp;/g, '&');
      const nome = decodeURIComponent(url.split('/').pop()).replace(/^[0-9a-f]+_/i, '');
      return { nome, url: encodeURI(url) };
    });

  return { id, titolo, delegazione: sottotitolo, allegati };
}

/** L'allegato che contiene il comunicato vero e proprio. */
function comunicatoPrincipale(documento) {
  return documento.allegati.find((a) => /^comunicato\s+ufficiale/i.test(a.nome))
    ?? documento.allegati[0]
    ?? null;
}

/* ------------------------------------------------------------------ */

const stagione = JSON.parse(readFileSync(FILE_STAGIONE, 'utf8'));
const stato = stagione.config.aggiornamento ?? {};
const partenza = daRigaComando || (stato.ultimoIdVisto ?? ID_INIZIALE);

console.log(`\nCerco comunicati della Delegazione di Monza dal documento ${partenza + 1} in poi.`);

const trovati = [];
let ultimoEsistente = partenza;
let buchi = 0;
let esaminati = 0;

for (let id = partenza + 1; esaminati < massimo && buchi < BUCHI_TOLLERATI; id++) {
  esaminati++;
  let documento;
  try {
    documento = await leggiDocumento(id);
  } catch (errore) {
    console.error(`  ! ${errore.message}`);
    break;
  }

  if (!documento) { buchi++; continue; }

  buchi = 0;
  ultimoEsistente = id;

  const numero = documento.titolo.match(RE_COMUNICATO)?.[1];
  if (numero && DELEGAZIONE.test(documento.delegazione)) {
    trovati.push({ ...documento, numero: Number(numero) });
    console.log(`  ✓ ${id}: Comunicato Ufficiale n. ${numero} — ${documento.delegazione}`);
  }

  await attendi(PAUSA_MS);
}

console.log(`Esaminati ${esaminati} documenti, ultimo esistente ${ultimoEsistente}.`);

if (!trovati.length) {
  console.log('\nNessun comunicato nuovo della Delegazione di Monza.\n');
  if (!soloProva && ultimoEsistente > (stato.ultimoIdVisto ?? 0)) {
    stagione.config.aggiornamento = { ...stato, ultimoIdVisto: ultimoEsistente, ultimaRicerca: new Date().toISOString().slice(0, 10) };
    writeFileSync(FILE_STAGIONE, JSON.stringify(stagione, null, 2) + '\n', 'utf8');
  }
  process.exit(0);
}

/* ------------------------------------------------------------------ */

const contaRisultati = () => Object.keys(JSON.parse(readFileSync(FILE_STAGIONE, 'utf8')).risultati || {}).length;
const prima = contaRisultati();

for (const documento of trovati.sort((a, b) => a.numero - b.numero)) {
  const pdf = comunicatoPrincipale(documento);
  if (!pdf) { console.error(`  ! il documento ${documento.id} non ha allegati`); continue; }

  console.log(`\n── Comunicato n. ${documento.numero} · ${pdf.nome} ──`);
  if (soloProva) { console.log(`   ${pdf.url}`); continue; }

  try {
    execFileSync(process.execPath, [join(RADICE, 'scripts', 'importa-risultati.mjs'), pdf.url], {
      stdio: 'inherit',
      cwd: RADICE,
    });
  } catch {
    console.error(`\nL'importazione del comunicato n. ${documento.numero} si è fermata.`);
    console.error('Lo stato non viene aggiornato: si può riprovare, oppure importarlo a mano.\n');
    process.exit(1);
  }
}

if (soloProva) {
  console.log('\n(prova: niente importato, niente scritto)\n');
  process.exit(0);
}

/* --- aggiorno lo stato solo se è andato tutto bene --- */

const aggiornata = JSON.parse(readFileSync(FILE_STAGIONE, 'utf8'));
const ultimo = trovati[trovati.length - 1];
aggiornata.config.aggiornamento = {
  ultimoIdVisto: ultimoEsistente,
  ultimoComunicato: { numero: ultimo.numero, id: ultimo.id, url: `${SITO}/documenti/${ultimo.id}/x` },
  ultimaRicerca: new Date().toISOString().slice(0, 10),
};
writeFileSync(FILE_STAGIONE, JSON.stringify(aggiornata, null, 2) + '\n', 'utf8');

const dopo = contaRisultati();
console.log(`\n✓ Fatto. Risultati in archivio: ${prima} → ${dopo}.\n`);
