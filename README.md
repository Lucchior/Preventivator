# 🖨️ Preventivator — Preventivi Stampa 3D e Laser

**🔗 App live: [https://lucchior.github.io/Preventivator/](https://lucchior.github.io/Preventivator/)**

Web-app responsive per la creazione di preventivi professionali per lavorazioni di stampa 3D e incisione laser, singole o combinate. Gira interamente nel browser, **installabile come app** (PWA), funziona **offline** dopo il primo caricamento, senza server, senza account e senza tracciamento.

---

## 📜 Licenza

Progetto personale — tutti i diritti riservati. Puoi usarlo liberamente per **uso personale**. Vietata la copia o la distribuzione non autorizzata. Per **uso commerciale** contattami tramite [mail](mailto:ddusnoblogo@gmail.com?subject=Preventivator%20%E2%80%94%20Bug%20o%20licenza%20commerciale) per ottenere una licenza.

### 💛 Sostieni il progetto

Se lo usi e ti piace, puoi offrirmi un caffè con una donazione libera: **[paypal.me/Lucchior](https://paypal.me/Lucchior)**. Non è un pagamento per nessuna funzione — è solo un modo per sostenere lo sviluppo continuo del progetto.

---

## ✨ Funzionalità principali

### 👤 Profilo fornitore
Inserisci una volta sola i tuoi dati: nome/ragione sociale, P.IVA, codice fiscale, regime fiscale, SDI, PEC, email, telefono, indirizzo, sito web. Distingue tra soggetto **privato** e **titolare di Partita IVA** mostrando solo i campi pertinenti. È un profilo unico: lo modifichi e sovrascrivi in qualsiasi momento, senza crearne di nuovi. I dati appaiono automaticamente nell'intestazione di ogni PDF generato.

### 🖨️ Gestione macchine e 🧵 materiali
Configura stampanti 3D e incisori laser con tutti i parametri per il calcolo preciso dei costi: costo di acquisto e vita utile stimata (ammortamento orario), consumo energetico reale (X kWh ogni Y ore), costo di manutenzione ogni 1000 ore. Stesso trattamento per i materiali (filamenti, resine, lastre, ecc.), con unità di misura personalizzabili per tipo.

Ogni macchina e materiale può essere **aggiunto, modificato ed eliminato** in qualsiasi momento (l'eliminazione mostra un conto alla rovescia di 5 secondi con opzione "Annulla" prima di essere definitiva).

### 📋 Preventivo con lavorazioni multiple
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

2. + Manodopera manuale (ore × tariffa oraria)

3. + Margine di fallimento % (copre stampe fallite o rilavorazioni)

4. + Rincaro / guadagno %

5. − Sconto cliente (importo fisso)

6. Prezzo minimo garantito (floor)

7. + IVA % (calcolata sul netto prodotto)

8. + Spedizione (aggiunta fuori dai margini: è un rimborso, non un ricavo)
   = TOTALE FINALE CLIENTE
```

### 🚚 Gestione spedizioni
Spedizione opzionale con tipologia (Standard / Espresso / Economy), assicurazione con costo separato, range di giorni di consegna stimati e note libere. Il disclaimer "tempi indicativi" è incluso automaticamente nel PDF.

### 📊 Riepilogo avanzato
Il riepilogo è diviso in due blocchi chiari:
- **🛠️ Costo reale di produzione** — ogni lavorazione con subtotale e dettaglio costi (materiale, energia, manutenzione, ammortamento); poi manodopera e margine fallimento
- **💶 Prezzo per il cliente** — dal costo reale al prezzo finale, voce per voce; margine netto stimato e prezzo per singolo pezzo

Include anche il **confronto Scenario A/B**: salva due varianti di margine/sconto/spedizione e confrontale fianco a fianco prima di scegliere quale proporre al cliente.

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
- **Lavorazione completa** in JSON — per riprendere un preventivo in futuro
- **Macchine e materiali anche in CSV**, compatibile Excel/Fogli Google

### 🌗 Tema chiaro/scuro
Segue automaticamente le preferenze del sistema operativo, con possibilità di forzarlo manualmente dal pulsante nell'header.

### ⌨️ Scorciatoie da tastiera
`Ctrl/Cmd+S` calcola il riepilogo, `Ctrl/Cmd+P` esporta il PDF, `Ctrl/Cmd+1…6` naviga tra i tab.

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
3. Compila manodopera, margini, IVA, eventuale spedizione
4. **Calcola riepilogo** → verifica i costi nel tab Riepilogo (viene salvato automaticamente in Archivio)
5. **Esporta PDF** → scarica il documento a due pagine
6. **Tab 📦 Dati & Backup** → esporta la lavorazione come JSON, se vuoi conservarla a parte

### Quando esce un aggiornamento
L'app ti avviserà con una schermata dedicata che ti guida a: esportare i dati, svuotare la cache (istruzioni per Safari/Chrome/Firefox), ricaricare, e reimportare tutto — per non perdere nulla durante l'aggiornamento.

---

## ⚙️ Tecnologie

- **HTML5 / CSS3 / JavaScript ES2020+ (moduli nativi)** — zero framework
- **IndexedDB** (wrapper nativo scritto su misura, zero dipendenze esterne) — i dati persistono nel browser sul dispositivo, con più capacità e affidabilità di localStorage
- **jsPDF** (unica libreria vendorizzata localmente in `vendor/`) — genera i PDF come testo vettoriale vero, non immagini
- **Service Worker** — precaching e funzionamento offline, PWA installabile
- **File API** — import/export JSON e CSV lato client, nessun upload su server
- **Intl.NumberFormat** — formattazione valuta e numeri in italiano

### ✅ Qualità e test
La logica di calcolo (`js/calc.js`) è isolata e coperta da **58 test automatici** (`tests/calc.test.js`), eseguibili con:
```bash
node tests/calc.test.js
```

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
├── js/
│   ├── app.js                # Inizializzazione, routing tab, orchestrazione
│   ├── calc.js               # Logica di calcolo pura (testata)
│   ├── models.js             # Modelli dati e normalizzazione
│   ├── storage.js            # Wrapper IndexedDB
│   ├── utils.js               # Formattatori, CSV, toast, helper
│   ├── ui-profile.js          # Tab Profilo
│   ├── ui-machines.js         # Tab Macchine
│   ├── ui-materials.js        # Materiali
│   ├── ui-jobs.js             # Lavorazioni, template, drag & drop
│   ├── ui-summary.js          # Riepilogo e confronto scenari
│   ├── ui-archive.js          # Tab Archivio e statistiche
│   ├── ui-io.js               # Import/export JSON e CSV
│   ├── ui-pdf.js              # Generazione PDF vettoriale
│   └── ui-theme.js            # Tema chiaro/scuro
├── vendor/
│   └── jspdf.umd.min.js      # Libreria PDF vendorizzata (non nel CDN)
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
- **Import/Export**: tieni sempre una copia dei dati base esportata — in caso di cambio dispositivo, pulizia del browser, o aggiornamento dell'app, li recuperi in un click.

---

*Realizzato con ❤️ da Ludwing's Creations, per chi fa cose belle con le mani (e le macchine).*
