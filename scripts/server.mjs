/**
 * Server di sviluppo: file statici + il ponte /api/rss verso il feed del Comune.
 *
 * Serve solo per lavorare in locale — in produzione i file statici li serve
 * l'hosting e /api/rss la funzione serverless (api/rss.js o netlify/functions).
 *
 * Uso:  node scripts/server.mjs [porta] [--radice=/percorso/da/servire]
 *
 * Di norma la radice è la cartella del progetto, ricavata dalla posizione di
 * questo file. Si può indicarla a mano con --radice quando il server viene
 * avviato da un'altra posizione.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const argomenti = process.argv.slice(2);
const radiceIndicata = argomenti.find((a) => a.startsWith('--radice='))?.slice('--radice='.length);

const RADICE = radiceIndicata
  ? resolve(radiceIndicata)
  : join(dirname(fileURLToPath(import.meta.url)), '..');

const PORTA = Number(argomenti.find((a) => /^\d+$/.test(a))) || 4173;

const FEED = 'https://www.comune.grezzago.mi.it/po/elenco_news_rss.php?tags=1,4&area=H';

const TIPI = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ics': 'text/calendar; charset=utf-8',
};

const server = createServer(async (richiesta, risposta) => {
  const url = new URL(richiesta.url, `http://localhost:${PORTA}`);

  /* --- ponte RSS --- */
  if (url.pathname === '/api/rss') {
    try {
      const esito = await fetch(FEED, {
        headers: {
          'User-Agent': 'GrezzagoApp/1.0 (app non ufficiale su Grezzago)',
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
      });
      const xml = await esito.text();
      risposta.writeHead(esito.ok ? 200 : 502, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      risposta.end(xml);
    } catch (errore) {
      risposta.writeHead(502, { 'Content-Type': 'application/json' });
      risposta.end(JSON.stringify({ errore: String(errore?.message || errore) }));
    }
    return;
  }

  /* --- file statici --- */
  // normalize() impedisce di uscire dalla cartella del progetto con «../».
  let percorso = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (percorso.endsWith('/')) percorso += 'index.html';

  const assoluto = join(RADICE, percorso);
  if (!assoluto.startsWith(RADICE)) {
    risposta.writeHead(403).end('Vietato');
    return;
  }

  try {
    const info = await stat(assoluto);
    const file = info.isDirectory()
      ? await readFile(join(assoluto, 'index.html'))
      : await readFile(assoluto);

    risposta.writeHead(200, {
      'Content-Type': TIPI[extname(assoluto)] || 'application/octet-stream',
      // In sviluppo si ricarica in continuazione: la cache del browser
      // farebbe solo perdere tempo a inseguire modifiche già salvate.
      'Cache-Control': 'no-store, must-revalidate',
    });
    risposta.end(file);
  } catch (errore) {
    // Un file che non c'è e un file che non si può leggere sono due problemi
    // diversi: confonderli in un 404 manda a cercare errori di percorso quando
    // il vero ostacolo è un permesso del sistema operativo.
    if (errore.code === 'EPERM' || errore.code === 'EACCES') {
      const messaggio = `Permesso negato su ${assoluto}`;
      console.error(`403 — ${messaggio}`);
      risposta.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      risposta.end(
        `<h1>403 — permesso negato</h1>
         <p>Il server è avviato ma il sistema operativo non gli lascia leggere
         <code>${assoluto}</code>.</p>
         <p>Su macOS succede quando il progetto sta in una cartella protetta
         (Scrivania, Documenti, Download) e all'applicazione che ha lanciato il
         server non è stato concesso l'accesso. Si risolve da
         <em>Impostazioni di Sistema → Privacy e sicurezza → File e cartelle</em>,
         oppure spostando il progetto in una cartella non protetta.</p>`
      );
      return;
    }

    if (errore.code !== 'ENOENT' && errore.code !== 'ENOTDIR') {
      console.error(`500 — ${errore.code} su ${assoluto}`);
      risposta.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      risposta.end(`<h1>500</h1><p>${errore.code}: ${errore.message}</p>`);
      return;
    }

    risposta.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    risposta.end('<h1>404</h1><p>Pagina non trovata.</p>');
  }
});

server.listen(PORTA, () => {
  console.log(`Grezzago in ascolto su http://localhost:${PORTA}`);
  console.log(`Radice servita: ${RADICE}`);
});
