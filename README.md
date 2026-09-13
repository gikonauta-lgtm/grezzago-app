# Grezzago — l'app del paese

Applicazione web installabile (PWA) su Grezzago (MI).

> **Progetto indipendente.** Non è il sito ufficiale del Comune e non è
> pubblicata da lui. I dati arrivano da fonti pubbliche e ufficiali, sempre
> citate. Se un giorno il Comune o la società la adottassero, basterà
> aggiornare le diciture nel piè di pagina e in questo file.

Tre cose, fatte bene:

1. **Calcio** — la classifica del girone dell'A.S.D. Grezzago 1981, il
   calendario ufficiale con campi e orari, le statistiche e la Coppa Lombardia.
2. **Eventi** — cosa succede in paese, con gli avvisi ufficiali che arrivano da
   soli dal sito del Comune e le partite in casa prese dal calendario.
3. **Scopri** — il paese per chi non c'è mai stato: cosa vedere, come arrivare,
   numeri utili.

Funziona su iPhone, Android e computer, si installa dalla schermata iniziale e
resta consultabile anche senza rete.

---

## I dati sono veri

Nessun dato è inventato. Tutto quello che l'app mostra sul campionato viene dai
documenti ufficiali del **Comitato Regionale Lombardia della LND** e della sua
**Delegazione Provinciale di Monza**:

| Cosa | Da dove | Come entra |
|---|---|---|
| Le 15 squadre del girone, con matricola | Composizione gironi Terza Categoria 2026/27 (11/08/2026) | `scripts/squadre.mjs` |
| Calendario, campi, indirizzi, orari | *Terza Categoria Monza.pdf*, allegato al C.U. n. 9 del 28/08/2026 della Delegazione di Monza | `scripts/importa-calendario.mjs` |
| Risultati di campionato | Comunicato Ufficiale settimanale della Delegazione di Monza | `scripts/importa-risultati.mjs` |
| Coppa Lombardia (girone 40) | C.U. CRL n. 22 del 10/09/2026 | `data/coppa.json` |
| Notizie ed eventi | Feed RSS del Comune di Grezzago | in automatico, a ogni apertura |

Gli **orari** seguono la tabella ufficiale del Regolamento Campionati
Dilettantistici CRL 2026/27 (art. 15.2): la domenica alle 15.30 dal 30 agosto,
alle 14.30 dal 25 ottobre, di nuovo alle 15.30 dal 28 marzo. Le squadre che
hanno un orario fisso (il Grezzago gioca in casa alle 14:30) usano il proprio.

> Non usiamo Tuttocampo: il loro calendario è riservato agli utenti registrati,
> e automatizzare l'accesso a un'area riservata non è una strada percorribile.
> La fonte federale è pubblica, ufficiale e liberamente consultabile.

---

## Aggiornare i risultati, ogni settimana

Il comunicato della Delegazione esce di solito il **giovedì**. Un comando e
basta:

```bash
node scripts/importa-risultati.mjs "https://www.crlombardia.it/…/Comunicato Ufficiale 13.pdf"
```

Funziona anche con un file già scaricato. Aggiungi `--prova` per vedere cosa
farebbe senza scrivere niente.

Il lettore abbina ogni risultato alla partita del calendario ufficiale con la
stessa giornata e le stesse due squadre. **Se anche un solo risultato non trova
la sua partita, non scrive niente** e spiega cosa non torna: meglio nessun
aggiornamento che una classifica sbagliata. Riconosce anche le rettifiche (una
partita omologata diversamente) e le segnala.

### Oppure in automatico

```bash
node scripts/aggiorna.mjs
```

Cerca da solo i comunicati nuovi della Delegazione di Monza e li importa.
Con `--prova` mostra cosa troverebbe senza importare niente.

Il sito del Comitato non ha né feed RSS né sitemap, e l'elenco dei comunicati
non è nella pagina: lo carica il browser con una chiamata interna, non
documentata. Le pagine dei singoli documenti però sono pubbliche e numerate in
ordine (`/documenti/33439/…`), e dicono in chiaro numero e delegazione. Lo
script riparte dall'ultimo documento già visto e va avanti finché la
numerazione finisce — solo pagine che chiunque può aprire, con una pausa fra
una richiesta e l'altra.

Il file `.github/workflows/aggiorna.yml` fa girare tutto questo **tre volte a
settimana** (giovedì, venerdì e sabato mattina) e pubblica da solo. Perché
funzioni servono due cose: il progetto in un repository GitHub, e l'hosting
collegato a quel repository (su Netlify o Vercel si imposta una volta sola).
Se invece pubblichi trascinando la cartella a mano, l'automazione non ha dove
scrivere: in quel caso resta il comando qui sopra.

