/** Pezzi di interfaccia riusati da più viste. */

import { icona } from './icone.js';
import * as f from './formato.js';

/* ------------------------------------------------------------------ */

export function stemma(squadra, dimensione = '') {
  const colore = squadra.colore || f.coloreSquadra(squadra.id);
  const sigla = squadra.sigla || f.iniziali(squadra.nome);
  return `<span class="stemma ${dimensione}" style="background:${colore}"
    aria-hidden="true">${f.esc(sigla)}</span>`;
}

export function pillLive(minuto, intervallo) {
  const testo = intervallo ? 'Intervallo' : `${minuto}'`;
  return `<span class="pill pill-live"><span class="punto"></span>${testo}</span>`;
}

export function forma(esiti) {
  if (!esiti?.length) {
    return `<div class="forma">${'<span class="forma-esito vuoto"></span>'.repeat(5)}</div>`;
  }
  const vuote = Math.max(0, 5 - esiti.length);
  return `<div class="forma">
    ${'<span class="forma-esito vuoto"></span>'.repeat(vuote)}
    ${esiti.map((e) => `<span class="forma-esito ${e}" title="${
      e === 'V' ? 'Vittoria' : e === 'N' ? 'Pareggio' : 'Sconfitta'
    }">${e}</span>`).join('')}
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Card della partita in evidenza                                      */
/* ------------------------------------------------------------------ */

export function cartaPartita(partita, indice, { nostra, adesso, luogo }) {
  const casa = indice.get(partita.casa);
  const ospite = indice.get(partita.ospite);
  const inCorso = partita.stato === 'in-corso';
  const finita = partita.stato === 'finita';
  const mostraPunteggio = inCorso || finita;

  // Partita cominciata di cui non abbiamo il punteggio: il minuto lo sappiamo,
  // il risultato no. Va detto «in corso», non «non disponibile».
  const inCampoSenzaPunteggio = partita.stato === 'attesa-risultato' && partita.inCampo;

  const etichettaStato = inCorso || inCampoSenzaPunteggio
    ? pillLive(partita.minuto, partita.intervallo)
    : finita
      ? '<span class="pill">Finale</span>'
      : partita.stato === 'attesa-risultato'
        ? '<span class="pill">Risultato in arrivo</span>'
        : `<span class="pill">${f.esc(f.quando(partita.data, adesso))}</span>`;

  const centro = mostraPunteggio
    ? `<div class="tab-punteggio num">
         <span>${partita.punteggio[0]}</span>
         <span class="trattino">–</span>
         <span>${partita.punteggio[1]}</span>
       </div>`
    : partita.stato === 'attesa-risultato'
      ? `<div class="tab-ora">${inCampoSenzaPunteggio ? 'In corso' : '—'}<small>${
          inCampoSenzaPunteggio ? 'punteggio non disponibile' : 'risultato non ancora pubblicato'
        }</small></div>`
      : `<div class="tab-ora num">${f.esc(partita.ora || '15:30')}<small>Calcio d'inizio</small></div>`;

  // L'impianto arriva dal calendario ufficiale della Delegazione: campo e
  // indirizzo della squadra che gioca in casa. Senza, meglio un «da
  // confermare» che un campo inventato.
  const imp = partita.impianto;
  const campo = imp ? `${imp.campo} · ${imp.indirizzo}` : (luogo || 'Impianto da confermare');

  return `<article class="partita-hero ${inCorso ? 'in-diretta' : ''}">
    <header class="partita-testa">
      ${etichettaStato}
      <span class="sep">•</span>
      <span>${f.ordinaleF(partita.giornata)} giornata</span>
      <span class="sep">•</span>
      <span>${f.esc(f.dataLunga(partita.data, adesso))}</span>
    </header>

    <div class="tabellone">
      <div class="tab-squadra ${partita.casa === nostra ? 'nostra' : ''}">
        ${stemma(casa, 'lg')}
        <span class="nome">${f.esc(casa?.nome || '—')}</span>
      </div>
      ${centro}
      <div class="tab-squadra ${partita.ospite === nostra ? 'nostra' : ''}">
        ${stemma(ospite, 'lg')}
        <span class="nome">${f.esc(ospite?.nome || '—')}</span>
      </div>
    </div>

    <footer class="partita-piede">
      <span class="campo-gara">${icona('luogo')}${f.esc(campo)}</span>
      ${partita.stato === 'programmata'
        ? `<div class="countdown" data-countdown="${partita.data}T${partita.ora || '15:30'}:00"></div>`
        : ''}
    </footer>
  </article>`;
}

/** Contenuto del conto alla rovescia, aggiornato dal ticker di app.js. */
export function contenutoCountdown(obiettivo, adesso) {
  const { giorni, ore, minuti, secondi } = f.scomponi(new Date(obiettivo) - adesso);
  const blocchi = giorni > 0
    ? [[giorni, giorni === 1 ? 'giorno' : 'giorni'], [ore, 'ore'], [minuti, 'min']]
    : [[ore, 'ore'], [minuti, 'min'], [secondi, 'sec']];

  return blocchi.map(([valore, etichetta]) => `<div class="cd-blocco">
      <strong class="num">${String(valore).padStart(2, '0')}</strong>
      <span>${etichetta}</span>
    </div>`).join('');
}

/* ------------------------------------------------------------------ */
/* Eventi                                                              */
/* ------------------------------------------------------------------ */

export function bloccoData(data) {
  return `<div class="data-blocco">
    <div class="mese">${f.esc(f.meseBreve(data))}</div>
    <div class="giorno num">${f.giorno(data)}</div>
    <div class="settimana">${f.esc(f.giornoSettimanaBreve(data))}</div>
  </div>`;
}

export function cardEvento(evento, categorie, adesso) {
  const cat = categorie?.[evento.categoria];
  const orario = evento.orarioNota
    || (evento.soloAvviso ? null : f.ora(evento.inizio));

  return `<button class="evento" data-evento="${f.esc(evento.id)}" type="button">
    ${bloccoData(evento.inizio)}
    <div class="evento-corpo">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        ${cat ? `<span class="tag-cat cat-${f.esc(cat.colore)}">${f.esc(cat.etichetta)}</span>` : ''}
        ${evento.demo ? '<span class="pill oro">da confermare</span>' : ''}
      </div>
      <h3>${f.esc(evento.titolo)}</h3>
      ${evento.sottotitolo
        ? `<p class="evento-sotto">${f.esc(evento.sottotitolo)}</p>`
        : `<p class="evento-sotto">${f.esc(evento.descrizione || '')}</p>`}
      <div class="evento-meta">
        <span>${icona('calendario')}${f.esc(f.quando(evento.inizio, adesso))}</span>
        ${orario ? `<span>${icona('orologio')}${f.esc(orario)}</span>` : ''}
        ${evento.luogo ? `<span class="tronca">${icona('luogo')}<span class="tronca">${f.esc(evento.luogo)}</span></span>` : ''}
      </div>
    </div>
  </button>`;
}

/* ------------------------------------------------------------------ */

export function statoVuoto(nomeIcona, titolo, testo) {
  return `<div class="vuoto">
    ${icona(nomeIcona)}
    <h3>${f.esc(titolo)}</h3>
    <p>${f.esc(testo)}</p>
  </div>`;
}

export function titoloSezione(testo, coda) {
  return `<div class="titolo-sez">
    <h2>${f.esc(testo)}</h2>
    ${coda ? `<a class="coda" href="${f.esc(coda.href)}">${f.esc(coda.testo)} →</a>` : ''}
  </div>`;
}
