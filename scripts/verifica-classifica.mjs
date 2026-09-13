/**
 * Controlla i dati del calcio e li stampa a terminale.
 *
 * Uso:  node scripts/verifica-classifica.mjs [--al=AAAA-MM-GG]
 *
 *   --al   calcola come se oggi fosse quella data, per vedere in anticipo
 *          come si presenterà una certa giornata
 *
 * Serve a non pubblicare dati sbagliati: controlla che i conti della
 * classifica tornino, che il calendario sia un girone all'italiana completo,
 * che ogni risultato corrisponda a una partita vera e — per la coppa — che la
 * classifica calcolata coincida con quella pubblicata dal Comitato.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calcolaClassifica, risolviPartite, prossimaPartita, ultimaGiocata } from '../js/classifica.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (nome) => JSON.parse(readFileSync(join(RADICE, 'data', nome), 'utf8'));

const alGiorno = process.argv.find((a) => a.startsWith('--al='))?.split('=')[1];
const adesso = alGiorno ? new Date(`${alGiorno}T23:59:59`) : new Date();

const s = leggi('stagione.json');
const nostra = s.config.squadraDiCasa;
const nomi = new Map(s.squadre.map((x) => [x.id, x.nome]));
const problemi = [];

/* ------------------------------------------------------------------ */
/* Campionato                                                          */
/* ------------------------------------------------------------------ */

const righe = calcolaClassifica({
  squadre: s.squadre, partite: s.partite, risultati: s.risultati, config: s.config, adesso,
});
const risolte = risolviPartite({ partite: s.partite, risultati: s.risultati, adesso });
const giocate = risolte.filter((p) => p.contaPerClassifica);
const inCorso = risolte.filter((p) => p.stato === 'in-corso');
const attesa = risolte.filter((p) => p.stato === 'attesa-risultato');

console.log(`\n${s.config.campionato} — ${s.config.girone} — ${s.config.stagione}`);
console.log(`Al ${adesso.toLocaleString('it-IT')}${alGiorno ? ' (data simulata da --al)' : ''}`);
console.log(`Calendario: ${s.config.calendario?.documento ?? '—'} · importato il ${s.config.calendario?.importatoIl ?? '—'}`);
if (s.config.risultati) {
  console.log(`Risultati:  ${s.config.risultati.documento} · importato il ${s.config.risultati.importatoIl}`);
}
console.log();
console.log('POS  SQUADRA                 PT   G   V  N  P    GF  GS   DR  FORMA');
console.log('─'.repeat(70));

for (const r of righe) {
  const marcatore = r.id === nostra ? '▸' : ' ';
  console.log(
    `${marcatore}${String(r.posizione).padStart(2)}  `
    + r.squadra.nome.padEnd(24)
    + String(r.pt).padStart(2) + '  '
    + String(r.g).padStart(2) + '  ' + String(r.v).padStart(2) + ' '
    + String(r.n).padStart(2) + ' ' + String(r.p).padStart(2) + '   '
    + String(r.gf).padStart(3) + String(r.gs).padStart(4) + '  '
    + String(r.dr > 0 ? `+${r.dr}` : r.dr).padStart(3) + '   ' + r.forma.join('')
  );
}
console.log('─'.repeat(70));

/* --- coerenza dei conti --- */

const sommaG = righe.reduce((t, r) => t + r.g, 0);
if (sommaG !== giocate.length * 2) problemi.push(`partite contate ${sommaG}, attese ${giocate.length * 2}`);

const gf = righe.reduce((t, r) => t + r.gf, 0);
const gs = righe.reduce((t, r) => t + r.gs, 0);
if (gf !== gs) problemi.push(`gol fatti ${gf} ≠ gol subiti ${gs}`);

for (const r of righe) {
  if (r.v + r.n + r.p !== r.g) problemi.push(`${r.squadra.nome}: V+N+P ≠ G`);
  if (r.v * s.config.puntiVittoria + r.n * s.config.puntiPareggio !== r.pt) {
    problemi.push(`${r.squadra.nome}: i punti non tornano`);
  }
  if (r.casa.g + r.trasferta.g !== r.g) problemi.push(`${r.squadra.nome}: casa+trasferta ≠ G`);
  if (r.gf - r.gs !== r.dr) problemi.push(`${r.squadra.nome}: differenza reti errata`);
}

for (let i = 1; i < righe.length; i++) {
  if (righe[i - 1].pt < righe[i].pt) problemi.push('ordinamento per punti non rispettato');
}

/* --- calendario --- */

const n = s.squadre.length;
const giornate = Math.max(...s.partite.map((p) => p.giornata));
let peggiorSerie = 0;
let squadraPeggiore = '';

