/** Esportazione in formato iCalendar, per «Aggiungi al calendario». */

function aUtc(data) {
  const d = new Date(data);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

const codificatore = new TextEncoder();
const ottetti = (s) => codificatore.encode(s).length;

/**
 * iCalendar impone righe da 75 ottetti, e le continuazioni iniziano con uno
 * spazio. Il limite è in byte, non in caratteri: in italiano «à», «ª» e le
 * virgolette basse occupano due o tre byte l'una, quindi tagliare a 75
 * caratteri produrrebbe righe fuori norma. Scorro per punti di codice così
 * non spezzo mai un carattere a metà.
 */
function piega(riga) {
  if (ottetti(riga) <= 75) return riga;

  const righe = [];
  let corrente = '';

  for (const carattere of riga) {
    const prova = corrente + carattere;
    if (ottetti(prova) > 75) {
      righe.push(corrente);
      corrente = ' ' + carattere; // lo spazio di continuazione conta nel limite
    } else {
      corrente = prova;
    }
  }
  if (corrente) righe.push(corrente);

  return righe.join('\r\n');
}

function fuga(testo) {
  return String(testo ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Costruisce il testo .ics di un evento. */
export function creaIcs(evento) {
  const inizio = new Date(evento.inizio);
  const fine = evento.fine
    ? new Date(evento.fine)
    : new Date(inizio.getTime() + 2 * 60 * 60 * 1000);

  const luogo = [evento.luogo, evento.indirizzo].filter(Boolean).join(' — ');
  const descrizione = [evento.descrizione, evento.link].filter(Boolean).join('\n\n');

  const righe = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//App Grezzago//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${evento.id}@grezzago.app`,
    `DTSTAMP:${aUtc(new Date())}`,
    `DTSTART:${aUtc(inizio)}`,
    `DTEND:${aUtc(fine)}`,
    piega(`SUMMARY:${fuga(evento.titolo)}`),
    piega(`DESCRIPTION:${fuga(descrizione)}`),
    luogo ? piega(`LOCATION:${fuga(luogo)}`) : null,
    evento.link ? piega(`URL:${fuga(evento.link)}`) : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return righe.join('\r\n');
}

/** Avvia il download del file .ics. */
export function scaricaIcs(evento) {
  const blob = new Blob([creaIcs(evento)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${evento.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Condivisione nativa dove c'è, copia del link dove non c'è. */
export async function condividi({ titolo, testo, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title: titolo, text: testo, url });
      return 'condiviso';
    } catch (e) {
      if (e?.name === 'AbortError') return 'annullato';
    }
  }
  try {
    await navigator.clipboard.writeText(`${titolo}\n${url}`);
    return 'copiato';
  } catch {
    return 'fallito';
  }
}
