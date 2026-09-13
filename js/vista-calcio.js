/** Vista «Calcio»: classifica, calendario/risultati e statistiche. */

import { icona } from './icone.js';
import * as f from './formato.js';
import { stemma, forma, cartaPartita, statoVuoto } from './componenti.js';
import {
  calcolaClassifica, risolviPartite, prossimaPartita, ultimaGiocata,
  giornataCorrente, statistiche,
} from './classifica.js';
import { cartaCoppa } from './vista-coppa.js';

/* ------------------------------------------------------------------ */

export function calcola(stato, adesso) {
  const righe = calcolaClassifica({
    squadre: stato.squadre,
    partite: stato.partite,
    risultati: stato.risultati,
    config: stato.config,
    adesso,
  });
  const risolte = risolviPartite({
    partite: stato.partite,
    risultati: stato.risultati,
    adesso,
  });
  return { righe, risolte };
}

/* ------------------------------------------------------------------ */
/* Classifica                                                          */
/* ------------------------------------------------------------------ */

function tabellaClassifica(righe, nostra) {
  const nessunaGiocata = righe.every((r) => r.g === 0);

  const corpo = righe.map((r) => `
    <tr class="${r.id === nostra ? 'nostra' : ''} ${r.zona ? `zona-${r.zona}` : ''}"
        data-squadra="${f.esc(r.id)}">
      <td class="col-pos"><span class="cella-pos num">${r.posizione}</span></td>
      <td class="col-squadra">
        <div class="cella-squadra">
          ${stemma(r.squadra, 'sm')}
          <span class="nome">${f.esc(r.squadra.nome)}</span>
        </div>
      </td>
      <td class="col-pt num">${r.pt}</td>
      <td class="col-g num">${r.g}</td>
      <td class="col-extra num">${r.v}</td>
      <td class="col-extra num">${r.n}</td>
      <td class="col-extra num">${r.p}</td>
      <td class="col-extra num">${r.gf}</td>
      <td class="col-extra num">${r.gs}</td>
      <td class="col-dr num ${r.dr > 0 ? 'dr-pos' : r.dr < 0 ? 'dr-neg' : ''}">${f.conSegno(r.dr)}</td>
      <td class="cella-forma col-forma">${forma(r.forma)}</td>
    </tr>`).join('');

  return `
    ${nessunaGiocata ? `<div class="nastro nastro-info" style="margin:0 0 12px">
      ${icona('info')}<div>Il campionato non è ancora cominciato: la classifica si popola dalla prima giornata.</div>
    </div>` : ''}
    <div class="tabellone-wrap">
      <div class="scroll-x">
        <table class="classifica">
          <thead>
            <tr>
              <th class="col-pos" scope="col"><span class="solo-sr">Posizione</span>#</th>
              <th class="col-squadra" scope="col">Squadra</th>
              <th class="col-pt" scope="col" title="Punti">PT</th>
              <th class="col-g" scope="col" title="Partite giocate">G</th>
              <th class="col-extra" scope="col" title="Vittorie">V</th>
              <th class="col-extra" scope="col" title="Pareggi">N</th>
              <th class="col-extra" scope="col" title="Sconfitte">P</th>
              <th class="col-extra" scope="col" title="Reti fatte">F</th>
              <th class="col-extra" scope="col" title="Reti subite">S</th>
              <th class="col-dr" scope="col" title="Differenza reti">DR</th>
              <th class="col-forma" scope="col">Forma</th>
            </tr>
          </thead>
          <tbody>${corpo}</tbody>
        </table>
      </div>
      <div class="legenda">
        <span class="legenda-voce">
          <span class="legenda-tacca" style="background:var(--campo)"></span>
          1ª: promossa in Seconda Categoria
        </span>
        <span class="legenda-voce">
          <span class="legenda-tacca" style="background:color-mix(in srgb, var(--campo) 45%, var(--bordo-forte))"></span>
          2ª–7ª: play-off (2ª e 3ª direttamente al secondo turno)
        </span>
        <span class="legenda-voce">In Terza Categoria non sono previste retrocessioni.</span>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Calendario                                                          */
/* ------------------------------------------------------------------ */

function pannelloCalendario(risolte, indice, riposi, giornata, nostra) {
  const dellaGiornata = risolte
    .filter((p) => p.giornata === giornata)
    .sort((a, b) => (a.casa === nostra || a.ospite === nostra ? -1 : 0)
      - (b.casa === nostra || b.ospite === nostra ? -1 : 0));

  const data = dellaGiornata[0]?.data;
  const riposa = riposi?.[giornata];
  const massimo = Math.max(...risolte.map((p) => p.giornata));

  const righe = dellaGiornata.map((p) => {
    const casa = indice.get(p.casa);
    const ospite = indice.get(p.ospite);
    const coinvolge = p.casa === nostra || p.ospite === nostra;

    let centro;
    if (p.stato === 'in-corso') {
      centro = `<span class="rp-esito num" style="color:var(--live)">${p.punteggio[0]}–${p.punteggio[1]}</span>`;
    } else if (p.stato === 'finita') {
      centro = `<span class="rp-esito num">${p.punteggio[0]}–${p.punteggio[1]}</span>`;
    } else if (p.stato === 'attesa-risultato') {
      centro = p.inCampo
        ? `<span class="rp-esito futura num" style="color:var(--live)">${p.minuto}'</span>`
        : '<span class="rp-esito futura">n.d.</span>';
    } else {
      centro = `<span class="rp-esito futura num">${f.esc(p.ora || '15:30')}</span>`;
    }

    return `<div class="riga-partita ${coinvolge ? 'coinvolge' : ''}">
      <div class="rp-casa">
        ${stemma(casa, 'sm')}
        <span class="nome ${p.casa === nostra ? 'grassetto' : ''}">${f.esc(casa?.nome || '—')}</span>
      </div>
      ${centro}
      <div class="rp-ospite">
        ${stemma(ospite, 'sm')}
        <span class="nome ${p.ospite === nostra ? 'grassetto' : ''}">${f.esc(ospite?.nome || '—')}</span>
      </div>
    </div>`;
  }).join('');

  return `<div class="tabellone-wrap">
    <div class="selettore-giornata">
      <button type="button" data-giornata="${giornata - 1}" ${giornata <= 1 ? 'disabled' : ''}
        aria-label="Giornata precedente">${icona('frecciaSx')}</button>
      <div class="titolo">
        ${f.ordinaleF(giornata)} giornata
        <small>${data ? f.esc(f.dataLunga(data)) : ''}${giornata > 15 ? ' · ritorno' : ' · andata'}</small>
      </div>
      <button type="button" data-giornata="${giornata + 1}" ${giornata >= massimo ? 'disabled' : ''}
        aria-label="Giornata successiva">${icona('frecciaDx')}</button>
    </div>
    ${riposa ? `<div class="riposo-riga">Riposa: <strong>${f.esc(indice.get(riposa)?.nome || riposa)}</strong></div>` : ''}
    ${righe || statoVuoto('calendario', 'Nessuna partita', 'Questa giornata non ha incontri in programma.')}
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Statistiche                                                         */
/* ------------------------------------------------------------------ */

function grafico(andamento) {
  if (andamento.length < 2) return '';

  const larghezza = 320; const altezza = 90; const pad = 4;
  const maxPt = Math.max(...andamento.map((a) => a.punti), 1);
  const passoX = (larghezza - pad * 2) / (andamento.length - 1);

  const punti = andamento.map((a, i) => {
    const x = pad + i * passoX;
    const y = altezza - pad - (a.punti / maxPt) * (altezza - pad * 2);
    return [x, y];
  });

  const linea = punti.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${linea} L${punti[punti.length - 1][0].toFixed(1)} ${altezza - pad} L${pad} ${altezza - pad} Z`;
  const [ux, uy] = punti[punti.length - 1];

  return `<svg class="andamento" viewBox="0 0 ${larghezza} ${altezza}" role="img"
      aria-label="Punti accumulati giornata dopo giornata: ${andamento.map((a) => a.punti).join(', ')}">
    <defs>
      <linearGradient id="sfumaturaAndamento" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--marchio)" stop-opacity=".28"/>
        <stop offset="100%" stop-color="var(--marchio)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#sfumaturaAndamento)"/>
    <path d="${linea}" fill="none" stroke="var(--marchio)" stroke-width="2.2"
      stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${ux.toFixed(1)}" cy="${uy.toFixed(1)}" r="3.6" fill="var(--marchio)"
      stroke="var(--carta)" stroke-width="2"/>
  </svg>`;
}

