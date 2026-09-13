/**
 * Ponte CORS verso il feed RSS del Comune di Grezzago.
 *
 * Il sito istituzionale pubblica un RSS valido ma senza header CORS, quindi il
 * browser non può leggerlo da un sito statico. Questa funzione lo scarica lato
 * server e lo restituisce con gli header giusti.
 *
 * Funziona così com'è su Vercel (cartella /api). Per Netlify c'è la stessa
 * funzione in netlify/functions/rss.js e il redirect in netlify.toml.
 */

const FEED = 'https://www.comune.grezzago.mi.it/po/elenco_news_rss.php?tags=1,4&area=H';

// Il feed cambia poche volte al mese: mezz'ora di cache è più che sufficiente
// e tiene basso il carico sul server del Comune.
const CACHE_SECONDI = 1800;

export default async function handler(richiesta, risposta) {
  try {
    const esito = await fetch(FEED, {
      headers: {
        // Alcuni portali istituzionali rifiutano le richieste senza user agent.
        'User-Agent': 'GrezzagoApp/1.0 (app non ufficiale su Grezzago)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!esito.ok) {
      risposta.status(502).json({ errore: `Il feed ha risposto ${esito.status}` });
      return;
    }

    const xml = await esito.text();

    risposta.setHeader('Content-Type', 'application/xml; charset=utf-8');
    risposta.setHeader('Access-Control-Allow-Origin', '*');
    risposta.setHeader(
      'Cache-Control',
      `public, max-age=${CACHE_SECONDI}, s-maxage=${CACHE_SECONDI}, stale-while-revalidate=86400`
    );
    risposta.status(200).send(xml);
  } catch (errore) {
    risposta.status(500).json({ errore: String(errore?.message || errore) });
  }
}
