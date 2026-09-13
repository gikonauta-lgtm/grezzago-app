/** Vista «Eventi»: cosa succede a Grezzago, più gli avvisi dal Comune. */

import { icona } from './icone.js';
import * as f from './formato.js';
import { cardEvento, statoVuoto } from './componenti.js';

/** Eventi non ancora conclusi, in ordine cronologico. */
export function inArrivo(eventi, adesso) {
  const limite = new Date(adesso);
  limite.setHours(0, 0, 0, 0);
  return eventi
    .filter((e) => !e.soloAvviso)
    .filter((e) => new Date(e.fine || e.inizio) >= limite)
    .sort((a, b) => new Date(a.inizio) - new Date(b.inizio));
}

function avvisi(eventi) {
  return eventi
    .filter((e) => e.soloAvviso)
    .sort((a, b) => new Date(b.pubblicato || b.inizio) - new Date(a.pubblicato || a.inizio));
}

function raggruppaPerMese(elenco) {
  const gruppi = new Map();
  for (const e of elenco) {
    const chiave = f.meseAnno(e.inizio);
    if (!gruppi.has(chiave)) gruppi.set(chiave, []);
    gruppi.get(chiave).push(e);
  }
  return gruppi;
}

/* ------------------------------------------------------------------ */

export function rendi(stato, ui, adesso) {
  const scheda = ui.schedaEventi || 'prossimi';
  const filtro = ui.filtroCategoria || null;

  const prossimi = inArrivo(stato.eventi, adesso);
  const listaAvvisi = avvisi(stato.eventi);

  const categoriePresenti = [...new Set(prossimi.map((e) => e.categoria))]
    .filter((c) => stato.categorie[c]);

  const filtrati = filtro ? prossimi.filter((e) => e.categoria === filtro) : prossimi;
  const gruppi = raggruppaPerMese(filtrati);

  const corpoProssimi = filtrati.length
    ? [...gruppi.entries()].map(([meseNome, elenco]) => `
        <div class="mese-testa">${f.esc(meseNome)}</div>
        <div class="pila">
          ${elenco.map((e) => cardEvento(e, stato.categorie, adesso)).join('')}
        </div>`).join('')
    : `<div class="carta" style="margin-top:18px">${statoVuoto(
        'calendario',
        filtro ? 'Nessun evento in questa categoria' : 'Nessun evento in programma',
        filtro
          ? 'Prova a togliere il filtro per vedere tutto quello che succede in paese.'
          : 'Appena il Comune o le associazioni pubblicano una nuova iniziativa, la trovi qui.'
      )}</div>`;

  const corpoAvvisi = listaAvvisi.length
    ? `<div class="pila" style="margin-top:18px">
        ${listaAvvisi.map((e) => cardEvento(e, stato.categorie, adesso)).join('')}
      </div>`
    : `<div class="carta" style="margin-top:18px">${statoVuoto(
        'info', 'Nessun avviso',
        stato.feedAttivo
          ? 'Al momento il Comune non ha pubblicato comunicazioni recenti.'
          : 'Il collegamento al sito del Comune non è ancora attivo: vedi il README per configurarlo.'
      )}</div>`;

  return `<div class="sezione entra">
    <div style="margin:22px 0 18px">
      <div class="occhiello">Cosa succede in paese</div>
      <h1 style="font-size:clamp(29px,8vw,42px);margin-top:6px;letter-spacing:-.04em">Eventi a Grezzago</h1>
      <p style="margin:8px 0 0;color:var(--testo-medio);font-size:14.5px;max-width:52ch">
        Feste, sport, cultura e iniziative. ${stato.feedAttivo
          ? 'Le comunicazioni ufficiali arrivano direttamente dal sito del Comune.'
          : 'Le iniziative sono curate dal Comune e dalle associazioni del paese.'}
      </p>
    </div>

    <div class="segmenti" role="tablist" aria-label="Tipo di contenuto">
      <button class="segmento" role="tab" type="button" data-scheda-eventi="prossimi"
        aria-selected="${scheda === 'prossimi'}">In programma${prossimi.length ? ` (${prossimi.length})` : ''}</button>
      <button class="segmento" role="tab" type="button" data-scheda-eventi="avvisi"
        aria-selected="${scheda === 'avvisi'}">Avvisi dal Comune${listaAvvisi.length ? ` (${listaAvvisi.length})` : ''}</button>
    </div>

    ${scheda === 'prossimi' ? `
      ${categoriePresenti.length > 1 ? `
        <div class="chips" style="margin-top:16px">
          <button class="chip" type="button" data-categoria="" aria-pressed="${!filtro}">Tutti</button>
          ${categoriePresenti.map((c) => `<button class="chip" type="button" data-categoria="${f.esc(c)}"
            aria-pressed="${filtro === c}">${f.esc(stato.categorie[c].etichetta)}</button>`).join('')}
        </div>` : ''}
      ${corpoProssimi}
    ` : corpoAvvisi}

    <div class="carta" style="margin-top:28px;padding:18px;display:flex;gap:14px;align-items:flex-start">
      ${icona('info', { classe: '' })}
      <div style="font-size:13.5px;line-height:1.55;color:var(--testo-medio)">
        <strong style="color:var(--testo)">Organizzi qualcosa a Grezzago?</strong><br>
        Scrivi al Comune per farlo comparire qui:
        <a href="https://www.comune.grezzago.mi.it/" target="_blank" rel="noopener"
          style="color:var(--marchio);font-weight:600">comune.grezzago.mi.it</a>
      </div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Dettaglio evento (foglio modale)                                    */
/* ------------------------------------------------------------------ */

export function dettaglio(evento, categorie, adesso) {
  const cat = categorie?.[evento.categoria];
  const inizio = new Date(evento.inizio);
  const mappa = evento.indirizzo || evento.luogo
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [evento.luogo, evento.indirizzo].filter(Boolean).join(', '))}`
    : null;

  const riga = (nomeIcona, etichetta, valore) => `<div class="foglio-riga">
    ${icona(nomeIcona)}
    <div><div class="etichetta">${f.esc(etichetta)}</div>${valore}</div>
  </div>`;

  return `
    <div class="maniglia"></div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      ${cat ? `<span class="tag-cat cat-${f.esc(cat.colore)}">${f.esc(cat.etichetta)}</span>` : ''}
      ${evento.verificato ? '<span class="pill campo">fonte ufficiale</span>' : ''}
      ${evento.demo ? '<span class="pill oro">da confermare</span>' : ''}
      <button class="icona-btn" type="button" data-chiudi style="margin-left:auto"
        aria-label="Chiudi">${icona('chiudi')}</button>
    </div>

    <h2>${f.esc(evento.titolo)}</h2>
    ${evento.sottotitolo ? `<p style="margin:8px 0 0;color:var(--testo-medio);font-size:14.5px">${f.esc(evento.sottotitolo)}</p>` : ''}

    <div style="margin-top:18px">
      ${riga('calendario', 'Quando',
        `${f.esc(f.dataLunga(inizio, adesso))}<div style="color:var(--testo-medio);font-size:13px;margin-top:2px">${
          f.esc(evento.orarioNota || (evento.soloAvviso ? f.quando(inizio, adesso) : `ore ${f.ora(inizio)}`))
        }</div>`)}

      ${evento.luogo ? riga('luogo', 'Dove',
        `${f.esc(evento.luogo)}${evento.indirizzo
          ? `<div style="color:var(--testo-medio);font-size:13px;margin-top:2px">${f.esc(evento.indirizzo)}</div>` : ''}`) : ''}

      ${evento.organizzatore ? riga('info', 'Chi organizza', f.esc(evento.organizzatore)) : ''}

      ${evento.gratuito ? riga('spunta', 'Ingresso', 'Gratuito') : ''}
    </div>

    ${evento.descrizione ? `<p style="margin:18px 0 0;font-size:14.5px;line-height:1.6;color:var(--testo-medio);text-wrap:pretty">
      ${f.esc(evento.descrizione)}</p>` : ''}

    <div class="foglio-azioni">
      ${!evento.soloAvviso ? `<button class="btn primario" type="button" data-ics="${f.esc(evento.id)}">
        ${icona('calendarioPiu')} Aggiungi al calendario</button>` : ''}
      <button class="btn" type="button" data-condividi="${f.esc(evento.id)}">
        ${icona('condividi')} Condividi</button>
      ${mappa ? `<a class="btn" href="${f.esc(mappa)}" target="_blank" rel="noopener">
        ${icona('luogo')} Apri nelle mappe</a>` : ''}
      ${evento.link ? `<a class="btn" href="${f.esc(evento.link)}" target="_blank" rel="noopener">
        ${icona('esterno')} ${f.esc(evento.linkEtichetta || 'Maggiori informazioni')}</a>` : ''}
    </div>

    ${evento.fonte ? `<p style="margin:16px 0 0;font-size:11.5px;color:var(--testo-tenue)">
      Fonte: ${f.esc(evento.fonte)}</p>` : ''}`;
}
