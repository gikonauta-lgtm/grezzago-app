/**
 * Le 15 squadre del girone e il riconoscimento dei loro nomi nei documenti.
 *
 * Fonte: Comitato Regionale Lombardia LND, composizione dei gironi di Terza
 * Categoria 2026/27 (11 agosto 2026), Delegazione di Monza, Girone A.
 * `nomeUfficiale` e `matricola` sono copiati dal documento; `nome` è la forma
 * breve mostrata nell'app.
 *
 * I documenti ufficiali scrivono la stessa squadra in modi diversi: il
 * calendario tronca («LOKOMOTIV FARESE C.»), la tabella impianti aggiunge
 * l'anno («CITTA DI BUSNAGO 2026»), i comunicati usano la ragione sociale.
 * `chiave` è la parola che compare in tutte le forme e in nessun'altra
 * squadra del girone.
 */

export const SQUADRE = [
  { id: 'aureliana',   nome: 'Aureliana',            sigla: 'AUR', chiave: 'AURELIANA',   matricola: 65240,  nomeUfficiale: 'A.S.D. AURELIANA' },
  { id: 'cambiaghese', nome: 'Cambiaghese',          sigla: 'CAM', chiave: 'CAMBIAGHESE', matricola: 8860,   nomeUfficiale: 'U.S.D. CAMBIAGHESE' },
  { id: 'capriate',    nome: 'Capriate Calcio',      sigla: 'CAP', chiave: 'CAPRIATE',    matricola: 952763, nomeUfficiale: 'A.S.D. CAPRIATE CALCIO' },
  { id: 'busnago',     nome: 'Città di Busnago',     sigla: 'BUS', chiave: 'BUSNAGO',     matricola: 965199, nomeUfficiale: 'ASD CITTA DI BUSNAGO 2026' },
  { id: 'fonas',       nome: 'Fonas',                sigla: 'FON', chiave: 'FONAS',       matricola: 66563,  nomeUfficiale: 'FONAS ASD' },
  { id: 'glaxiate',    nome: 'Glaxiate Calcio',      sigla: 'GLX', chiave: 'GLAXIATE',    matricola: 963145, nomeUfficiale: 'ASD GLAXIATE CALCIO' },
  { id: 'grezzago',    nome: 'Grezzago',             sigla: 'GRE', chiave: 'GREZZAGO',    matricola: 675725, nomeUfficiale: 'A.S.D. GREZZAGO' },
  { id: 'lokomotiv',   nome: 'Lokomotiv Farese',     sigla: 'LOK', chiave: 'LOKOMOTIV',   matricola: 965426, nomeUfficiale: 'LOKOMOTIV FARESE CALCIO 2' },
  { id: 'masate',      nome: 'Masate',               sigla: 'MAS', chiave: 'MASATE',      matricola: 949446, nomeUfficiale: 'MASATE A.S.D.' },
  { id: 'orsenigo',    nome: 'Mons. Orsenigo',       sigla: 'ORS', chiave: 'ORSENIGO',    matricola: 200774, nomeUfficiale: 'F.C.D. MONS.ORSENIGO' },
  { id: 'suisio',      nome: 'Oratorio Suisio 2000', sigla: 'SUI', chiave: 'SUISIO',      matricola: 51120,  nomeUfficiale: 'ORATORIO SUISIO 2000 ASD' },
  { id: 'ornago',      nome: 'Ornago',               sigla: 'ORN', chiave: 'ORNAGO',      matricola: 675315, nomeUfficiale: 'ORNAGO A.S. A.S.D.' },
  { id: 'carugate',    nome: 'Real Carugate',        sigla: 'CAR', chiave: 'CARUGATE',    matricola: 954877, nomeUfficiale: 'A.S.D. REAL CARUGATE' },
  { id: 'krono',       nome: 'Real Krono',           sigla: 'KRO', chiave: 'KRONO',       matricola: 965177, nomeUfficiale: 'REAL KRONO F.C. ASD' },
  { id: 'trecella',    nome: 'Virtus Acli Trecella', sigla: 'TRE', chiave: 'TRECELLA',    matricola: 930113, nomeUfficiale: 'A.S.D. VIRTUS ACLI TRECELLA' },
];

const normalizza = (s) => String(s)
  .toUpperCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Z0-9]/g, '');

/**
 * Identificativo della squadra a partire da un nome come compare nei
 * documenti. Lancia un errore se il nome non corrisponde a nessuna squadra
 * del girone, o a più di una: un abbinamento sbagliato sposterebbe punti da
 * una squadra all'altra.
 */
export function risolviSquadra(nome) {
  const n = normalizza(nome);
  const trovate = SQUADRE.filter((s) => n.includes(s.chiave));
  if (trovate.length !== 1) {
    throw new Error(`Nome di squadra non riconosciuto o ambiguo: «${nome}»`);
  }
  return trovate[0].id;
}

/** Come risolviSquadra, ma restituisce null invece di lanciare. */
export function provaARisolvere(nome) {
  try { return risolviSquadra(nome); } catch { return null; }
}

/** Le squadre come le vuole data/stagione.json (senza la chiave interna). */
export function squadrePerIlSito() {
  return SQUADRE.map(({ chiave, ...resto }) => resto);
}
