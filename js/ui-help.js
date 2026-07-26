/**
 * ui-help.js — Preventivator
 * Guida rapida richiamabile dall'header (pulsante ❓), con una spiegazione
 * sintetica di ogni tab e delle funzioni meno ovvie.
 */

const SECTIONS = [
  {
    icon: '👤', title: 'Profilo',
    body: `È un profilo unico: compili i tuoi dati (privato o P.IVA) e appaiono automaticamente nell'intestazione di ogni PDF. Se cambi email o telefono, modifica i campi e premi di nuovo "Salva profilo" — aggiorna questo stesso profilo, non ne crea uno nuovo.`,
  },
  {
    icon: '🖨️', title: 'Macchine',
    body: `Configura stampanti 3D e laser (costo, vita utile, consumo energetico, manutenzione) e i materiali che usi. Ogni voce si può <strong>aggiungere, modificare ed eliminare</strong> in qualsiasi momento. Nella Lavorazione puoi importare grammi/ore direttamente da un file <strong>.gcode o .3mf</strong> già sezionato, invece di inserirli a mano — per il laser funziona con i file esportati da LightBurn.`,
  },
  {
    icon: '📋', title: 'Lavoro',
    body: `Crea un preventivo con una o più lavorazioni (stampa 3D e/o laser). Puoi riordinarle trascinandole, salvarne una come <strong>template</strong> riutilizzabile, e importare i dati da file come sopra. Il campo "Cliente" suggerisce automaticamente i nomi già visti nei preventivi passati, completando anche il contatto.`,
  },
  {
    icon: '📊', title: 'Riepilogo',
    body: `Mostra il costo reale di produzione e il prezzo finale per il cliente, voce per voce. Puoi salvare due varianti come <strong>Scenario A/B</strong> e confrontarle prima di scegliere, e da qui esporti il PDF a due pagine (copia cliente + copia fornitore con tutti i dettagli tecnici).`,
  },
  {
    icon: '📁', title: 'Archivio',
    body: `Ogni preventivo calcolato viene salvato automaticamente qui, con un numero progressivo. Puoi cercarlo, <strong>caricarlo</strong> per modificarlo, <strong>duplicarlo</strong> come nuova bozza senza toccare l'originale, riesportare il PDF, e consultare le statistiche (fatturato, cliente più profittevole, margine medio).`,
  },
  {
    icon: '📦', title: 'Dati & Backup',
    body: `Esporta e reimporta i tuoi dati in JSON (profilo, macchine, materiali, o una singola lavorazione) e macchine/materiali anche in CSV. <strong>Tieni sempre un'esportazione recente</strong>: se cambi dispositivo, pulisci la cache, o aggiorni l'app, la reimporti in un click.`,
  },
  {
    icon: '⌨️', title: 'Scorciatoie da tastiera',
    body: `<code>Ctrl/Cmd+S</code> calcola il riepilogo · <code>Ctrl/Cmd+P</code> esporta il PDF · <code>Ctrl/Cmd+1…6</code> naviga tra i tab.`,
  },
];

export function initHelpHandler() {
  const btn = document.getElementById('helpBtn');
  if (!btn) return;
  btn.addEventListener('click', showHelpOverlay);
}

function showHelpOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'helpOverlay';
  overlay.innerHTML = `
    <div class="help-modal">
      <div class="help-modal-head">
        <h2>❓ Guida rapida</h2>
        <button type="button" id="helpCloseBtn" class="theme-btn" aria-label="Chiudi">✕</button>
      </div>
      <div class="help-sections">
        ${SECTIONS.map((s, i) => `
          <details class="help-section" ${i === 0 ? 'open' : ''}>
            <summary><span class="help-section-icon">${s.icon}</span> ${s.title}</summary>
            <p>${s.body}</p>
          </details>
        `).join('')}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const close = () => { overlay.remove(); document.body.style.overflow = ''; };
  document.getElementById('helpCloseBtn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
