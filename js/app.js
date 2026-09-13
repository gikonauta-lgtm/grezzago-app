/** Avvio, instradamento e ciclo di aggiornamento dell'app. */

import { caricaTutto, aggiungiFeed, adesso, archivio, CHIAVI } from './dati.js';
import { icona } from './icone.js';
import * as f from './formato.js';
import { contenutoCountdown } from './componenti.js';
import { scaricaIcs, condividi } from './ics.js';
import { calcola } from './vista-calcio.js';
import * as home from './vista-home.js';
import * as calcio from './vista-calcio.js';
import * as eventi from './vista-eventi.js';
import * as scopri from './vista-scopri.js';

const VISTE = {
  oggi: { titolo: 'Oggi', icona: 'casa', rendi: home.rendi },
  calcio: { titolo: 'Calcio', icona: 'pallone', rendi: calcio.rendi },
  eventi: { titolo: 'Eventi', icona: 'calendario', rendi: eventi.rendi },
  scopri: { titolo: 'Scopri', icona: 'bussola', rendi: scopri.rendi },
};

let stato = null;
const ui = { vista: 'oggi', schedaCalcio: 'classifica', schedaEventi: 'prossimi', giornata: null, filtroCategoria: null };
let firmaLive = '';

const $ = (sel, radice = document) => radice.querySelector(sel);

/* ------------------------------------------------------------------ */
/* Tema                                                                */
/* ------------------------------------------------------------------ */

function applicaTema(tema) {
  if (tema === 'auto') document.documentElement.removeAttribute('data-tema');
  else document.documentElement.setAttribute('data-tema', tema);

  const meta = $('meta[name="theme-color"]');
  if (meta) {
    const scuro = tema === 'scuro'
      || (tema === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    meta.setAttribute('content', scuro ? '#0c0e12' : '#faf8f5');
  }
}

function alternaTema() {
  const attuale = archivio.leggi(CHIAVI.tema, 'auto');
  const prossimo = attuale === 'auto'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'chiaro' : 'scuro')
    : attuale === 'scuro' ? 'chiaro' : 'scuro';
  archivio.scrivi(CHIAVI.tema, prossimo);
  applicaTema(prossimo);
  disegnaBarra();
}

/* ------------------------------------------------------------------ */
/* Guscio: barra e navigazione                                         */
/* ------------------------------------------------------------------ */

function scudo() {
  return `<svg class="marchio-scudo" viewBox="0 0 30 34" aria-hidden="true">
    <path d="M15 1 28 5v13c0 8-6.2 13-13 15C8.2 31 2 26 2 18V5z"
      fill="var(--marchio)"/>
    <path d="M15 1 28 5v13c0 8-6.2 13-13 15C8.2 31 2 26 2 18V5z"
      fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.2"/>
    <text x="15" y="22.5" text-anchor="middle" font-family="Archivo, sans-serif"
      font-size="15" font-weight="800" fill="#fff">G</text>
  </svg>`;
}

function disegnaBarra() {
  const tema = archivio.leggi(CHIAVI.tema, 'auto');
  const scuroAttivo = tema === 'scuro'
    || (tema === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);

  $('#barra').innerHTML = `<div class="barra-interna">
    <a class="marchio" href="#/oggi">
      ${scudo()}
      <span class="marchio-testo">Grezzago<small>App del paese</small></span>
    </a>
    <nav class="nav solo-desktop" aria-label="Sezioni principali">${vociNav()}</nav>
    <div class="barra-azioni">
      <button class="icona-btn" type="button" data-tema
        aria-label="${scuroAttivo ? 'Passa al tema chiaro' : 'Passa al tema scuro'}"
        title="${scuroAttivo ? 'Tema chiaro' : 'Tema scuro'}">
        ${icona(scuroAttivo ? 'sole' : 'luna')}
      </button>
    </div>
  </div>`;
}