function pannelloStatistiche(righe, risolte, nostra, indice) {
  const s = statistiche(righe, nostra);
  if (!s) {
    return statoVuoto('pallone', 'Ancora nessun dato',
      'Le statistiche compaiono dopo la prima partita di campionato.');
  }

  const r = s.riga;
  const ultima = ultimaGiocata(risolte, nostra);
  const avversariaUltima = ultima
    ? indice.get(ultima.casa === nostra ? ultima.ospite : ultima.casa)
    : null;

  const schede = [
    { valore: r.posizione + 'º', etichetta: 'Posizione in classifica',
      contesto: s.puntiPersiDaVincente === 0 ? 'In testa al girone' : `A ${s.puntiPersiDaVincente} punti dalla vetta` },
    { valore: r.pt, etichetta: 'Punti in ' + r.g + ' partite',
      contesto: `${r.v} vinte · ${r.n} pari · ${r.p} perse` },
    { valore: f.conSegno(r.dr), etichetta: 'Differenza reti',
      contesto: `${r.gf} fatte, ${r.gs} subite` },
    { valore: s.mediaGolFatti.toFixed(1), etichetta: 'Gol fatti a partita',
      contesto: `${s.rangoAttacco}º attacco del girone` },
    { valore: s.mediaGolSubiti.toFixed(1), etichetta: 'Gol subiti a partita',
      contesto: `${s.rangoDifesa}ª difesa del girone` },
    { valore: Math.round(s.percentualeVittorie) + '%', etichetta: 'Partite vinte',
      contesto: s.striscia > 1 ? `Miglior striscia recente: ${s.striscia} vittorie` : 'Nelle ultime cinque' },
  ];

  return `
    <div class="stat-griglia">
      ${schede.map((c) => `<div class="stat">
        <div class="valore num">${f.esc(c.valore)}</div>
        <div class="etichetta">${f.esc(c.etichetta)}</div>
        <div class="contesto">${f.esc(c.contesto)}</div>
      </div>`).join('')}
    </div>

    <div class="titolo-sez"><h2>Andamento punti</h2></div>
    <div class="carta" style="padding:18px">
      ${grafico(r.andamento)}
      <p style="margin:10px 0 0;font-size:12.5px;color:var(--testo-medio)">
        Punti accumulati dalla 1ª alla ${f.ordinaleF(r.ultimaGiornata)} giornata.
      </p>
    </div>

    <div class="titolo-sez"><h2>Rendimento</h2></div>
    <div class="griglia">
      <div class="carta" style="padding:18px">
        <div class="occhiello">In casa · A. Solcia</div>
        <div class="valore num" style="font-family:var(--font-display);font-size:26px;font-weight:800;margin-top:6px">
          ${r.casa.pt} <span style="font-size:14px;color:var(--testo-tenue);font-weight:600">punti</span>
        </div>
        <p style="margin:6px 0 0;font-size:13px;color:var(--testo-medio)">
          ${r.casa.v}V · ${r.casa.n}N · ${r.casa.p}P — ${r.casa.gf} gol fatti, ${r.casa.gs} subiti
        </p>
      </div>
      <div class="carta" style="padding:18px">
        <div class="occhiello">In trasferta</div>
        <div class="valore num" style="font-family:var(--font-display);font-size:26px;font-weight:800;margin-top:6px">
          ${r.trasferta.pt} <span style="font-size:14px;color:var(--testo-tenue);font-weight:600">punti</span>
        </div>
        <p style="margin:6px 0 0;font-size:13px;color:var(--testo-medio)">
          ${r.trasferta.v}V · ${r.trasferta.n}N · ${r.trasferta.p}P — ${r.trasferta.gf} gol fatti, ${r.trasferta.gs} subiti
        </p>
      </div>
    </div>

    ${ultima ? `
      <div class="titolo-sez"><h2>Ultimo risultato</h2></div>
      <div class="carta" style="padding:16px;display:flex;align-items:center;gap:14px">
        ${stemma(avversariaUltima)}
        <div style="flex:1;min-width:0">
          <strong style="font-family:var(--font-display);font-size:15px">
            ${f.esc(indice.get(ultima.casa)?.nome)} ${ultima.punteggio[0]}–${ultima.punteggio[1]} ${f.esc(indice.get(ultima.ospite)?.nome)}
          </strong>
          <div style="font-size:12.5px;color:var(--testo-medio);margin-top:3px">
            ${f.ordinaleF(ultima.giornata)} giornata · ${f.esc(f.dataLunga(ultima.data))}
          </div>
        </div>
      </div>` : ''}

    <p style="margin-top:22px;font-size:12px;color:var(--testo-tenue);line-height:1.6">
      Le posizioni a pari punti sono determinate dagli scontri diretti (classifica avulsa),
      poi dalla differenza reti generale e dalle reti fatte.
    </p>`;
}

