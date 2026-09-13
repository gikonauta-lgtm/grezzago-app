/**
 * Estrae il testo dai PDF del Comitato Regionale Lombardia.
 *
 * I comunicati e i calendari sono impaginati a colonne: il testo esce
 * nell'ordine in cui è scritto nel file, non in quello in cui lo legge un
 * occhio. Su macOS uso PDFKit, che è già nel sistema; altrove serve
 * `pdftotext` (pacchetto poppler-utils).
 *
 * I lettori di questa cartella sono stati scritti e verificati sull'ordine
 * di estrazione di PDFKit. Con pdftotext l'ordine può essere diverso: per
 * questo ogni lettore controlla la struttura di ciò che ha letto e si
 * rifiuta di scrivere se non torna.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PDFKIT = `ObjC.import('Quartz');
function run(argv) {
  var doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0]));
  if (!doc || doc.isNil()) throw new Error('PDF non apribile: ' + argv[0]);
  return ObjC.unwrap(doc.string);
}`;

const LIMITE = 64 * 1024 * 1024;

/** Testo completo del PDF. Accetta anche un .txt già estratto. */
export function estraiTesto(percorso) {
  if (percorso.toLowerCase().endsWith('.txt')) return readFileSync(percorso, 'utf8');

  if (process.platform === 'darwin') {
    return execFileSync('osascript', ['-l', 'JavaScript', '-e', PDFKIT, percorso], {
      encoding: 'utf8',
      maxBuffer: LIMITE,
    });
  }

  try {
    return execFileSync('pdftotext', ['-enc', 'UTF-8', percorso, '-'], {
      encoding: 'utf8',
      maxBuffer: LIMITE,
    });
  } catch {
    throw new Error(
      'Per leggere i PDF fuori da macOS serve pdftotext (pacchetto poppler-utils).'
    );
  }
}

/** Righe non vuote, già ripulite dagli spazi ai bordi. */
export function righe(testo) {
  return testo.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
}
