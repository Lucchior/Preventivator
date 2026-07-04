# 🖨️ Preventivator — Preventivi Stampa 3D e Laser

**🔗 App live: [https://lucchior.github.io/Preventivator/](https://lucchior.github.io/Preventivator/)**

Web-app responsive per la creazione di preventivi professionali per lavorazioni di stampa 3D e incisione laser, singole o combinate. Gira interamente nel browser, senza server, senza account e senza dipendenze esterne.

##  Licenza

Progetto personale — tutti i diritti riservati. Puoi usarlo liberamente per uso personale. Per uso commerciale contattami tramite [mail](mailto:ddusnoblogo@gmail.com) per ottenere una licenza commerciale


---

##  Funzionalità principali

###  Profilo fornitore
Inserisci una volta sola i tuoi dati: nome/ragione sociale, P.IVA, codice fiscale, regime fiscale, SDI, PEC, email, telefono, indirizzo, sito web. Distingue tra soggetto **privato** e **titolare di Partita IVA** mostrando solo i campi pertinenti. I dati appaiono automaticamente nell'intestazione di ogni PDF generato.

###  Gestione macchine
Configura le tue stampanti 3D e incisori laser con tutti i parametri necessari al calcolo preciso dei costi:
- Costo di acquisto e vita utile stimata (per il calcolo dell'**ammortamento orario**)
- Costo dell'energia elettrica (€/kWh) e consumo reale della macchina (X kWh ogni Y ore)
- Costo di manutenzione ogni 1000 ore

###  Gestione materiali
Salva filamenti, resine, lastre e altri materiali con costo per unità (kg, metro, foglio, pezzo, ecc.). Materiali 3D e laser gestiti separatamente con unità di misura personalizzabili.

###  Preventivo con lavorazioni multiple
Crea preventivi con una o più lavorazioni in lista unica, ognuna configurabile con:
- Tipo (Stampa 3D o Laser) con macchina e materiale propri
- Descrizione libera
- Pezzi per piatto/lavorazione e numero di ripetizioni (piatti/lavorazioni)
- Grammi di materiale per la stampa 3D
- Durata inserita in **giorni + ore + minuti** (nessuna conversione manuale)
- Materiali o componenti esterni aggiuntivi con costo (es. meccanismo orologio, viti, magneti)

###  Calcolo automatico e trasparente
Il calcolo segue una sequenza rigorosa e documentata:

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

###  Gestione spedizioni
Configura spedizione opzionale con tipologia (Standard / Espresso / Economy), assicurazione con costo separato, range di giorni di consegna stimati e note libere. Il disclaimer "tempi indicativi" è incluso automaticamente nel PDF.

###  Riepilogo avanzato
Il riepilogo è diviso in due blocchi chiari:
- **🛠️ Costo reale di produzione** — ogni lavorazione con subtotale e dettaglio costi (materiale, energia, manutenzione, ammortamento); poi manodopera e margine fallimento
- **💶 Prezzo per il cliente** — dal costo reale al prezzo finale, voce per voce; margine netto stimato e prezzo per singolo pezzo

###  Esportazione PDF a due pagine

**Pagina 1 — Copia cliente** (design professionale e colorato):
- Intestazione con i dati fornitore completi
- Dati cliente e tipo di lavoro
- Tabella lavorazioni: nome, materiale, quantità, importo (nessun dato tecnico interno)
- Componenti extra evidenziati
- Riepilogo economico: imponibile, sconto, IVA, spedizione, totale
- Note e disclaimer spedizione

**Pagina 2 — Copia fornitore** (uso interno, tema viola):
- Tabella tecnica completa per ogni lavorazione: macchina, durata, costi unitari (materiale, energia, manutenzione, ammortamento, extra)
- Struttura del costo reale e prezzo al cliente a confronto
- Riepilogo: costo reale, margine netto, prezzo/pezzo, totale finale

###  Import / Export dati

**Dati base (Profilo + Macchine + Materiali):**
- Esporta in `dati-base-AAAA-MM-GG.json`
- Reimporta su qualsiasi dispositivo per non riconfigurare da zero

**Lavorazione completa:**
- Esporta in `lavorazione-[nome]-AAAA-MM-GG.json` con tutti i dati (lavorazioni, parametri, risultato calcolato, snapshot macchine/materiali)
- Ricarica in futuro per modificare o aggiornare il preventivo
- **Flusso consigliato:** calcola → esporta PDF → esporta lavorazione → salva entrambi nella cartella del cliente

---

##  Struttura dei tab

| Tab | Colore | Contenuto |
|-----|--------|-----------|
| **Profilo** | Blu | Dati fornitore (privato o P.IVA) |
| **Macchine** | Viola | Configurazione stampanti 3D e laser |
| **Lavoro** | Verde | Creazione preventivo con lavorazioni multiple |
| **Riepilogo** | Verde | Analisi costi + esportazione PDF |
| ** Dati & Backup** | Ambra | Import/export configurazione e lavorazioni |

---

##  Come usarla

### Prima configurazione (una tantum)
1. Apri l'app: [https://lucchior.github.io/Preventivator/](https://lucchior.github.io/Preventivator/)
2. **Tab Profilo** → inserisci i tuoi dati (appariranno nel PDF)
3. **Tab Macchine** → aggiungi le tue stampanti/laser con tutti i parametri
4. **Tab Lavoro → Materiali** → aggiungi i filamenti e materiali che usi
5. **Tab  Dati & Backup** → esporta i dati base e salvali al sicuro

### Per ogni preventivo
1. **Tab Lavoro** → inserisci nome preventivo e dati cliente
2. **+ Aggiungi lavorazione 3D / Laser** → configura ogni lavorazione
3. Compila manodopera, margini, IVA, eventuale spedizione
4. **Calcola riepilogo** → verifica i costi nel tab Riepilogo
5. **Esporta PDF** → stampa/salva il documento a due pagine
6. **Tab  Dati & Backup** → esporta la lavorazione come JSON

---

##  Tecnologie

- **HTML5 / CSS3 / JavaScript ES2020+** — zero dipendenze, zero framework
- **localStorage** — i dati persistono nel browser sul dispositivo corrente
- **CSS print media queries** — PDF a due pagine generato direttamente dal browser
- **File API** — import/export JSON lato client, nessun upload su server
- **Intl.NumberFormat** — formattazione valuta e numeri in italiano

---

##  Privacy e dati

Tutti i dati (profilo, macchine, materiali, preventivi) vengono salvati **esclusivamente nel localStorage del browser** sul dispositivo dell'utente. Nessun dato viene trasmesso a server esterni. L'app funziona anche completamente **offline** dopo il primo caricamento.

---

##  Struttura del repository

```
Preventivator/
└── index.html      # L'intera applicazione in un singolo file
└── README.md       # Questa documentazione
```

---

##  Suggerimenti d'uso

- **Vita utile macchina**: una stampante FDM desktop ha tipicamente 5.000–10.000 ore; un laser CO₂ artigianale 8.000–15.000 ore. Usa valori conservativi.
- **Consumo energia**: se non hai una misura esatta, usa una presa smart (es. TP-Link Kasa) per misurare il consumo reale della macchina durante una stampa.
- **Margine fallimento**: tipicamente 5–15% per stampa 3D FDM, meno per laser. Copre le stampe da rifare.
- **Prezzo minimo**: utile per lavorazioni brevi dove il costo fisso (imballaggio, gestione ordine) è rilevante.
- **Import/Export**: tieni sempre una copia dei dati base esportata — in caso di cambio dispositivo o pulizia del browser li recuperi in un click.

---

*Realizzato con ❤️ per chi fa cose belle con le mani (e le macchine).*