/* ------------------------------------------------------------------ */
/* Vista                                                               */
/* ------------------------------------------------------------------ */

export function rendi(stato, ui, adesso) {
  const { righe, risolte } = calcola(stato, adesso);
  const indice = new Map(stato.squadre.map((s) => [s.id, s]));
  const nostra = stato.config.squadraDiCasa;

  const scheda = ui.schedaCalcio || 'classifica';
  const giornata = ui.giornata || giornataCorrente(risolte);
  const prossima = prossimaPartita(risolte, nostra);
  const nostraRiga = righe.find((r) => r.id === nostra);

  const intestazione = `
    <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin:22px 0 18px">
      <div>
        <div class="occhiello">${f.esc(stato.config.campionato)} · ${f.esc(stato.config.girone)}</div>
        <h1 style="font-size:clamp(27px,7vw,38px);margin-top:6px;letter-spacing:-.035em">
          A.S.D. Grezzago 1981
        </h1>
        <p style="margin:6px 0 0;color:var(--testo-medio);font-size:13.5px">
          Stagione ${f.esc(stato.config.stagione)} · ${f.esc(stato.config.federazione)}
        </p>
      </div>
      ${nostraRiga && nostraRiga.g > 0 ? `<div style="margin-left:auto;text-align:right">
        <div class="occhiello">Posizione</div>
        <div style="font-family:var(--font-display);font-size:40px;font-weight:800;letter-spacing:-.05em;line-height:1;color:var(--marchio)">
          ${nostraRiga.posizione}º
        </div>
        <div style="font-size:12.5px;color:var(--testo-medio);margin-top:2px">${nostraRiga.pt} punti</div>
      </div>` : ''}
    </div>`;

  const cartaProssima = prossima
    ? cartaPartita(prossima, indice, { nostra, adesso })
    : `<div class="carta">${statoVuoto('calendario', 'Campionato concluso',
        'Non ci sono altre partite in programma per questa stagione.')}</div>`;

  const contenuto = scheda === 'classifica'
    ? tabellaClassifica(righe, nostra)
    : scheda === 'calendario'
      ? pannelloCalendario(risolte, indice, stato.riposi, giornata, nostra)
      : pannelloStatistiche(righe, risolte, nostra, indice);

  return `<div class="sezione entra">
    ${intestazione}
    ${cartaProssima}

    <div style="margin:26px 0 16px">
      <div class="segmenti" role="tablist" aria-label="Sezioni del campionato">
        ${[['classifica', 'Classifica'], ['calendario', 'Calendario'], ['statistiche', 'Statistiche']]
          .map(([chiave, etichetta]) => `<button class="segmento" role="tab" type="button"
            data-scheda="${chiave}" aria-selected="${scheda === chiave}">${etichetta}</button>`).join('')}
      </div>
    </div>

    ${contenuto}

    ${cartaCoppa(stato.coppa, adesso)}

    <p style="margin-top:22px;font-size:12px;color:var(--testo-tenue);line-height:1.6">
      Calendario, campi e orari dal calendario ufficiale pubblicato da
      <a href="${f.esc(stato.config.fonte.url)}" target="_blank" rel="noopener"
        style="color:var(--testo-medio)">${f.esc(stato.config.fonte.nome)}</a>.
      ${stato.config.risultati
        ? `Risultati aggiornati al ${f.esc(stato.config.risultati.documento)}.`
        : 'Nessun risultato ancora pubblicato dal Comitato.'}
    </p>
  </div>`;
}
