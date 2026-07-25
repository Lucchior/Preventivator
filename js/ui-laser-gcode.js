/**
 * ui-laser-gcode.js — Preventivator
 * Stima automatica del tempo di lavorazione da un file .gcode generato da
 * LightBurn (o software equivalenti per laser/CNC).
 *
 * A differenza degli slicer 3D, LightBurn NON scrive un tempo stimato nei
 * commenti del file — va calcolato simulando il percorso: per ogni comando
 * G0/G1 si misura la distanza percorsa e la si divide per la velocità (F)
 * impostata in quel momento, sommando tutto. Verificato che il bounding box
 * ricostruito in questo modo combacia con quello dichiarato dal file stesso
 * (commento "; Bounds: ..."), a conferma che il tracciamento è corretto.
 *
 * Il "materiale" non viene compilato automaticamente: a differenza del
 * filamento 3D (che ha un peso calcolabile), il laser lavora su lastre/fogli
 * la cui unità di costo (foglio, metro, pezzo...) dipende da come l'utente
 * ha impostato il proprio materiale — non è un dato deducibile dal G-code.
 * Viene però mostrata l'area del bounding box come riferimento informativo.
 */

const FALLBACK_RAPID_FEED = 4000; // mm/min — usata solo se la macchina non ha un valore proprio impostato

/**
 * Simula l'esecuzione del G-code per stimare tempo totale e area occupata.
 * Supporta sia coordinate relative (G91, il caso più comune per LightBurn)
 * sia assolute (G90).
 * @param {string} text
 * @param {number} rapidFeed - velocità (mm/min) usata per i movimenti G0 senza F esplicito
 */
function simulateGcodeTime(text, rapidFeed = FALLBACK_RAPID_FEED) {
  const lines = text.split('\n');
  let x = 0, y = 0;
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  let feed = 0;
  let relative = true; // LightBurn usa quasi sempre G91; se il file dichiara G90 lo rileviamo sotto
  let totalMinutes = 0;
  let moveCount = 0;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith(';')) continue;

    if (/^G91\b/.test(line)) { relative = true; continue; }
    if (/^G90\b/.test(line)) { relative = false; continue; }

    const isG0 = /^G0\b/.test(line);
    const isG1 = /^G1\b/.test(line);
    if (!isG0 && !isG1) continue;

    const xm = line.match(/X(-?[\d.]+)/);
    const ym = line.match(/Y(-?[\d.]+)/);
    const fm = line.match(/F(-?[\d.]+)/);
    if (fm) feed = Number(fm[1]);

    let dx = 0, dy = 0;
    if (relative) {
      dx = xm ? Number(xm[1]) : 0;
      dy = ym ? Number(ym[1]) : 0;
      x += dx; y += dy;
    } else {
      const newX = xm ? Number(xm[1]) : x;
      const newY = ym ? Number(ym[1]) : y;
      dx = newX - x; dy = newY - y;
      x = newX; y = newY;
    }

    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;

    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      moveCount++;
      const effectiveFeed = feed > 0 ? feed : rapidFeed;
      totalMinutes += dist / effectiveFeed;
    }
  }

  return {
    hours: moveCount > 0 ? totalMinutes / 60 : null,
    widthMm:  Math.round((maxX - minX) * 100) / 100,
    heightMm: Math.round((maxY - minY) * 100) / 100,
    moveCount,
  };
}

/**
 * Analizza un file .gcode esportato da LightBurn (o simili) per il laser.
 * @param {File}   file
 * @param {number} [rapidFeed] - velocità (mm/min) dei movimenti a vuoto della macchina selezionata
 * @returns {Promise<{hours:number|null, widthMm:number, heightMm:number, warning:string|null}>}
 */
export async function parseLaserGcodeFile(file, rapidFeed) {
  const text = await file.text();
  const { hours, widthMm, heightMm, moveCount } = simulateGcodeTime(text, rapidFeed);

  let warning = null;
  if (moveCount === 0 || hours === null) {
    warning = 'Non ho trovato movimenti G0/G1 validi in questo file. Verifica che sia un G-code esportato da LightBurn (o software compatibile).';
  } else {
    warning = `Tempo stimato simulando il percorso (velocità dichiarate nel file). Area lavorata: ${widthMm} × ${heightMm} mm — usalo come riferimento per stimare quanti fogli/pezzi/metri di materiale servono, in base alla tua unità di misura.`;
  }

  return { hours, widthMm, heightMm, warning };
}