function vociNav() {
  return Object.entries(VISTE).map(([chiave, v]) => `
    <a class="nav-voce" href="#/${chiave}" ${ui.vista === chiave ? 'aria-current="page"' : ''}>
      ${icona(v.icona)}
      <span>${v.titolo}</span>
      <span class="nav-punto"></span>
    </a>`).join('');
}

function disegnaNav() {
  $('#nav').innerHTML = vociNav();
  const desktop = $('.nav.solo-desktop');
  if (desktop) desktop.innerHTML = vociNav();
}

/* ------------------------------------------------------------------ */
/* Instradamento                                                       */
/* ------------------------------------------------------------------ */

function leggiRotta() {
  const grezza = (location.hash || '#/oggi').replace(/^#\/?/, '').split('/')[0];
  return VISTE[grezza] ? grezza : 'oggi';
}

function disegna({ mantieniScorrimento = false } = {}) {
  if (!stato) return;

  const contenitore = $('#app');
  const scorrimento = window.scrollY;

  const vista = VISTE[ui.vista];
  document.title = ui.vista === 'oggi'
    ? 'Grezzago — l\'app del paese'
    : `${vista.titolo} — Grezzago`;

  contenitore.innerHTML = vista.rendi(stato, ui, adesso());

  disegnaNav();
  aggiornaCountdown();

  if (mantieniScorrimento) window.scrollTo(0, scorrimento);
  else if (!location.hash.includes('#foglio')) window.scrollTo(0, 0);
}

function vaiA(vista) {
  if (ui.vista === vista) return;
  ui.vista = vista;
  ui.giornata = null;
  disegna();
}

/* ------------------------------------------------------------------ */
/* Aggiornamento continuo                                              */
/* ------------------------------------------------------------------ */

function aggiornaCountdown() {
  const ora = adesso();
  document.querySelectorAll('[data-countdown]').forEach((el) => {
    el.innerHTML = contenutoCountdown(el.dataset.countdown, ora);
  });
}

/**
 * Firma dello stato "vivo": se cambia (un minuto in più, un gol, una partita
 * che finisce) la vista viene ridisegnata mantenendo la posizione di lettura.
 */
function calcolaFirmaLive() {
  if (!stato) return '';
  const { risolte } = calcola(stato, adesso());
  return risolte
    .filter((p) => p.stato === 'in-corso' || p.stato === 'attesa-risultato')
    .map((p) => `${p.id}:${p.minuto ?? ''}:${p.punteggio?.join('-') ?? ''}`)
    .join('|');
}

function battito() {
  aggiornaCountdown();

  const firma = calcolaFirmaLive();
  if (firma !== firmaLive) {
    firmaLive = firma;
    disegna({ mantieniScorrimento: true });
  }
}

/* ------------------------------------------------------------------ */
/* Foglio modale                                                       */
/* ------------------------------------------------------------------ */

let chiudiFoglioCorrente = null;

function apriFoglio(html) {
  chiudiFoglio();

  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(velo);
  document.body.style.overflow = 'hidden';

  const chiudi = () => {
    velo.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', suTasto);
    chiudiFoglioCorrente = null;
  };
  const suTasto = (e) => { if (e.key === 'Escape') chiudi(); };

  velo.addEventListener('click', (e) => { if (e.target === velo) chiudi(); });
  document.addEventListener('keydown', suTasto);
  chiudiFoglioCorrente = chiudi;

  velo.querySelector('.foglio')?.focus?.();
}

function chiudiFoglio() {
  if (chiudiFoglioCorrente) chiudiFoglioCorrente();
}

function apriEvento(id) {
  const evento = stato.eventi.find((e) => e.id === id);
  if (!evento) return;
  apriFoglio(eventi.dettaglio(evento, stato.categorie, adesso()));
}

/* ------------------------------------------------------------------ */
/* Interazioni                                                         */
/* ------------------------------------------------------------------ */

function collegaEventi() {
  document.addEventListener('click', async (e) => {
    const bersaglio = (sel) => e.target.closest(sel);

    if (bersaglio('[data-tema]')) { alternaTema(); return; }
    if (bersaglio('[data-chiudi]')) { chiudiFoglio(); return; }

    const scheda = bersaglio('[data-scheda]');
    if (scheda) {
      ui.schedaCalcio = scheda.dataset.scheda;
      if (ui.schedaCalcio !== 'calendario') ui.giornata = null;
      disegna({ mantieniScorrimento: true });
      return;
    }

    const schedaEventi = bersaglio('[data-scheda-eventi]');
    if (schedaEventi) {
      ui.schedaEventi = schedaEventi.dataset.schedaEventi;
      disegna({ mantieniScorrimento: true });
      return;
    }

    const categoria = bersaglio('[data-categoria]');
    if (categoria) {
      ui.filtroCategoria = categoria.dataset.categoria || null;
      disegna({ mantieniScorrimento: true });
      return;
    }

    const giornata = bersaglio('[data-giornata]');
    if (giornata && !giornata.disabled) {
      ui.giornata = Number(giornata.dataset.giornata);
      disegna({ mantieniScorrimento: true });
      return;
    }

    const carta = bersaglio('[data-evento]');
    if (carta) { apriEvento(carta.dataset.evento); return; }

    const ics = bersaglio('[data-ics]');
    if (ics) {
      const evento = stato.eventi.find((x) => x.id === ics.dataset.ics);
      if (evento) scaricaIcs(evento);
      return;
    }

    const condivisione = bersaglio('[data-condividi]');
    if (condivisione) {
      const evento = stato.eventi.find((x) => x.id === condivisione.dataset.condividi);
      if (!evento) return;
      const esito = await condividi({
        titolo: evento.titolo,
        testo: `${evento.titolo} — ${f.dataLunga(evento.inizio)}, Grezzago`,
        url: `${location.origin}${location.pathname}#/eventi`,
      });
      if (esito === 'copiato') {
        condivisione.innerHTML = `${icona('spunta')} Link copiato`;
        setTimeout(() => { condivisione.innerHTML = `${icona('condividi')} Condividi`; }, 2200);
      }
      return;
    }
  });

  window.addEventListener('hashchange', () => vaiA(leggiRotta()));

  window.addEventListener('scroll', () => {
    $('#barra')?.classList.toggle('staccata', window.scrollY > 8);
  }, { passive: true });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (archivio.leggi(CHIAVI.tema, 'auto') === 'auto') {
      applicaTema('auto');
      disegnaBarra();
    }
  });
}

