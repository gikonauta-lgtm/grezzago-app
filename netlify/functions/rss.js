/** Stessa funzione di /api/rss.js, nel formato Netlify Functions. */

const FEED = 'https://www.comune.grezzago.mi.it/po/elenco_news_rss.php?tags=1,4&area=H';
const CACHE_SECONDI = 1800;

export async function handler() {
  try {
    const esito = await fetch(FEED, {
      headers: {
        'User-Agent': 'GrezzagoApp/1.0 (app non ufficiale su Grezzago)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!esito.ok) {
      return { statusCode: 502, body: JSON.stringify({ errore: `Il feed ha risposto ${esito.status}` }) };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `public, max-age=${CACHE_SECONDI}, s-maxage=${CACHE_SECONDI}, stale-while-revalidate=86400`,
      },
      body: await esito.text(),
    };
  } catch (errore) {
    return { statusCode: 500, body: JSON.stringify({ errore: String(errore?.message || errore) }) };
  }
}