⚠️ **La prima volta va controllata a mano.** Su Linux l'estrazione del testo
passa da `pdftotext` invece che da PDFKit, e l'ordine di lettura potrebbe non
essere identico. La sezione dei risultati è su una colonna sola, quindi il
rischio è basso, ma dopo il primo giovedì vale la pena confrontare la
classifica dell'app con quella del comunicato. Se qualcosa non torna, il
controllo di coerenza blocca la pubblicazione prima che i dati sbagliati
finiscano online.

Dopo l'importazione, il controllo:

```bash
node scripts/verifica-classifica.mjs
```

Stampa la classifica e verifica che i conti tornino — somma dei punti, gol
fatti uguali ai subiti, calendario completo, ogni risultato agganciato a una
partita vera — e confronta la classifica della coppa con quella pubblicata dal
Comitato. Con `--al=2026-11-15` mostra come si presenterà l'app a quella data.

### Se il calendario cambia

Capita che il Comitato ripubblichi il calendario. In quel caso:

```bash
node scripts/importa-calendario.mjs "<calendario.pdf>" --girone=A
```

I risultati già inseriti restano, se la partita esiste ancora. Prima di
scrivere il lettore controlla che il girone sia valido — 15 squadre, una
partita per squadra a giornata, ogni incontro una volta sola all'andata — e in
caso contrario si ferma senza toccare niente.

### Una nota sui PDF

I comunicati sono PDF impaginati a colonne, e il testo va estratto
nell'ordine giusto. Su macOS i lettori usano **PDFKit**, che è già nel sistema:
nessuna installazione. Su Linux serve `pdftotext` (pacchetto `poppler-utils`).

⚠️ I lettori sono stati scritti e verificati sull'ordine di estrazione di
PDFKit. Con `pdftotext` l'ordine potrebbe risultare diverso: **prima di
affidarli a un server automatico vanno riprovati lì**. I controlli di validità
servono anche a questo — in caso di disallineamento si fermano invece di
scrivere dati sbagliati.

---

## Avviare in locale

Serve Node 18 o superiore. Nessuna dipendenza da installare.

```bash
node scripts/server.mjs
```

Poi si apre <http://localhost:4173>. Il server serve i file statici e fa da
ponte verso il feed RSS del Comune (`/api/rss`), come farà l'hosting.

---

## Pubblicare

L'app è fatta di soli file statici più **una** funzione serverless. Il sito del
Comune pubblica un RSS valido ma senza header CORS: il browser non può leggerlo
da un sito statico, quindi serve un piccolo ponte lato server.

### Netlify

Trascinare la cartella su Netlify, oppure collegare il repository.
`netlify.toml` è già pronto.

### Vercel

Collegare il repository: la cartella `api/` viene riconosciuta da sola.

### Hosting del Comune

Copiare tutti i file. Senza la funzione serverless l'app **funziona lo stesso**:
non compaiono gli avvisi dal Comune. Con del PHP bastano poche righe per
replicare il ponte: scaricare
`https://www.comune.grezzago.mi.it/po/elenco_news_rss.php?tags=1,4&area=H`
e restituirlo con `Access-Control-Allow-Origin: *` all'indirizzo `/api/rss`.

> Serve HTTPS perché l'app sia installabile e funzioni offline.

---

## Il pannello di gestione

`admin.html` — vi si arriva dal link in fondo all'app.

- **Risultati**: serve a pubblicare un risultato **in giornata**, la domenica
  pomeriggio, senza aspettare il comunicato del giovedì.
- **Eventi**: aggiungere, modificare, togliere. Si può togliere anche un avviso
  arrivato dal Comune.
- **Esporta modifiche**: scarica un `.json` con quello che è stato inserito.

⚠️ Quello che si inserisce nel pannello resta **sul dispositivo di chi lo usa**
(`localStorage`): serve a preparare e a provare, non a pubblicare per tutti.
Per renderlo visibile a tutti va passato il file esportato a chi gestisce il
sito, che ne riporta il contenuto in `data/eventi.json` e in
`data/stagione.json`.

È il limite di un sito senza database, ed è la cosa principale rimasta da
decidere (vedi in fondo). Il codice è già separato in modo che serva cambiare
solo `js/dati.js`.

---

## Personalizzare

### Colori sociali

In cima a `css/app.css`. Il rosso viene dal mantello di San Martino, patrono di
Grezzago. Per usare i colori dell'A.S.D. Grezzago 1981 bastano tre righe:

```css
--marchio: #c8102e;         /* colore principale */
--marchio-scuro: #97071f;   /* stati premuti, sfondi profondi */
--marchio-chiaro: #ef4a63;  /* accenti */
```

Tema chiaro e scuro si adeguano da soli.

### Stemma e icone

