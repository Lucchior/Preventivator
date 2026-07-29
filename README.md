# Preventivator — Preventivi Stampa 3D e Laser

**🔗 App live: [https://lucchior.github.io/Preventivator/](https://lucchior.github.io/Preventivator/)**

Web-app responsive per la creazione di preventivi professionali per lavorazioni di stampa 3D e incisione laser, singole o combinate. Gira interamente nel browser, **installabile come app** (PWA), funziona **offline** dopo il primo caricamento, senza server, senza account e senza tracciamento. Interfaccia con navigazione laterale, tema chiaro/scuro e font Space Grotesk + JetBrains Mono per i valori numerici.

---

## 📜 Licenza

Progetto personale — tutti i diritti riservati. Puoi usarlo liberamente per **uso personale**. Vietata la copia, il fork pubblico, la ridistribuzione o l'uso commerciale non autorizzato. Per **uso commerciale** contattami tramite [mail](mailto:ddusnoblogo@gmail.com?subject=Preventivator%20%E2%80%94%20Bug%20o%20licenza%20commerciale) per ottenere una licenza.

📄 Testo completo della licenza (italiano/inglese): [LICENSE.md](./LICENSE.md)

### 💛 Sostieni il progetto

Se lo usi e ti piace, puoi offrirmi un caffè con una donazione libera: **[paypal.me/Lucchior](https://paypal.me/Lucchior)**. Non è un pagamento per nessuna funzione — è solo un modo per sostenere lo sviluppo continuo del progetto.

---

## ✨ Funzionalità principali

### 👤 Profilo fornitore
Inserisci una volta sola i tuoi dati: nome/ragione sociale, P.IVA, codice fiscale, regime fiscale, SDI, PEC, email, telefono, indirizzo, sito web. Distingue tra soggetto **privato** e **titolare di Partita IVA** mostrando solo i campi pertinenti. È un profilo unico: lo modifichi e sovrascrivi in qualsiasi momento, senza crearne di nuovi. I dati appaiono automaticamente nell'intestazione di ogni PDF generato.

### 🖨️ Gestione macchine e 🧵 materiali
Configura stampanti 3D e incisori laser con tutti i parametri per il calcolo preciso dei costi: costo di acquisto e vita utile stimata (ammortamento orario), consumo energetico reale (X kWh ogni Y ore), costo di manutenzione ogni 1000 ore, e per il laser anche la velocità degli spostamenti a vuoto (usata per stimare i tempi dai file G-code). Stesso trattamento per i materiali (filamenti, resine, lastre, ecc.), con unità di misura personalizzabili per tipo: **kg** e **metro** scalano in base al consumo reale (es. 0,5 kg, 1,2 metri); **pezzo**, **foglio** e **lastra** invece contano il prezzo pieno per unità intera usata — nel campo "quantità" della lavorazione scrivi 1 per un pezzo, 2 per due, ecc. (l'etichetta del campo cambia automaticamente in base al materiale scelto, per non fare confusione).

Ogni macchina e materiale può essere **aggiunto, modificato ed eliminato** in qualsiasi momento (l'eliminazione mostra un conto alla rovescia di 5 secondi con opzione "Annulla" prima di essere definitiva).

### 📥 Import automatico dei dati di stampa/incisione
Invece di calcolare a mano grammi e ore, puoi importarli direttamente dal file che hai già usato per produrre il pezzo:

**Stampa 3D** — carica un file **.gcode** (funziona con qualunque slicer: Bambu Studio, OrcaSlicer, Anycubic Slicer Next, PrusaSlicer, Cura...) oppure un **.3mf** esportato con l'opzione slicer "Esporta tutti i piatti elaborati" (non il "salva progetto" standard, che non contiene questi dati). Se il file contiene più piatti, puoi scegliere quale importare singolarmente oppure importarli **tutti insieme sommati** (comodo per lavorazioni con tanti pezzi piccoli), con relative miniature. Se il file dichiara il tipo di filamento (es. "PLA"), l'app **suggerisce automaticamente** il materiale salvato più simile.

**Laser** — carica un file **.gcode esportato da LightBurn**. A differenza degli slicer 3D, LightBurn non scrive un tempo stimato nel file: Preventivator lo calcola **simulando il percorso reale** (somma delle distanze percorse divise per la velocità dichiarata riga per riga), gestendo correttamente anche i **passaggi multipli** di taglio. Il materiale non viene compilato automaticamente (dipende dalla tua unità di misura), ma viene mostrata l'area lavorata come riferimento.

### 📋 Preventivo con lavorazioni multiple
Mentre compili il tab Lavoro, una **bolla fluttuante in basso a destra** mostra il totale stimato in tempo reale (aggiornato a ogni modifica), con un mini-riepilogo (costo reale, manodopera, margine netto) e un pulsante per saltare direttamente al Riepilogo completo — comodo per avere sempre sott'occhio l'andamento del preventivo senza dover ricalcolare ogni volta.

Il campo **Cliente** suggerisce automaticamente i nomi già visti nei preventivi passati (rubrica automatica, nessuna gestione manuale) e completa da solo il contatto quando ne scegli uno.

Crea preventivi con una o più lavorazioni in lista unica, ognuna configurabile con:
- Tipo (Stampa 3D o Laser) con macchina e materiale propri
- Descrizione libera
- Pezzi per piatto/lavorazione e numero di ripetizioni (piatti/lavorazioni)
- Grammi di materiale per la stampa 3D
- Durata inserita in **giorni + ore + minuti** (nessuna conversione manuale)
- Materiali o componenti esterni aggiuntivi con costo (es. meccanismo orologio, viti, magneti)
- Riordino delle lavorazioni via **drag & drop**
- Possibilità di salvare una lavorazione come **template riutilizzabile** e richiamarla in preventivi futuri

### 🧮 Calcolo automatico e trasparente
Il calcolo segue una sequenza rigorosa, documentata e **coperta da 58 test automatici**:

```
1. Costo reale per ogni lavorazione
   = Materiale + Energia + Manutenzione + Ammortamento macchina + Componenti extra

2. + Manodopera manuale (una o più voci: tipo di lavoro, ore e tariffa oraria propria per voce)

3. + Margine di fallimento % (copre stampe fallite o rilavorazioni)

4. + Rincaro / guadagno %

5. − Sconto cliente (importo fisso € e/o percentuale %, si sommano — con nota/nome coupon opzionale)

6. Prezzo minimo garantito (floor)

7. + IVA % (calcolata sul netto prodotto)

8. + Spedizione (aggiunta fuori dai margini: è un rimborso, non un ricavo)
   = TOTALE FINALE CLIENTE
```

### 🚚 Gestione spedizioni
Spedizione opzionale con tipologia (Standard / Espresso / Economy), assicurazione con costo separato, range di giorni di consegna stimati e note libere. Il disclaimer "tempi indicativi" è incluso automaticamente nel PDF.

### 📊 Riepilogo avanzato
Ogni preventivo riceve un **numero progressivo automatico** (es. "2026-007", riparte da 1 a ogni nuovo anno), visibile nel riepilogo, in archivio e nel PDF — ricalcolare lo stesso preventivo mantiene il numero, un nuovo preventivo ne genera uno nuovo.

Il riepilogo è diviso in due blocchi chiari:
- **🛠️ Costo reale di produzione** — ogni lavorazione con subtotale e dettaglio costi (materiale, energia, manutenzione, ammortamento); poi manodopera e margine fallimento
- **💶 Prezzo per il cliente** — dal costo reale al prezzo finale, voce per voce; margine netto stimato e prezzo per singolo pezzo

Include anche il **confronto Scenario A/B**: salva due varianti di margine/sconto/spedizione e confrontale fianco a fianco prima di scegliere quale proporre al cliente.

**Manodopera con voci multiple**: nella sezione "Preparazione e post-produzione" puoi aggiungere una o più voci di lavoro manuale (es. "Modellazione 3D", "Verniciatura", "Assemblaggio"), ognuna con le proprie ore e una tariffa oraria indipendente dalle altre. Nel PDF pagina 1 il cliente vede solo il nome della voce e il relativo costo (niente ore/tariffa); il dettaglio completo resta in pagina 2 e nel Riepilogo.

**Sconto cliente combinato**: puoi impostare uno sconto a importo fisso (€) e uno percentuale (%) insieme — si sommano automaticamente — più una nota/nome coupon opzionale (es. "BLACKFRIDAY15"). In pagina 1 del PDF appare come riga unica col totale combinato; il dettaglio con le due componenti separate resta in pagina 2.

**Arrotondamento del totale finale** (opzionale): a multipli di 0,50€, per eccesso o per difetto. Il cliente vede solo il totale già arrotondato (pagina 1 del PDF); il dettaglio con il prezzo esatto pre-arrotondamento resta visibile nel Riepilogo e in pagina 2 del PDF (uso interno).

### 📄 Esportazione PDF a due pagine (testo vettoriale, non un'immagine)
Il PDF è generato con testo vero, selezionabile e copiabile — non uno screenshot.

**Pagina 1 — Copia cliente** (design professionale a colori):
- Intestazione con i dati fornitore completi
- Dati cliente e tipo di lavoro
- Tabella lavorazioni: nome, materiale, quantità, importo (nessun dato tecnico interno)
- Riepilogo economico: imponibile, sconto, IVA, spedizione, totale
- QR code di contatto (email o sito del fornitore) e note di spedizione

**Pagina 2 — Copia fornitore** (uso interno, tema viola):
- Tabella tecnica completa per ogni lavorazione: macchina, durata, costi unitari (materiale, energia, manutenzione, ammortamento, extra)
- Struttura del costo reale e prezzo al cliente a confronto
- Riepilogo: costo reale, margine netto, prezzo/pezzo, totale finale

### 📁 Archivio con statistiche
Ogni preventivo calcolato viene **salvato automaticamente** nello storico. Da qui puoi:
- Cercare per nome, cliente o data
- **Caricare** un preventivo per modificarlo, o **duplicarlo** come nuova bozza senza toccare l'originale
- Riesportare il PDF senza ricalcolare nulla
- Consultare una **dashboard statistiche** (fatturato totale, preventivo medio, cliente più profittevole, materiale più usato, margine medio)

### 📦 Import / Export dati
- **Dati base** (Profilo + Macchine + Materiali) in JSON — per portarli su un altro dispositivo
- **Lavorazione completa** in JSON — per riprendere un preventivo in futuro, incluse le voci di manodopera. I file esportati con versioni precedenti (che salvavano la manodopera come singolo campo ore+tariffa) vengono convertiti automaticamente all'import, senza perdita di dati
- **Macchine e materiali anche in CSV**, compatibile Excel/Fogli Google

### 🌗 Tema chiaro/scuro
Segue automaticamente le preferenze del sistema operativo, con possibilità di forzarlo manualmente dal pulsante nell'header.

### ⌨️ Scorciatoie da tastiera
`Ctrl/Cmd+S` calcola il riepilogo, `Ctrl/Cmd+P` esporta il PDF, `Ctrl/Cmd+1…6` naviga tra i tab.

### ❓ Guida rapida in-app
Il pulsante ❓ nell'header apre una guida sintetica con una spiegazione di ogni tab e delle funzioni meno immediate — utile per chi usa l'app la prima volta o non ricorda un dettaglio.

### 🖥️ Ottimizzata per desktop
L'interfaccia è pensata per lo schermo grande (navigazione laterale sempre visibile, due colonne affiancate). Resta comunque **pienamente utilizzabile da smartphone e tablet**: sotto i 900px la barra laterale diventa orizzontale e le colonne si impilano. Su schermo piccolo compare un avviso richiudibile che segnala che l'esperienza migliore è da computer.

### 📲 App installabile (PWA)
Da smartphone o desktop puoi installare Preventivator come una vera app (icona in home screen, si apre senza barra del browser). Funziona anche **offline** una volta caricata la prima volta.

---

## 🗂️ Struttura dei tab

| Tab | Contenuto |
|-----|-----------|
| **Profilo** | Dati fornitore (privato o P.IVA) |
| **Macchine** | Configurazione stampanti 3D e laser + materiali |
| **Lavoro** | Creazione preventivo con lavorazioni multiple, template, drag & drop |
| **Riepilogo** | Analisi costi, confronto scenari, esportazione PDF |
| **📁 Archivio** | Storico preventivi, ricerca, duplicazione, statistiche |
| **📦 Dati & Backup** | Import/export JSON e CSV |

---

## 🚀 Come usarla

### Prima configurazione (una tantum)
1. Apri l'app: [https://lucchior.github.io/Preventivator/](https://lucchior.github.io/Preventivator/)
2. **Tab Profilo** → inserisci i tuoi dati (appariranno nel PDF)
3. **Tab Macchine** → aggiungi le tue stampanti/laser e i materiali che usi
4. **Tab 📦 Dati & Backup** → esporta i dati base e salvali al sicuro

### Per ogni preventivo
1. **Tab Lavoro** → inserisci nome preventivo e dati cliente
2. **+ Aggiungi lavorazione 3D / Laser** (o richiama un template salvato) → configura ogni lavorazione
3. Se hai già il file di stampa/incisione, usa **📂 Importa da file** per compilare grammi/ore automaticamente invece di inserirli a mano
4. Compila manodopera, margini, IVA, eventuale spedizione
5. **Calcola riepilogo** → verifica i costi nel tab Riepilogo (viene salvato automaticamente in Archivio)
6. **Esporta PDF** → scarica il documento a due pagine
7. **Tab 📦 Dati & Backup** → esporta la lavorazione come JSON, se vuoi conservarla a parte

### Quando esce un aggiornamento
L'app ti avviserà con una schermata dedicata che ti guida a: esportare i dati, svuotare la cache (istruzioni per Safari/Chrome/Firefox), ricaricare, e reimportare tutto — per non perdere nulla durante l'aggiornamento.

---

## ⚙️ Tecnologie

- **HTML5 / CSS3 / JavaScript ES2020+ (moduli nativi)** — zero framework
- **IndexedDB** (wrapper nativo scritto su misura, zero dipendenze esterne) — i dati persistono nel browser sul dispositivo, con più capacità e affidabilità di localStorage
- **jsPDF** e **JSZip** (librerie vendorizzate localmente in `vendor/`) — jsPDF genera i PDF come testo vettoriale vero, JSZip legge i file .3mf per l'import automatico dei dati di stampa
- **Service Worker** — precaching e funzionamento offline, PWA installabile
- **File API** — import/export JSON e CSV lato client, nessun upload su server
- **Intl.NumberFormat** — formattazione valuta e numeri in italiano
- **Space Grotesk + JetBrains Mono** (Google Fonts) — font dell'interfaccia e dei valori numerici/prezzi

### ✅ Qualità e test
La logica di calcolo (`js/calc.js`) è isolata e coperta da **58 test automatici** (`tests/calc.test.js`), eseguibili con:
```bash
node tests/calc.test.js
```

### 🔧 Setup da zero (solo se clonate il repository)
`vendor/jspdf.umd.min.js` e `vendor/jszip.min.js` non sono generate automaticamente e vanno scaricate una volta sola:
- jsPDF: https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
- JSZip: https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js

Salvale con questi nomi esatti dentro la cartella `vendor/`.

---

## 🔒 Privacy e dati

Tutti i dati (profilo, macchine, materiali, preventivi, archivio) vengono salvati **esclusivamente in IndexedDB nel browser** dell'utente. Nessun dato viene trasmesso a server esterni. L'app funziona completamente **offline** dopo il primo caricamento. L'unica chiamata di rete opzionale è la generazione del QR code nel PDF (richiede connessione al momento dell'esportazione; se assente, il PDF viene comunque generato correttamente senza QR).

---

## 📁 Struttura del repository

```
Preventivator/
├── index.html              # Struttura HTML dell'app
├── style.css                # Stile completo (tema chiaro/scuro incluso)
├── manifest.json             # Manifest PWA (icone, nome, colori)
├── service-worker.js        # Cache offline e gestione aggiornamenti
├── package.json
├── README.md
├── LICENSE.md                # Licenza d'uso (italiano/inglese)
├── js/
│   ├── app.js                # Inizializzazione, routing tab, orchestrazione
│   ├── calc.js               # Logica di calcolo pura (testata)
│   ├── models.js             # Modelli dati e normalizzazione
│   ├── storage.js            # Wrapper IndexedDB
│   ├── utils.js               # Formattatori, CSV, toast, helper
│   ├── ui-profile.js          # Tab Profilo
│   ├── ui-machines.js         # Tab Macchine
│   ├── ui-materials.js        # Materiali
│   ├── ui-jobs.js             # Lavorazioni, template, drag & drop, import file
│   ├── ui-labor.js             # Voci di manodopera multiple
│   ├── ui-3mf.js               # Lettura .gcode/.3mf per import dati stampa 3D
│   ├── ui-laser-gcode.js       # Stima tempo da .gcode laser (LightBurn)
│   ├── ui-summary.js          # Riepilogo e confronto scenari
│   ├── ui-archive.js          # Tab Archivio e statistiche
│   ├── ui-io.js               # Import/export JSON e CSV
│   ├── ui-pdf.js              # Generazione PDF vettoriale
│   ├── ui-theme.js            # Tema chiaro/scuro
│   └── ui-help.js              # Guida rapida in-app
├── vendor/
│   ├── jspdf.umd.min.js      # Libreria PDF vendorizzata (non nel CDN)
│   └── jszip.min.js           # Libreria lettura archivi .3mf (non nel CDN)
├── icons/
│   ├── icon-180.png
│   ├── icon-192.png
│   └── icon-512.png
└── tests/
    └── calc.test.js           # 58 test della logica di calcolo
```

---

## 💡 Suggerimenti d'uso

- **Vita utile macchina**: una stampante FDM desktop ha tipicamente 5.000–10.000 ore; un laser CO₂ artigianale 8.000–15.000 ore. Usa valori conservativi.
- **Consumo energia**: se non hai una misura esatta, usa una presa smart (es. TP-Link Kasa) per misurare il consumo reale della macchina durante una stampa.
- **Margine fallimento**: tipicamente 5–15% per stampa 3D FDM, meno per laser. Copre le stampe da rifare.
- **Prezzo minimo**: utile per lavorazioni brevi dove il costo fisso (imballaggio, gestione ordine) è rilevante.
- **Template**: se ripeti spesso la stessa combinazione macchina+materiale+parametri, salvala come template dalla lavorazione — la richiami in un click nei preventivi futuri.
- **Import automatico**: se il tuo slicer/LightBurn permette di esportare il file già sezionato, usalo — risparmi tempo e riduci gli errori di trascrizione rispetto a inserire grammi/ore a mano.
- **Numero preventivo**: se devi allinearlo alla tua numerazione contabile esistente, puoi comunque rinominare il preventivo/cliente per far scattare un nuovo numero, oppure ignorarlo e usare solo il tuo sistema esterno.
- **Cliente**: la prima volta che scrivi un nuovo cliente, inserisci anche il contatto — la prossima volta ti verrà suggerito e completato da solo.
- **Import/Export**: tieni sempre una copia dei dati base esportata — in caso di cambio dispositivo, pulizia del browser, o aggiornamento dell'app, li recuperi in un click.

---

*Realizzato con ❤️ da Ludwing's Creations, per chi fa cose belle con le mani (e le macchine).*