for (const squadra of s.squadre) {
  const sue = s.partite
    .filter((p) => p.casa === squadra.id || p.ospite === squadra.id)
    .sort((a, b) => a.giornata - b.giornata);

  if (sue.length !== (n - 1) * 2) {
    problemi.push(`${squadra.nome}: ${sue.length} partite invece di ${(n - 1) * 2}`);
  }
  const interne = sue.filter((p) => p.casa === squadra.id).length;
  if (interne !== sue.length / 2) {
    problemi.push(`${squadra.nome}: ${interne} gare interne su ${sue.length}`);
  }
  if (!s.impianti?.[squadra.id]) problemi.push(`${squadra.nome}: manca l'impianto`);

  let serie = 1;
  for (let i = 1; i < sue.length; i++) {
    const stessoCampo = (sue[i].casa === squadra.id) === (sue[i - 1].casa === squadra.id);
    serie = stessoCampo ? serie + 1 : 1;
    if (serie > peggiorSerie) { peggiorSerie = serie; squadraPeggiore = squadra.nome; }
  }
}

for (let g = 1; g <= giornate; g++) {
  const presenti = s.partite.filter((p) => p.giornata === g).flatMap((p) => [p.casa, p.ospite]);
  if (s.riposi?.[g]) presenti.push(s.riposi[g]);
  if (new Set(presenti).size !== n || presenti.length !== n) {
    problemi.push(`${g}ª giornata: le squadre non compaiono tutte una volta sola`);
  }
}

const idPartite = new Set(s.partite.map((p) => p.id));
for (const id of Object.keys(s.risultati || {})) {
  if (!idPartite.has(id)) problemi.push(`il risultato «${id}» non corrisponde a nessuna partita`);
}

const senzaOrario = s.partite.filter((p) => !p.ora).length;
if (senzaOrario) problemi.push(`${senzaOrario} partite senza orario`);

/* --- riepilogo campionato --- */

console.log(`${giocate.length} giocate · ${inCorso.length} in corso · ${attesa.length} in attesa di risultato · ${gf} gol`);
console.log(`Calendario: ${giornate} giornate, al massimo ${peggiorSerie} gare di fila sullo stesso campo (${squadraPeggiore})`);

for (const p of inCorso) {
  console.log(`  LIVE ${p.minuto}' — ${nomi.get(p.casa)} ${p.punteggio[0]}–${p.punteggio[1]} ${nomi.get(p.ospite)}`);
}

const ultima = ultimaGiocata(risolte, nostra);
if (ultima) {
  console.log(`Ultima del ${nomi.get(nostra)}: ${nomi.get(ultima.casa)} ${ultima.punteggio[0]}–${ultima.punteggio[1]} ${nomi.get(ultima.ospite)} (${ultima.giornata}ª)`);
}
const prossima = prossimaPartita(risolte, nostra);
if (prossima) {
  console.log(`Prossima: ${prossima.data} ${prossima.ora} — ${nomi.get(prossima.casa)} – ${nomi.get(prossima.ospite)}`);
  console.log(`          ${prossima.impianto?.campo ?? '—'}, ${prossima.impianto?.indirizzo ?? '—'}`);
}

/* ------------------------------------------------------------------ */
/* Coppa                                                               */
/* ------------------------------------------------------------------ */

if (existsSync(join(RADICE, 'data', 'coppa.json'))) {
  const c = leggi('coppa.json');
  const nomiCoppa = new Map(c.squadre.map((x) => [x.id, x.nome]));

  const tabella = calcolaClassifica({
    squadre: c.squadre,
    partite: c.partite,
    risultati: c.risultati,
    config: { puntiVittoria: 3, puntiPareggio: 1 },
    adesso,
  });

  console.log(`\n${c.competizione} — girone ${c.girone} (${c.aggiornataAl?.documento ?? 'fonte non indicata'})`);
  console.log('─'.repeat(70));
  for (const r of tabella) {
    const marcatore = r.id === nostra ? '▸' : ' ';
    console.log(`${marcatore}${String(r.posizione).padStart(2)}  ${r.squadra.nome.padEnd(24)}`
      + `${String(r.pt).padStart(2)} pt   ${r.g}G  ${r.gf}-${r.gs}`);
  }

  // Il confronto con la classifica pubblicata dal Comitato è il vero controllo:
  // se il motore sbaglia, qui si vede subito.
  for (const attesa of c.classificaUfficiale || []) {
    const calcolata = tabella.find((r) => r.id === attesa.id);
    if (!calcolata) { problemi.push(`coppa: ${attesa.id} manca nella classifica calcolata`); continue; }
    for (const campo of ['posizione', 'pt', 'g', 'v', 'n', 'p', 'gf', 'gs']) {
      if (calcolata[campo] !== attesa[campo]) {
        problemi.push(
          `coppa, ${nomiCoppa.get(attesa.id)}: ${campo} calcolato ${calcolata[campo]}, ufficiale ${attesa[campo]}`
        );
      }
    }
  }
}

/* ------------------------------------------------------------------ */

if (problemi.length) {
  console.error(`\n${problemi.length} PROBLEMI:\n` + problemi.map((p) => `  ✗ ${p}`).join('\n') + '\n');
  process.exit(1);
}
console.log('\n✓ Tutti i controlli superati.\n');