/* ------------------------------------------------------------------ */
/* Avvio                                                               */
/* ------------------------------------------------------------------ */

async function avvia() {
  applicaTema(archivio.leggi(CHIAVI.tema, 'auto'));
  disegnaBarra();
  collegaEventi();

  try {
    // Prima i dati locali: l'app deve comparire subito.
    stato = await caricaTutto({ conFeed: false });
  } catch (errore) {
    $('#app').innerHTML = `<div class="sezione"><div class="carta" style="margin-top:30px;padding:26px">
      <h2 style="font-size:19px">Non riesco a caricare i dati</h2>
      <p style="color:var(--testo-medio);font-size:14px;margin-top:8px;line-height:1.55">
        L'app va servita da un server web, non aperta come file. Dalla cartella del progetto:
      </p>
      <pre style="background:var(--carta-alt);padding:12px;border-radius:10px;font-size:12.5px;overflow-x:auto;margin-top:10px"><code>node scripts/server.mjs</code></pre>
      <p style="color:var(--testo-tenue);font-size:12px;margin-top:10px">${f.esc(errore.message)}</p>
    </div></div>`;
    return;
  }

  ui.vista = leggiRotta();
  disegna();
  firmaLive = calcolaFirmaLive();

  setInterval(battito, 1000);

  // Il feed del Comune arriva quando arriva, senza far aspettare nessuno.
  aggiungiFeed(stato).then((novita) => {
    if (novita) disegna({ mantieniScorrimento: true });
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline non disponibile */ });
  }
}

avvia();
