/** Icone SVG inline: nessuna dipendenza esterna, colore ereditato da currentColor. */

const TRATTI = {
  casa: '<path d="M3 10.2 12 3l9 7.2"/><path d="M5 9.5V20a1 1 0 0 0 1 1h3.5v-5.5h5V21H18a1 1 0 0 0 1-1V9.5"/>',
  pallone: '<circle cx="12" cy="12" r="9"/><path d="m12 7.2 4.2 3-1.6 4.9H9.4L7.8 10.2z"/><path d="M12 3v4.2M4.1 9.6l3.7.6M19.9 9.6l-3.7.6M7.6 20.2l1.8-5.1M16.4 20.2l-1.8-5.1"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  bussola: '<circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2 5.2-5.2 2 2-5.2z"/>',
  luogo: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  orologio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
  frecciaDx: '<path d="m9 5 7 7-7 7"/>',
  frecciaSx: '<path d="m15 5-7 7 7 7"/>',
  frecciaSu: '<path d="m5 15 7-7 7 7"/>',
  chiudi: '<path d="m6 6 12 12M18 6 6 18"/>',
  condividi: '<path d="M12 3v13"/><path d="m8 7 4-4 4 4"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  calendarioPiu: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
  esterno: '<path d="M14 4h6v6"/><path d="M20 4 10.5 13.5"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/>',
  avviso: '<path d="M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3l-7.7-13.5a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/>',
  sole: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2 6 6M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/>',
  luna: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  telefono: '<path d="M6.4 3.5h3l1.6 4-2 1.3a12 12 0 0 0 5.2 5.2l1.3-2 4 1.6v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.4 5.7a2 2 0 0 1 2-2.2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  globo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
  ricarica: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4h-4"/>',
  aggiungi: '<path d="M12 5v14M5 12h14"/>',
  matita: '<path d="m15.5 4.5 4 4L8 20H4v-4z"/><path d="m13 7 4 4"/>',
  cestino: '<path d="M4 6.5h16"/><path d="M9 6.5V4.2A1.2 1.2 0 0 1 10.2 3h3.6A1.2 1.2 0 0 1 15 4.2v2.3"/><path d="M6.5 6.5 7.4 20a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-13.5"/>',
  scarica: '<path d="M12 3v12"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M4 20h16"/>',
  spunta: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  // — luoghi —
  chiesa: '<path d="M12 2v5M10 4.2h4"/><path d="M12 7 6.5 11v10h11V11z"/><path d="M9.8 21v-4a2.2 2.2 0 0 1 4.4 0v4"/>',
  palazzo: '<path d="M4 21V8.5L12 4l8 4.5V21"/><path d="M2.5 21h19"/><path d="M9 21v-5h6v5"/><path d="M8 11.5h1.5M14.5 11.5H16"/>',
  campo: '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M12 5.5v13"/><circle cx="12" cy="12" r="2.6"/><path d="M3 9h2.8v6H3M21 9h-2.8v6H21"/>',
  municipio: '<path d="M3 21h18"/><path d="M4.5 21V9.5h15V21"/><path d="M3 9.5 12 4l9 5.5"/><path d="M9 21v-6h6v6"/>',
  fiume: '<path d="M3 8.5c2.5-2 4-2 6.5 0s4 2 6.5 0 3.5-1.6 5 0"/><path d="M3 13.5c2.5-2 4-2 6.5 0s4 2 6.5 0 3.5-1.6 5 0"/><path d="M3 18.5c2.5-2 4-2 6.5 0s4 2 6.5 0 3.5-1.6 5 0"/>',
  bici: '<circle cx="6" cy="16.5" r="3.5"/><circle cx="18" cy="16.5" r="3.5"/><path d="m6 16.5 4-8h5"/><path d="m10 8.5 5 8M14 6h3"/>',
  auto: '<path d="M4.5 16.5h15"/><path d="M5.5 16.5v2h3v-2M15.5 16.5v2h3v-2"/><path d="M3.5 16.5v-4l2-5h13l2 5v4z"/><path d="M5.5 12.5h13"/>',
  metro: '<rect x="5" y="3.5" width="14" height="13" rx="3"/><path d="M5 11h14"/><path d="m7.5 16.5-2 4M16.5 16.5l2 4"/><circle cx="8.8" cy="13.8" r=".9" fill="currentColor" stroke="none"/><circle cx="15.2" cy="13.8" r=".9" fill="currentColor" stroke="none"/>',
};

/**
 * Restituisce il markup SVG dell'icona.
 *
 * Le misure sono sempre scritte come attributi: un SVG senza width/height si
 * espande al 100% del contenitore e schiaccia tutto il resto. Le regole CSS
 * (`.btn svg { width: 16px }` e simili) hanno comunque la precedenza sugli
 * attributi, quindi il valore predefinito non dà fastidio dove c'è già uno stile.
 *
 * @param {string} nome chiave di TRATTI
 * @param {{classe?:string, dim?:number}} opzioni
 */
export function icona(nome, { classe = '', dim = 20 } = {}) {
  const tratti = TRATTI[nome];
  if (!tratti) return '';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round" class="${classe}"
    width="${dim}" height="${dim}"
    aria-hidden="true" focusable="false">${tratti}</svg>`;
}

export const nomiIcone = Object.keys(TRATTI);