`assets/icona.svg` è la sorgente; i PNG accanto servono a iOS e Android. Per
rigenerarli, su macOS:

```bash
qlmanage -t -s 512 -o assets assets/icona.svg && sips -Z 192 assets/icona-192.png
```

### Luoghi

**In `data/luoghi.json` vanno solo luoghi che stanno dentro Grezzago.** Le
attrazioni dei comuni vicini appartengono a quei comuni: metterle qui darebbe
al visitatore un'idea sbagliata di cosa trova in paese.

---

## Come è fatto

Nessun framework, nessuna compilazione: moduli ES nativi. Chiunque potrà
rimetterci mano fra tre anni senza ricostruire una catena di strumenti.

```
index.html            l'app
admin.html            pannello di gestione
manifest.webmanifest  installazione su telefono
sw.js                 funzionamento offline
css/app.css           design system (colori, tipografia, componenti)
js/
  app.js              avvio, instradamento, ciclo live
  dati.js             caricamento dati e modifiche locali
  classifica.js       motore: risultati → classifica, forma, stato della partita
  componenti.js       pezzi di interfaccia riusati
  formato.js          date, orari e numeri in italiano
  icone.js            icone SVG
  ics.js              «Aggiungi al calendario» e condivisione
  rss.js              lettura del feed del Comune
  vista-*.js          le schermate, più la card della coppa
data/
  stagione.json       calendario ufficiale, impianti, risultati
  coppa.json          Coppa Lombardia, girone 40
  eventi.json         eventi curati a mano e categorie
  luoghi.json         il paese, i luoghi, come arrivare, numeri utili
api/rss.js            ponte CORS (Vercel)
netlify/functions/    ponte CORS (Netlify)
scripts/
  squadre.mjs         le 15 squadre e il riconoscimento dei nomi nei documenti
  pdf-testo.mjs       estrazione del testo dai PDF
  importa-calendario.mjs   calendario ufficiale → data/stagione.json
  importa-risultati.mjs    comunicato settimanale → risultati
  verifica-classifica.mjs  controlli di coerenza da terminale
  server.mjs          server di sviluppo
```

### Il motore della classifica

Non esiste una classifica memorizzata: esistono i risultati, e la classifica si
calcola. Inserire un risultato aggiorna insieme punti, differenza reti, forma
delle ultime cinque, rendimento in casa e fuori, andamento e statistiche, senza
possibilità di disallineamento.

L'ordinamento segue il regolamento (art. 51 comma 6 NOIF): punti, poi
**classifica avulsa** fra le squadre a pari punti — punti negli scontri
diretti, poi differenza reti negli scontri diretti — poi differenza reti
generale, reti fatte in tutto il campionato e infine sorteggio della
Delegazione. I gol fatti negli scontri diretti *non* sono un criterio.

Zone: la 1ª è promossa in Seconda Categoria, dalla 2ª alla 7ª si va ai play-off
(2ª e 3ª direttamente al secondo turno). In Terza Categoria non ci sono
retrocessioni. Anche la vincitrice della Coppa Lombardia di Terza Categoria
conquista il titolo per la Seconda.

### Gli stati di una partita

- **programmata** — non è ancora cominciata, c'è il conto alla rovescia
- **in corso** — si gioca e abbiamo il punteggio: minuto e risultato in diretta
- **in campo senza punteggio** — si gioca ma il risultato non ce l'ha nessuno:
  l'app mostra il minuto e dice «in corso», senza inventare un punteggio
- **risultato in arrivo** — finita, ma il Comitato non l'ha ancora pubblicata
- **finita** — risultato ufficiale

Una partita in corso non muove la classifica finché non è finita.

---

## Cosa resta da decidere

1. **Chi pubblica i risultati la domenica.** Il comunicato ufficiale esce il
   giovedì: per avere il risultato in giornata serve una persona che lo inserisca
   dal campo. Oggi il pannello scrive solo sul proprio dispositivo: perché lo
   veda tutto il paese serve un piccolo archivio condiviso (una funzione
   serverless con un database, oppure un foglio Google pubblicato che l'app
   legge). È la decisione principale.
2. **Se accendere l'automazione settimanale.** Il lavoro è già scritto
   (`.github/workflows/aggiorna.yml`): perché parta serve il progetto su GitHub
   e l'hosting collegato al repository. Altrimenti resta il comando a mano, che
   funziona già.
3. **Stemma e colori ufficiali** del Comune e della società.
4. **Gli eventi segnati «da confermare»** in `data/eventi.json` sono segnaposto:
   vanno sostituiti con il programma reale.
5. **Coppa Lombardia**: date e accoppiamenti della 2ª giornata del girone 40 non
   sono ancora stati pubblicati.
