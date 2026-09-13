/**
 * La Coppa Lombardia: un girone da quattro squadre che corre in parallelo al
 * campionato.
 *
 * La classifica è ricalcolata dai risultati con lo stesso motore del
 * campionato. Nel file dei dati c'è anche `classificaUfficiale`, copiata dal
 * comunicato: serve a controllare che i due conti coincidano — se ne diverge
 * uno, lo dice scripts/verifica-classifica.mjs.
 */

import { icona } from './icone.js';
import * as f from './formato.js';
import { stemma } from './componenti.js';
import { calcolaClassifica, risolviPartite } from './classifica.js';

export function cartaCoppa(coppa, adesso, nostra = 'grezzago') {
  if (!coppa?.squadre?.length) return '';

  const indice = new Map(coppa.squadre.map((s) => [s.id, s]));

  const righe = calcolaClassifica({
    squadre: coppa.squadre,
    partite: coppa.partite,
    risultati: coppa.risultati,
    // Nella coppa non ci sono zone da colorare: si passa il turno, non si sale.
    config: { puntiVittoria: 3, puntiPareggio: 1, zone: { promozione: 0, playoff: 0 } },
    adesso,
  });

  const giocate = risolviPartite({ partite: coppa.partite, risultati: coppa.risultati, adesso })
    .filter((p) => p.stato === 'finita')
    .sort((a, b) => a.data.localeCompare(b.data));

  const etichettaGiornata = giocate.length
    ? `${giocate[0].giornata}ª giornata · ${[...new Set(giocate.map((p) => f.dataBreve(p.data)))].join(' e ')}`
    : null;

  const rigaClassifica = (r) => `
    <tr class="${r.id === nostra ? 'nostra' : ''}">
      <td class="col-pos"><span class="cella-pos num">${r.posizione}</span></td>
      <td class="col-squadra">
        <div class="cella-squadra">
          ${stemma(r.squadra, 'sm')}
          <span class="nome">${f.esc(r.squadra.nome)}</span>
        </div>
      </td>
      <td class="col-g num">${r.g}</td>
      <td class="col-dr num ${r.dr > 0 ? 'dr-pos' : r.dr < 0 ? 'dr-neg' : ''}">${f.conSegno(r.dr)}</td>
      <td class="col-pt num">${r.pt}</td>
    </tr>`;

  const rigaPartita = (p) => `
    <div class="riga-partita ${p.casa === nostra || p.ospite === nostra ? 'coinvolge' : ''}">
      <div class="rp-casa">
        ${stemma(indice.get(p.casa), 'sm')}
        <span class="nome ${p.casa === nostra ? 'grassetto' : ''}">${f.esc(indice.get(p.casa)?.nome ?? '—')}</span>
      </div>
      <span class="rp-esito num" title="${f.esc(p.nota || f.dataLunga(p.data))}">${p.punteggio[0]}–${p.punteggio[1]}</span>
      <div class="rp-ospite">
        ${stemma(indice.get(p.ospite), 'sm')}
        <span class="nome ${p.ospite === nostra ? 'grassetto' : ''}">${f.esc(indice.get(p.ospite)?.nome ?? '—')}</span>
      </div>
    </div>`;

  return `
    <div class="titolo-sez"><h2>${f.esc(coppa.competizione)}</h2></div>
    <div class="tabellone-wrap">
      <div class="selettore-giornata" style="gap:10px">
        <span class="pill oro">Girone ${f.esc(String(coppa.girone))}</span>
        <span style="flex:1;font-size:12.5px;color:var(--testo-medio);text-align:left;line-height:1.4">
          ${f.esc(coppa.premio || '')}
        </span>
      </div>

      <table class="classifica">
        <thead>
          <tr>
            <th class="col-pos" scope="col">#</th>
            <th class="col-squadra" scope="col">Squadra</th>
            <th class="col-g" scope="col" title="Partite giocate">G</th>
            <th class="col-dr" scope="col" title="Differenza reti">DR</th>
            <th class="col-pt" scope="col" title="Punti">PT</th>
          </tr>
        </thead>
        <tbody>${righe.map(rigaClassifica).join('')}</tbody>
      </table>

      ${etichettaGiornata ? `<div class="riposo-riga">${f.esc(etichettaGiornata)}</div>` : ''}
      ${giocate.map(rigaPartita).join('')}

      ${coppa.prossimeGare ? `<div class="legenda">
        <span class="legenda-voce">${icona('info', { dim: 14 })} ${f.esc(coppa.prossimeGare)}</span>
      </div>` : ''}
    </div>`;
}
