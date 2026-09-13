/** Vista «Oggi»: il colpo d'occhio su paese, squadra ed eventi. */

import { icona } from './icone.js';
import * as f from './formato.js';
import { cartaPartita, stemma, forma, cardEvento, titoloSezione, statoVuoto } from './componenti.js';
import { calcola } from './vista-calcio.js';
import { prossimaPartita } from './classifica.js';
import { inArrivo } from './vista-eventi.js';

/** Estratto della classifica: le prime posizioni più il Grezzago se è fuori. */
function estrattoClassifica(righe, nostra) {
  const quante = 5;
  const testa = righe.slice(0, quante);
  const nostraRiga = righe.find((r) => r.id === nostra);
  const fuori = nostraRiga && nostraRiga.posizione > quante;

  const riga = (r, staccata) => `
    <tr class="${r.id === nostra ? 'nostra' : ''} ${r.zona ? `zona-${r.zona}` : ''}"
        ${staccata ? 'style="border-top:2px solid var(--bordo)"' : ''}>
      <td class="col-pos"><span class="cella-pos num">${r.posizione}</span></td>
      <td class="col-squadra">
        <div class="cella-squadra">
          ${stemma(r.squadra, 'sm')}
          <span class="nome">${f.esc(r.squadra.nome)}</span>
        </div>
      </td>
      <td class="cella-forma col-forma">${forma(r.forma)}</td>
      <td class="col-dr num ${r.dr > 0 ? 'dr-pos' : r.dr < 0 ? 'dr-neg' : ''}">${f.conSegno(r.dr)}</td>
      <td class="col-pt num">${r.pt}</td>
    </tr>`;

  return `<div class="tabellone-wrap">
    <div class="scroll-x">
      <table class="classifica">
        <thead>
          <tr>
            <th class="col-pos" scope="col">#</th>
            <th class="col-squadra" scope="col">Squadra</th>
            <th class="col-forma" scope="col">Forma</th>
            <th class="col-dr" scope="col" title="Differenza reti">DR</th>
            <th class="col-pt" scope="col" title="Punti">PT</th>
          </tr>
        </thead>
        <tbody>
          ${testa.map((r) => riga(r, false)).join('')}
          ${fuori ? riga(nostraRiga, true) : ''}
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */

export function rendi(stato, ui, adesso) {
  const { righe, risolte } = calcola(stato, adesso);
  const indice = new Map(stato.squadre.map((s) => [s.id, s]));
  const nostra = stato.config.squadraDiCasa;
  const paese = stato.luoghi.paese;

  const prossima = prossimaPartita(risolte, nostra);
  const tuttiInArrivo = inArrivo(stato.eventi, adesso);
  const eventi = tuttiInArrivo.slice(0, 3);
  const nostraRiga = righe.find((r) => r.id === nostra);
  const campionatoIniziato = righe.some((r) => r.g > 0);

  return `<div class="sezione entra">
    <header class="hero">
      <div class="hero-occhiello">${f.esc(paese.provincia)}</div>
      <h1>Grezzago</h1>
      <p>${f.esc(paese.occhiello)}</p>
      <div class="hero-dati">
        <div class="hero-dato">
          <strong class="num">${paese.abitanti.toLocaleString('it-IT')}</strong>
          <span>abitanti</span>
        </div>
        <div class="hero-dato">
          <strong class="num">${tuttiInArrivo.length}</strong>
          <span>${tuttiInArrivo.length === 1 ? 'evento in arrivo' : 'eventi in arrivo'}</span>
        </div>
        ${campionatoIniziato && nostraRiga ? `<div class="hero-dato">
          <strong class="num">${nostraRiga.posizione}º</strong>
          <span>in classifica</span>
        </div>` : `<div class="hero-dato">
          <strong class="num">${f.giorno(stato.partite[0].data)} ${f.esc(f.meseBreve(stato.partite[0].data))}</strong>
          <span>via al campionato</span>
        </div>`}
      </div>
    </header>

    ${titoloSezione(prossima?.stato === 'in-corso' ? 'La partita, adesso' : 'La prossima partita',
      { href: '#/calcio', testo: 'Tutto il campionato' })}
    ${prossima
      ? cartaPartita(prossima, indice, { nostra, adesso })
      : `<div class="carta">${statoVuoto('pallone', 'Stagione conclusa',
          'Il calendario 2026/27 è terminato. A presto con la prossima stagione.')}</div>`}

    ${titoloSezione('Classifica', { href: '#/calcio', testo: 'Vedi tutte e 15' })}
    ${campionatoIniziato
      ? estrattoClassifica(righe, nostra)
      : `<div class="carta">${statoVuoto('pallone', 'Si comincia il ' + f.dataBreve(stato.partite[0].data),
          'Le 15 squadre del girone partono tutte da zero. La classifica si aggiorna dalla prima giornata.')}</div>`}

    ${titoloSezione('Prossimi eventi', { href: '#/eventi', testo: 'Tutti gli eventi' })}
    ${eventi.length
      ? `<div class="pila">${eventi.map((e) => cardEvento(e, stato.categorie, adesso)).join('')}</div>`
      : `<div class="carta">${statoVuoto('calendario', 'Nessun evento in programma',
          'Appena viene pubblicata una nuova iniziativa la trovi qui.')}</div>`}

    ${titoloSezione('Vieni a Grezzago', { href: '#/scopri', testo: 'Scopri il paese' })}
    <a class="carta" href="#/scopri" style="display:flex;gap:16px;padding:18px;text-decoration:none;align-items:center">
      <span class="luogo-icona" style="margin:0;flex:none">${icona('bussola')}</span>
      <span style="flex:1;min-width:0">
        <strong style="font-family:var(--font-display);font-size:16px;letter-spacing:-.02em">
          Una chiesa del Duecento, un palazzo del Quattrocento, tre chilometri quadrati
        </strong>
        <span style="display:block;font-size:13.5px;color:var(--testo-medio);margin-top:5px;line-height:1.5">
          Cosa vedere in paese, come arrivare in auto, in metrò o in bicicletta, e i numeri utili.
        </span>
      </span>
      ${icona('frecciaDx', { classe: '' })}
    </a>
  </div>`;
}
