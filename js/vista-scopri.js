/** Vista «Scopri»: il paese, cosa vedere, come arrivare, numeri utili. */

import { icona } from './icone.js';
import * as f from './formato.js';

const ICONA_PER_TIPO = {
  chiesa: 'chiesa', palazzo: 'palazzo', campo: 'campo', municipio: 'municipio',
  fiume: 'fiume', bici: 'bici', auto: 'auto', metro: 'metro',
};

const cercaSuMappe = (query) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/* ------------------------------------------------------------------ */
/* Mappa schematica dei dintorni                                       */
/* ------------------------------------------------------------------ */

/**
 * Mappa illustrata, non cartografica: serve a far capire dov'è Grezzago.
 * L'orientamento è quello reale (l'Adda a est, la A4 che taglia da ovest a
 * est, i comuni confinanti al posto giusto) ma non le proporzioni esatte.
 * Sono segnati solo i cinque comuni con cui Grezzago confina davvero.
 * Disegnata inline: funziona offline e non dipende da nessun servizio di tile.
 */
function mappaDintorni() {
  const luoghi = [
    { x: 329, y: 272, nome: 'GREZZAGO', principale: true },
    { x: 450, y: 185, nome: 'Trezzo sull\'Adda' },
    { x: 585, y: 342, nome: 'Vaprio d\'Adda' },
    { x: 272, y: 402, nome: 'Pozzo d\'Adda' },
    { x: 180, y: 304, nome: 'Trezzano Rosa' },
    { x: 208, y: 141, nome: 'Busnago' },
  ];

  const punti = luoghi.map((l) => {
    if (l.principale) {
      return `<g>
        <circle cx="${l.x}" cy="${l.y}" r="26" fill="var(--marchio)" opacity=".12">
          <animate attributeName="r" values="20;30;20" dur="3.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".18;.04;.18" dur="3.2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${l.x}" cy="${l.y}" r="9" fill="var(--marchio)" stroke="var(--carta)" stroke-width="3"/>
        <text x="${l.x}" y="${l.y - 26}" text-anchor="middle"
          font-family="Archivo, sans-serif" font-size="20" font-weight="800"
          letter-spacing="1" fill="var(--marchio)">${l.nome}</text>
      </g>`;
    }
    return `<g>
      <circle cx="${l.x}" cy="${l.y}" r="4.5" fill="var(--testo-tenue)"/>
      <text x="${l.x}" y="${l.y - 12}" text-anchor="middle"
        font-family="Inter, sans-serif" font-size="12.5" font-weight="600"
        fill="var(--testo-medio)">${l.nome}</text>
    </g>`;
  }).join('');

  return `<div class="mappa">
    <svg viewBox="0 0 800 500" role="img"
      aria-label="Mappa schematica: Grezzago al centro, il fiume Adda a est, l'autostrada A4 da ovest a est, e i cinque comuni confinanti Trezzo sull'Adda, Vaprio d'Adda, Pozzo d'Adda, Trezzano Rosa e Busnago.">

      <rect width="800" height="500" fill="var(--carta-alt)"/>

      <!-- reticolo dei campi -->
      <g stroke="var(--bordo)" stroke-width="1" opacity=".55">
        ${Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${(i + 1) * 50}" x2="800" y2="${(i + 1) * 50}"/>`).join('')}
        ${Array.from({ length: 15 }, (_, i) => `<line x1="${(i + 1) * 50}" y1="0" x2="${(i + 1) * 50}" y2="500"/>`).join('')}
      </g>

      <!-- il fiume Adda -->
      <path d="M470 -10 C 525 110, 470 180, 520 250 C 572 322, 560 400, 600 510"
        fill="none" stroke="var(--fiume)" stroke-width="16" opacity=".28" stroke-linecap="round"/>
      <path d="M470 -10 C 525 110, 470 180, 520 250 C 572 322, 560 400, 600 510"
        fill="none" stroke="var(--fiume)" stroke-width="4" opacity=".7" stroke-linecap="round"/>
      <text x="640" y="240" font-family="Inter, sans-serif" font-size="13" font-weight="700"
        fill="var(--fiume)" transform="rotate(72 640 240)" letter-spacing="2">FIUME ADDA</text>

      <!-- autostrada A4 -->
      <line x1="-10" y1="308" x2="810" y2="232" stroke="var(--testo-tenue)"
        stroke-width="7" opacity=".33"/>
      <line x1="-10" y1="308" x2="810" y2="232" stroke="var(--testo-tenue)"
        stroke-width="2" stroke-dasharray="12 9" opacity=".85"/>
      <text x="52" y="330" font-family="Inter, sans-serif" font-size="12" font-weight="700"
        fill="var(--testo-tenue)" letter-spacing="1.4">A4 MILANO–VENEZIA</text>

      ${punti}

      <!-- indicazioni ai margini -->
      <g font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="var(--testo-tenue)">
        <text x="30" y="462">← MILANO 27 km</text>
        <text x="770" y="60" text-anchor="end">BERGAMO 25 km →</text>
        <text x="400" y="484" text-anchor="middle" font-size="10.5" font-weight="600"
          letter-spacing="1" opacity=".8">GREZZAGO E I CINQUE COMUNI CONFINANTI</text>
      </g>
    </svg>
  </div>`;
}

/* ------------------------------------------------------------------ */

function schedaLuogo(l) {
  return `<a class="luogo" href="${f.esc(cercaSuMappe(l.cerca))}" target="_blank" rel="noopener">
    <span class="luogo-icona">${icona(ICONA_PER_TIPO[l.icona] || 'luogo')}</span>
    <h3>${f.esc(l.nome)}</h3>
    <div class="tipo">${f.esc(l.tipo)}${l.distanzaKm > 0 ? ` · ${l.distanzaKm} km` : ' · in paese'}</div>
    <p>${f.esc(l.descrizione)}</p>
    <span class="luogo-piede">${icona('luogo')} Apri nelle mappe</span>
  </a>`;
}

function schedaArrivo(a) {
  return `<div class="arrivo">
    <span class="arrivo-icona">${icona(ICONA_PER_TIPO[a.icona] || 'luogo')}</span>
    <div>
      <h3>${f.esc(a.mezzo)}</h3>
      <div class="tempo">${f.esc(a.tempo)}</div>
      <p>${f.esc(a.dettaglio)}</p>
      ${a.nota ? `<p class="nota">${f.esc(a.nota)}</p>` : ''}
    </div>
  </div>`;
}

function schedaNumero(n) {
  const azione = n.telefono
    ? `<a class="btn" href="tel:${f.esc(n.telefono.replace(/\s/g, ''))}">${icona('telefono')} ${f.esc(n.telefonoVisibile || n.telefono)}</a>`
    : n.sito
      ? `<a class="btn" href="${f.esc(n.sito)}" target="_blank" rel="noopener">${icona('esterno')} Apri</a>`
      : '';

  return `<div class="numero-utile">
    <div class="corpo">
      <h3>${f.esc(n.nome)}</h3>
      <p>${f.esc(n.dettaglio)}</p>
      ${n.pec ? `<p style="font-size:12px;color:var(--testo-tenue);margin-top:3px">${f.esc(n.pec)}</p>` : ''}
    </div>
    ${azione}
  </div>`;
}

/* ------------------------------------------------------------------ */

export function rendi(stato) {
  const { paese, luoghi, comeArrivare, numeriUtili } = stato.luoghi;
  const inEvidenza = luoghi.filter((l) => l.evidenza);
  const altri = luoghi.filter((l) => !l.evidenza);

  return `<div class="sezione entra">
    <div style="margin:22px 0 18px">
      <div class="occhiello">${f.esc(paese.provincia)} · ${f.esc(paese.regione)}</div>
      <h1 style="font-size:clamp(29px,8vw,44px);margin-top:6px;letter-spacing:-.04em">Scopri Grezzago</h1>
      <p style="margin:10px 0 0;color:var(--testo-medio);font-size:15px;max-width:60ch;line-height:1.6;text-wrap:pretty">
        ${f.esc(paese.presentazione)}
      </p>
    </div>

    <div class="stat-griglia" style="margin-bottom:26px">
      <div class="stat">
        <div class="valore num">${paese.abitanti.toLocaleString('it-IT')}</div>
        <div class="etichetta">Abitanti</div>
      </div>
      <div class="stat">
        <div class="valore num">${String(paese.superficieKmq).replace('.', ',')}</div>
        <div class="etichetta">Chilometri quadrati</div>
      </div>
      <div class="stat">
        <div class="valore num">${paese.altitudineM}</div>
        <div class="etichetta">Metri sul livello del mare</div>
      </div>
      <div class="stat">
        <div class="valore">11 nov</div>
        <div class="etichetta">San Martino, il patrono</div>
      </div>
    </div>

    ${mappaDintorni()}

    <div class="titolo-sez"><h2>Da vedere</h2></div>
    <div class="griglia">${inEvidenza.map(schedaLuogo).join('')}</div>

    ${altri.length ? `
      <div class="titolo-sez"><h2>Altri luoghi del paese</h2></div>
      <div class="griglia">${altri.map(schedaLuogo).join('')}</div>` : ''}

    <div class="titolo-sez"><h2>Come arrivare</h2></div>
    <div class="pila">${comeArrivare.map(schedaArrivo).join('')}</div>

    <div class="titolo-sez"><h2>Numeri utili</h2></div>
    <div class="pila">${numeriUtili.map(schedaNumero).join('')}</div>

    <div class="carta" style="margin-top:26px;padding:18px">
      <div class="occhiello">Confina con</div>
      <p style="margin:8px 0 0;font-size:14px;color:var(--testo-medio);line-height:1.6">
        ${f.esc(paese.confina.join(' · '))}
      </p>
      <p style="margin:12px 0 0;font-size:12px;color:var(--testo-tenue)">
        Gli abitanti si chiamano <strong>${f.esc(paese.demonimo)}</strong>.
        CAP ${f.esc(paese.cap)}. Dati aggiornati al ${f.esc(f.dataBreve(paese.abitantiAl))}.
      </p>
    </div>
  </div>`;
}
