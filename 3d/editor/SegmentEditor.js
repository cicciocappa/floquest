// Editor MVP per i segment del livello caricato.
//
// Caricato da editor.html. In editor mode il livello non viene auto-eseguito:
// il personaggio viene solo spawnato a `anchor_player_start` (per dare un
// visual baseline) e l'utente decide cosa testare via il pannello.
//
// Funzionalità Fase 1:
//   - Carica i segment dal JSON specificato (segmentsPath)
//   - Lista clickabile dei segment a sinistra
//   - CodeMirror (JSON mode) per editing testuale del segment selezionato
//   - "Spawn at" dropdown per posizionare il character su un anchor a scelta
//   - "Play" per eseguire il segment corrente in isolamento
//   - "Save" per fare PUT del JSON aggiornato sul dev server
//   - Ctrl+S = salva, dirty marker (asterisco) sul nome del segment
//
// Funzionalità Fase 2 (read-only timeline):
//   - Striscia timeline sopra il CM, una lane per (soggetto, tipo): character,
//     camera, props.<id>. Blocchi colorati alle posizioni `at`/`duration`,
//     marker sottili per i trigger istantanei (characterAnim, cameraFollow).
//   - Tooltip al hover col JSON della track. Re-render con debounce 200ms sui
//     cambi del CM (silenzioso se il JSON è invalido: si tiene l'ultimo valido).
//
// Funzionalità Fase 3 (inspector schema-driven):
//   - Click su una clip della timeline → tab Inspector con form per i campi
//     della track. Schema in TRACK_SCHEMAS (allineato con engine/Segment.js).
//   - Field types: number, enum (easings), bool, animClip (dropdown clip char),
//     prop (dropdown prop), pos (anchor+offset / literal vec3 toggle), propTo
//     (lista key/value chiusa su PROP_TO_KEYS). Anchor select usa director.anchors.
//   - Source-of-truth = oggetto JS in state.segments. Form muta direttamente
//     l'oggetto e chiama applyChange → rigenera CM (suppress) e timeline.
//   - CM editato a mano → debounce 200ms → re-popola anche l'inspector.
//   - Tab Inspector disabilitato finché non clicchi una clip; ridiventa disabled
//     se la clip selezionata sparisce per un edit del JSON.
//
// Funzionalità Fase 4 (direct manipulation timeline):
//   - Drag sul corpo della clip → cambia `at` (duration invariata).
//   - Drag sul bordo destro → cambia `duration` (left edge fisso).
//   - Drag sul bordo sinistro → cambia `at` + `duration` (right edge fisso).
//   - Markers (duration=0) supportano solo move.
//   - Click senza movimento → comportamento legacy (selectTrack).
//   - Snap 10ms di default, free (1ms) con Alt.
//   - totalMs snapshottato a inizio drag per non far rescalare la timeline
//     sotto al cursore. Rebuild completo (timeline+CM+dirty) solo al drop.
//
// Funzionalità Fase 5 (add/remove track):
//   - "+ Add track" come select dentro alla `.timeline-actions` (footer
//     della timeline) — è un'azione sul segment, sta vicino alle track.
//   - "⎘ duplica" / "× rimuovi" dentro all'`.inspector-header` insieme al
//     breadcrumb della clip selezionata. Sono azioni contestuali alla clip
//     in editing, e l'inspector è il posto dove la clip è "aperta".
//   - Add: default values prodotti da defaultTrackFor() sfruttando gli
//     anchor/clip/prop disponibili nel director. Append a seg.tracks, la
//     nuova clip diventa la selezione, view → inspector.
//   - Duplicate: deep clone via JSON round-trip (la track è pure-data),
//     stesso `at`, append a fine lista, la copia diventa selezione.
//   - Remove: splice + deselezione + view → JSON. Niente confirm: il dirty
//     marker e Ctrl+Z (Fase 9) sono la rete.
//   - Toolbar: ridotta a sole tab JSON / Inspector. Niente più breadcrumb
//     o action buttons: erano confusi e affamavano lo spazio orizzontale.
//
// Salvataggio: fa PUT a `/save/<segmentsPath>`. Il dev_server.py scrive il
// file relativo alla CWD da cui è stato lanciato (tipicamente `3d/`).

import { loadCodeMirror, CM_THEME_HREF } from './codemirror-loader.js';

const _injectedCSS = new Set();
function injectCSS(href) {
  if (_injectedCSS.has(href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
  _injectedCSS.add(href);
}

export async function setupEditor({ director, segmentsPath }) {
  // CSS via link (l'`import ... with { type: 'css' }` non è universale).
  injectCSS(new URL('./SegmentEditor.css', import.meta.url).href);

  const CodeMirror = await loadCodeMirror();
  injectCSS(CM_THEME_HREF);

  const segments = await fetch(segmentsPath, { cache: 'no-store' })
    .then(r => r.json());

  const state = {
    segments,
    segmentsPath,
    currentId: null,
    selectedTrackIndex: null, // indice nella seg.tracks della clip aperta nell'inspector
    view: 'json',             // 'json' | 'inspector'
    dirty: false,
    director,
    cm: null,
  };

  buildPanel(state, CodeMirror);

  // Selezione iniziale: primo segment.
  const firstId = Object.keys(segments)[0];
  if (firstId) selectSegment(state, firstId);
}

function buildPanel(state, CodeMirror) {
  const panel = document.createElement('div');
  panel.id = 'seg-editor';
  panel.innerHTML = `
    <header>
      <span class="title">Segment editor</span>
      <button class="close" title="Nascondi">−</button>
    </header>
    <div class="body">
      <aside class="seg-list"></aside>
      <main class="seg-edit">
        <div class="timeline">
          <div class="timeline-ruler"></div>
          <div class="timeline-lanes"></div>
          <div class="timeline-tooltip" hidden></div>
          <div class="timeline-actions">
            <select class="add-track" title="Aggiungi track al segment">
              <option value="">+ Add track</option>
            </select>
          </div>
        </div>
        <div class="edit-toolbar">
          <button class="view-tab json selected" data-view="json">JSON</button>
          <button class="view-tab inspector" data-view="inspector">Inspector</button>
        </div>
        <div class="cm-host"></div>
        <div class="inspector" hidden>
          <div class="inspector-header">
            <span class="inspector-title"></span>
            <button class="dup-track" disabled title="Duplica clip selezionata">⎘ duplica</button>
            <button class="rm-track"  disabled title="Rimuovi clip selezionata">× rimuovi</button>
          </div>
          <div class="inspector-fields"></div>
        </div>
        <div class="seg-error"></div>
      </main>
    </div>
    <footer>
      <label>Spawn at:</label>
      <select class="spawn-anchor"></select>
      <button class="play">▶ Play segment</button>
      <button class="save">Save</button>
      <span class="status"></span>
    </footer>
  `;
  document.body.appendChild(panel);

  // Lista segment
  const list = panel.querySelector('.seg-list');
  for (const id of Object.keys(state.segments)) {
    const item = document.createElement('div');
    item.className = 'seg-item';
    item.dataset.id = id;
    item.textContent = id;
    item.addEventListener('click', () => {
      if (state.dirty && !confirm(`Segment '${state.currentId}' ha modifiche non salvate. Scartare?`)) return;
      selectSegment(state, id);
    });
    list.appendChild(item);
  }

  // CodeMirror
  const host = panel.querySelector('.cm-host');
  state.cm = CodeMirror(host, {
    value: '',
    mode: { name: 'javascript', json: true },
    theme: 'material-darker',
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2,
    matchBrackets: true,
    lineWrapping: false,
  });
  state.cm.on('change', () => {
    // Suppress quando il CM è stato setValue() programmaticamente (es. da
    // applyChange dopo un edit del form): l'oggetto in memoria è già quello
    // sorgente, nessun re-parse né re-render serve.
    if (state._suppressCMChange) return;
    setDirty(state, true);
    // Re-render timeline con debounce: se il JSON è valido adotta, altrimenti
    // lascia l'ultima versione visibile (silently — l'errore appare solo a
    // Play/Save, qui non spammiamo).
    clearTimeout(state._timelineTimer);
    state._timelineTimer = setTimeout(() => {
      state._timelineTimer = null;
      syncStateFromCM(state, { quiet: true });
    }, 200);
  });

  // Spawn-at dropdown
  const spawnSelect = panel.querySelector('.spawn-anchor');
  const anchors = Object.keys(state.director.anchors).sort();
  for (const name of anchors) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    spawnSelect.appendChild(opt);
  }
  // Default: anchor_player_start se esiste, altrimenti il primo.
  if (anchors.includes('anchor_player_start')) spawnSelect.value = 'anchor_player_start';

  // Buttons
  panel.querySelector('.play').addEventListener('click', () => playCurrent(state));
  panel.querySelector('.save').addEventListener('click', () => saveCurrent(state));
  panel.querySelector('.close').addEventListener('click', () => panel.classList.toggle('collapsed'));

  // Tab JSON / Inspector. Inspector è sempre cliccabile: se non c'è una clip
  // selezionata, auto-selezioniamo la prima track con schema noto del segment
  // così l'utente vede subito un form invece di un tab inerte.
  panel.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      if (view === 'inspector' && state.selectedTrackIndex == null) {
        const seg = state.segments[state.currentId];
        const idx = (seg && seg.tracks || []).findIndex(t => TRACK_SCHEMAS[t.type]);
        if (idx >= 0) { selectTrack(state, idx); return; }
      }
      setView(state, view);
    });
  });

  // Add/duplicate/remove track (Fase 5). Le opzioni del select sono i type
  // che hanno uno schema noto (gli unici che sappiamo costruire con default
  // sensati). Il select è "azione monouso": dopo l'add torna al placeholder.
  const addSel = panel.querySelector('.add-track');
  for (const type of Object.keys(TRACK_SCHEMAS)) {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = TRACK_SCHEMAS[type].label;
    addSel.appendChild(opt);
  }
  addSel.addEventListener('change', () => {
    const type = addSel.value;
    addSel.value = '';
    if (type) addTrack(state, type);
  });
  panel.querySelector('.dup-track').addEventListener('click', () => duplicateTrack(state));
  panel.querySelector('.rm-track').addEventListener('click', () => removeTrack(state));

  // Ctrl+S
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrent(state);
    }
  });

  state.panel = panel;
  state.spawnSelect = spawnSelect;
}

function selectSegment(state, id) {
  state.currentId = id;
  state.selectedTrackIndex = null;
  const seg = state.segments[id];
  const json = JSON.stringify(seg, null, 2);
  state.cm.setValue(json);
  setDirty(state, false);

  state.panel.querySelectorAll('.seg-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });

  renderTimeline(state, seg);
  updateActionsState(state);
  setView(state, 'json');
}

function setDirty(state, dirty) {
  state.dirty = dirty;
  if (!state.currentId) return;
  const item = state.panel.querySelector(`.seg-item[data-id="${state.currentId}"]`);
  if (item) item.classList.toggle('dirty', dirty);
  state.panel.querySelector('.save').classList.toggle('dirty', dirty);
}

function setStatus(state, text, color = '#9eea7a') {
  const el = state.panel.querySelector('.status');
  el.textContent = text;
  el.style.color = color;
  if (text) setTimeout(() => { if (el.textContent === text) el.textContent = ''; }, 3000);
}

function setError(state, text) {
  state.panel.querySelector('.seg-error').textContent = text || '';
}

// Re-parse del CM e adopt come source-of-truth: rimpiazza state.segments[id]
// e rinrendera viste dipendenti (timeline + inspector). Chiamata sia dal
// debounce CM-edit che da play/save per flushare un debounce in attesa.
//
// IMPORTANTE: questa funzione **rimpiazza** l'oggetto in state.segments[id].
// Eventuali closures dell'inspector che catturano `track` da un render
// precedente diventano stale dopo questa chiamata — per questo rinrenderiamo
// l'inspector se aperto, così le nuove closures puntano al nuovo oggetto.
//
// `quiet: true` per il debounce (utente sta digitando, JSON spesso invalido
// mid-edit), default false per Play/Save (errore visibile per intenzionalità).
function syncStateFromCM(state, { quiet = false } = {}) {
  try {
    const obj = JSON.parse(state.cm.getValue());
    setError(state, '');
    state.segments[state.currentId] = obj;
    renderTimeline(state, obj);
    updateActionsState(state);
    if (state.view === 'inspector') {
      const tr = obj.tracks && obj.tracks[state.selectedTrackIndex];
      if (tr && TRACK_SCHEMAS[tr.type]) renderInspector(state);
      else setView(state, 'json');
    }
    return obj;
  } catch (e) {
    if (!quiet) setError(state, `JSON invalido: ${e.message}`);
    return null;
  }
}

// Flush un eventuale CM-debounce in attesa: se l'utente ha digitato in CM ma
// il timer dei 200ms non è ancora scaduto, state.segments è disallineato
// rispetto al CM. Adottiamo subito. Ritorna false se il JSON è invalido
// (cancella l'azione in corso).
function flushPendingCMDebounce(state) {
  if (!state._timelineTimer) return true;
  clearTimeout(state._timelineTimer);
  state._timelineTimer = null;
  return syncStateFromCM(state) !== null;
}

function playCurrent(state) {
  // Flush prima di leggere state.segments — può non essere sincronizzato
  // se l'utente ha digitato in CM <200ms fa. Fuori dal flush usiamo
  // direttamente la live reference: niente re-parse del CM, niente reassign.
  // Mantenere la reference è critico perché l'inspector ha closures che
  // catturarono il `track` al renderInspector — rimpiazzare l'oggetto le
  // rende stale (edit successivi del form vanno sull'oggetto orfano).
  if (!flushPendingCMDebounce(state)) return;

  const seg = state.segments[state.currentId];
  if (!seg) return;

  // Reset dello stato del mondo per replay deterministico (porta non rimane
  // a -3 dopo il primo play di door_drop, ecc.) e camera in follow.
  state.director.resetForEditor();

  // Spawn character all'anchor selezionato (per dare uno stato iniziale
  // coerente al test del segment).
  const anchorName = state.spawnSelect.value;
  const anchor = state.director.anchors[anchorName];
  if (anchor && state.director.character) {
    state.director.character.spawnAt(anchor);
  }

  state.director.segmentPlayer.play(seg).catch(err => {
    setStatus(state, `Errore play: ${err.message}`, '#ea7a7a');
  });
}

// ---------------------------------------------------------------------------
// Timeline (Fase 2 — read-only)

// Lane logica per track. Le clip degli stessi soggetti finiscono sulla stessa
// riga, e dentro lo stesso soggetto separiamo per "azione" così che blocchi
// (move/tween) e marker istantanei (anim/follow) non si sovrappongano.
function laneKeyForTrack(t) {
  switch (t.type) {
    case 'characterMove': return 'character.move';
    case 'characterAnim': return 'character.anim';
    case 'cameraMove':    return 'camera.move';
    case 'cameraFollow':  return 'camera.follow';
    case 'propTween':     return `props.${t.prop || '?'}`;
    default:              return t.type || 'unknown';
  }
}

// Priorità per l'ordinamento delle lane.
function lanePriority(key) {
  if (key.startsWith('character')) return 0;
  if (key.startsWith('camera'))    return 1;
  if (key.startsWith('props'))     return 2;
  return 3;
}

function trackEndAt(t) {
  return (t.at || 0) + (typeof t.duration === 'number' ? t.duration : 0);
}

// Durata totale del segment per la timeline. `duration` numerica vince; se è
// `{until: ...}` o assente, fallback al max end-time delle track + 100ms.
function computeTotalMs(seg) {
  if (typeof seg.duration === 'number') return seg.duration;
  let max = 0;
  for (const t of (seg.tracks || [])) max = Math.max(max, trackEndAt(t));
  return max > 0 ? max + 100 : 1000;
}

// Tick interval in ms scelto in base alla durata totale (target ≈ 5–10 tick).
function chooseTickMs(totalMs) {
  if (totalMs <= 1500)  return 250;
  if (totalMs <= 4000)  return 500;
  if (totalMs <= 12000) return 1000;
  if (totalMs <= 30000) return 2000;
  return 5000;
}

function fmtSec(ms) {
  const s = ms / 1000;
  // Striscia gli zero finali ("0.5s" invece di "0.50s", "1s" invece di "1.0s").
  return `${parseFloat(s.toFixed(2))}s`;
}

function renderTimeline(state, seg) {
  const ruler = state.panel.querySelector('.timeline-ruler');
  const lanesEl = state.panel.querySelector('.timeline-lanes');
  ruler.innerHTML = '';
  lanesEl.innerHTML = '';

  if (!seg || !Array.isArray(seg.tracks)) return;

  const totalMs = computeTotalMs(seg);
  const tickMs = chooseTickMs(totalMs);

  // Ruler: tacche da 0 a totalMs incluso.
  for (let t = 0; t <= totalMs + 0.5; t += tickMs) {
    const tick = document.createElement('div');
    tick.className = 'tick';
    tick.style.left = `${(t / totalMs) * 100}%`;
    const label = document.createElement('span');
    label.textContent = fmtSec(t);
    tick.appendChild(label);
    ruler.appendChild(tick);
  }

  // Raggruppa track per lane (preservando l'indice originale per click handling).
  const lanes = new Map();
  for (let i = 0; i < seg.tracks.length; i++) {
    const tr = seg.tracks[i];
    const key = laneKeyForTrack(tr);
    if (!lanes.has(key)) lanes.set(key, []);
    lanes.get(key).push({ tr, index: i });
  }

  // Ordina lane per priorità (character → camera → props → altro), poi alfa.
  const sortedKeys = [...lanes.keys()].sort((a, b) => {
    const pa = lanePriority(a), pb = lanePriority(b);
    return pa !== pb ? pa - pb : a.localeCompare(b);
  });

  for (const key of sortedKeys) {
    const lane = document.createElement('div');
    lane.className = 'lane';
    lane.innerHTML = `
      <div class="lane-label" title="${key}">${key}</div>
      <div class="lane-track"></div>
    `;
    const track = lane.querySelector('.lane-track');

    for (const { tr, index } of lanes.get(key)) {
      const clip = document.createElement('div');
      const at = tr.at || 0;
      const dur = (typeof tr.duration === 'number') ? tr.duration : 0;
      const isMarker = dur === 0;
      const isSelected = state.selectedTrackIndex === index;
      clip.className = `clip t-${tr.type}${isMarker ? ' marker' : ''}${isSelected ? ' selected' : ''}`;
      clip.style.left = `${(at / totalMs) * 100}%`;
      if (!isMarker) {
        clip.style.width = `${(dur / totalMs) * 100}%`;
      }
      clip.dataset.trackIndex = index;
      clip.textContent = clipLabel(tr);
      bindTooltip(state, clip, tr);
      bindClipDrag(state, clip, tr, index);
      track.appendChild(clip);
    }

    lanesEl.appendChild(lane);
  }
}

// Label sintetica dentro al blocco (entra solo se c'è spazio).
function clipLabel(t) {
  switch (t.type) {
    case 'characterMove': return 'move';
    case 'characterAnim': return t.clip || 'anim';
    case 'cameraMove':    return 'cam';
    case 'cameraFollow':  return 'follow';
    case 'propTween':     return 'tween';
    default:              return t.type || '';
  }
}

function bindTooltip(state, el, track) {
  const tooltip = state.panel.querySelector('.timeline-tooltip');
  el.addEventListener('mouseenter', () => {
    if (el._dragging) return;
    tooltip.textContent = JSON.stringify(track, null, 2);
    tooltip.hidden = false;
  });
  el.addEventListener('mousemove', (e) => {
    if (el._dragging) return;
    // Coordinate relative al parent del tooltip (.timeline, position:relative).
    const host = tooltip.parentElement.getBoundingClientRect();
    const x = e.clientX - host.left + 10;
    const y = e.clientY - host.top - 6;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.transform = 'translateY(-100%)';
  });
  el.addEventListener('mouseleave', () => { tooltip.hidden = true; });
}

// ---------------------------------------------------------------------------
// Direct manipulation (Fase 4)

// Zona sui bordi della clip riconosciuta come resize. 6px è abbastanza largo
// da centrare con il mouse senza sforzo, abbastanza stretto da non rubare lo
// spazio del move su clip di durata media (>30ms a tipica scala timeline).
const EDGE_GRAB_PX = 6;

function bindClipDrag(state, clip, track, index) {
  // `isMarker` snapshottato al bind: durante un drag in corso il flag non
  // cambia (il resize è disabilitato sui marker, quindi non c'è promozione
  // marker→block durante il drag). Su drop la timeline rinrendera, e il
  // nuovo clip element prende il flag corretto dai dati.
  const isMarker = !(typeof track.duration === 'number' && track.duration > 0);

  clip.style.cursor = 'grab';
  if (!isMarker) {
    // Hover cursor: ew-resize entro EDGE_GRAB_PX dai bordi, grab nel centro.
    clip.addEventListener('mousemove', (e) => {
      if (clip._dragging) return;
      const rect = clip.getBoundingClientRect();
      const x = e.clientX - rect.left;
      clip.style.cursor = (x <= EDGE_GRAB_PX || x >= rect.width - EDGE_GRAB_PX)
        ? 'ew-resize'
        : 'grab';
    });
  }

  clip.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Mode dipende da dove cade il click sulla clip.
    let mode = 'move';
    if (!isMarker) {
      const rect = clip.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x <= EDGE_GRAB_PX) mode = 'resize-left';
      else if (x >= rect.width - EDGE_GRAB_PX) mode = 'resize-right';
    }

    // Snapshot di tutto ciò che serve per la conversione px↔ms. totalMs è
    // congelato: se lasciassi auto-fittare durante il drag, allungare una
    // clip farebbe rescalare la timeline sotto al cursore e la clip
    // scivolerebbe via dal mouse.
    const seg = state.segments[state.currentId];
    const totalMs = computeTotalMs(seg);
    const laneTrackEl = clip.parentElement; // .lane-track
    const trackWidthPx = laneTrackEl.getBoundingClientRect().width;
    const pxToMs = trackWidthPx > 0 ? totalMs / trackWidthPx : 1;

    const startMouseX = e.clientX;
    const startAt = track.at || 0;
    const startDur = (typeof track.duration === 'number') ? track.duration : 0;

    let dragged = false;
    clip._dragging = true;

    // Cursor globale + niente selezione testo durante il drag.
    const prevBodyCursor = document.body.style.cursor;
    document.body.style.cursor = (mode === 'move') ? 'grabbing' : 'ew-resize';
    document.body.style.userSelect = 'none';

    // Hide tooltip — durante il drag il mouse può rientrare sulla clip e
    // farlo riaccendere via mouseenter (gated da `_dragging` in bindTooltip).
    const tooltip = state.panel.querySelector('.timeline-tooltip');
    if (tooltip) tooltip.hidden = true;

    const onMove = (ev) => {
      const dx = ev.clientX - startMouseX;
      // Threshold 2px per non promuovere a drag un click "scaduto".
      if (!dragged && Math.abs(dx) < 2) return;
      dragged = true;

      // Snap: 10ms default, 1ms (free) con Alt held.
      const snap = ev.altKey ? 1 : 10;
      const dms = Math.round((dx * pxToMs) / snap) * snap;

      if (mode === 'move') {
        const newAt = Math.max(0, startAt + dms);
        track.at = newAt;
        clip.style.left = `${(newAt / totalMs) * 100}%`;
      } else if (mode === 'resize-right') {
        const newDur = Math.max(0, startDur + dms);
        track.duration = newDur;
        clip.style.width = `${(newDur / totalMs) * 100}%`;
      } else { // 'resize-left': bordo destro fisso → newAt + newDur = startAt + startDur
        let newAt = Math.max(0, startAt + dms);
        let newDur = startDur - (newAt - startAt);
        if (newDur < 0) {
          // Mouse oltre il bordo destro: pin alla collisione (durata 0).
          newDur = 0;
          newAt = startAt + startDur;
        }
        track.at = newAt;
        track.duration = newDur;
        clip.style.left  = `${(newAt  / totalMs) * 100}%`;
        clip.style.width = `${(newDur / totalMs) * 100}%`;
      }

      // Live update inspector se aperto sulla stessa clip. CM viene NON
      // aggiornato per move (setValue ad ogni mousemove flickera ed è caro);
      // resta disallineato fino al drop, momento in cui applyChange lo sincra.
      if (state.view === 'inspector' && state.selectedTrackIndex === index) {
        renderInspector(state);
        updateInspectorTitle(state);
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = prevBodyCursor;
      document.body.style.userSelect = '';
      clip._dragging = false;

      if (dragged) {
        // Drag concluso → eager-select (l'utente ha "preso" la clip).
        // Non cambio view: drag in JSON resta in JSON, drag in inspector
        // resta in inspector. applyChange rinrendera timeline + CM + dirty.
        state.selectedTrackIndex = index;
        applyChange(state);
        updateActionsState(state);
        if (state.view === 'inspector') renderInspector(state);
      } else {
        // Click puro (no movimento) → comportamento legacy.
        selectTrack(state, index);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}

// ---------------------------------------------------------------------------
// Vista JSON / Inspector toggle e selezione clip (Fase 3)

function setView(state, view) {
  // L'inspector resta visualizzabile anche senza selezione: renderInspector
  // mostra un hint "click a clip" invece di lasciare il pannello vuoto.
  state.view = view;

  const cmHost = state.panel.querySelector('.cm-host');
  // `div.inspector`, non `.inspector`: la classe è condivisa con il bottone
  // del tab (<button class="view-tab inspector">), e querySelector
  // ritornerebbe quello, lasciando il form sempre hidden.
  const inspector = state.panel.querySelector('div.inspector');
  cmHost.hidden = view !== 'json';
  inspector.hidden = view !== 'inspector';

  state.panel.querySelectorAll('.view-tab').forEach(tab => {
    tab.classList.toggle('selected', tab.dataset.view === view);
  });

  if (view === 'inspector') {
    renderInspector(state);
  } else {
    // Refresh CM perché il layout viene calcolato male se era hidden.
    setTimeout(() => state.cm.refresh && state.cm.refresh(), 0);
  }
}

// Stato dei bottoni di azione gated dalla selezione.
//   - Inspector tab: sempre cliccabile (auto-seleziona la prima clip con
//     schema noto al click se nulla è selezionato).
//   - Duplicate/Remove: qualsiasi clip selezionata, anche di type ignoto
//     (la rimozione non richiede schema, e duplicare un type unknown è
//     occasionalmente utile per ribattere clip legacy).
function updateActionsState(state) {
  const seg = state.segments[state.currentId];
  const tr = seg && seg.tracks && seg.tracks[state.selectedTrackIndex];
  const trackSelected = !!tr;

  const dup = state.panel.querySelector('.dup-track');
  if (dup) dup.disabled = !trackSelected;
  const rm = state.panel.querySelector('.rm-track');
  if (rm) rm.disabled = !trackSelected;
}

function selectTrack(state, index) {
  const seg = state.segments[state.currentId];
  const tr = seg && seg.tracks && seg.tracks[index];
  if (!tr) return;

  state.selectedTrackIndex = index;
  updateActionsState(state);
  updateInspectorTitle(state);

  // Highlight nella timeline (re-render rapido per applicare classe .selected).
  state.panel.querySelectorAll('.clip').forEach(el => {
    el.classList.toggle('selected', Number(el.dataset.trackIndex) === index);
  });

  // Switch view (ricade su JSON se schema sconosciuto).
  setView(state, 'inspector');
}

// Header dell'inspector con il breadcrumb della clip ('Character move @ 0ms').
// Stringa vuota se nessuna selezione (l'header è comunque hidden con
// l'inspector quando in vista JSON).
function updateInspectorTitle(state) {
  const title = state.panel.querySelector('.inspector-title');
  if (!title) return;
  const seg = state.segments[state.currentId];
  const tr = seg && seg.tracks && seg.tracks[state.selectedTrackIndex];
  if (!tr) { title.textContent = ''; return; }
  const schema = TRACK_SCHEMAS[tr.type];
  title.textContent = schema
    ? `${schema.label} @ ${tr.at || 0}ms`
    : `Unknown type '${tr.type}' — JSON only`;
}

// ---------------------------------------------------------------------------
// Inspector schema-driven (Fase 3)

// Schema dei track types noti. Ogni field ha un `type` che determina il
// renderer da usare in `renderInspector`. Tieni allineato con i type
// supportati in engine/Segment.js (PROP_KEYS, EASINGS, _fireTrack).
const EASINGS_VALUES = ['linear', 'in', 'out', 'inOut', 'smoothstep'];

const TRACK_SCHEMAS = {
  characterMove: {
    label: 'Character move',
    fields: [
      { key: 'at',       type: 'number', label: 'At (ms)',       default: 0,    min: 0 },
      { key: 'to',       type: 'pos',    label: 'To',            required: true },
      { key: 'duration', type: 'number', label: 'Duration (ms)', default: 1000, min: 0 },
      { key: 'ease',     type: 'enum',   label: 'Ease',          default: 'linear', values: EASINGS_VALUES },
    ],
  },
  characterAnim: {
    label: 'Character anim',
    fields: [
      { key: 'at',   type: 'number',   label: 'At (ms)', default: 0, min: 0 },
      { key: 'clip', type: 'animClip', label: 'Clip',    required: true },
      { key: 'loop', type: 'bool',     label: 'Loop',    default: true },
    ],
  },
  cameraMove: {
    label: 'Camera move',
    fields: [
      { key: 'at',       type: 'number', label: 'At (ms)',       default: 0,    min: 0 },
      { key: 'pos',      type: 'pos',    label: 'Position',      required: true },
      { key: 'lookAt',   type: 'pos',    label: 'LookAt',        required: true },
      { key: 'duration', type: 'number', label: 'Duration (ms)', default: 1000, min: 0 },
      { key: 'ease',     type: 'enum',   label: 'Ease',          default: 'inOut', values: EASINGS_VALUES },
    ],
  },
  cameraFollow: {
    label: 'Camera follow',
    fields: [
      { key: 'at',           type: 'number', label: 'At (ms)',         default: 0,   min: 0 },
      { key: 'transitionMs', type: 'number', label: 'Transition (ms)', default: 500, min: 0 },
    ],
  },
  propTween: {
    label: 'Prop tween',
    fields: [
      { key: 'at',       type: 'number', label: 'At (ms)',       default: 0,    min: 0 },
      { key: 'prop',     type: 'prop',   label: 'Prop',          required: true },
      { key: 'to',       type: 'propTo', label: 'To',            required: true },
      { key: 'duration', type: 'number', label: 'Duration (ms)', default: 1000, min: 0 },
      { key: 'ease',     type: 'enum',   label: 'Ease',          default: 'smoothstep', values: EASINGS_VALUES },
    ],
  },
};

// Chiavi numeriche valide per propTween.to (mirror di PROP_KEYS in Segment.js).
const PROP_TO_KEYS = ['posX', 'posY', 'posZ', 'rotX', 'rotY', 'rotZ', 'scale'];

// Renderizza il form della clip selezionata. Source-of-truth = oggetto JS in
// state.segments[currentId].tracks[selectedTrackIndex]; ogni field onChange
// muta direttamente la track e chiama applyChange() per propagare a CM/timeline.
// Popola SOLO .inspector-fields: l'.inspector-header (title + dup/rm) è
// statico, viene aggiornato separatamente da updateInspectorTitle.
function renderInspector(state) {
  const fields = state.panel.querySelector('.inspector-fields');
  fields.innerHTML = '';

  const seg = state.segments[state.currentId];
  const track = seg && seg.tracks && seg.tracks[state.selectedTrackIndex];
  if (!track) {
    const hasTracks = seg && Array.isArray(seg.tracks) && seg.tracks.length > 0;
    fields.className = 'inspector-fields hint';
    fields.textContent = hasTracks
      ? 'Clicca una clip della timeline per modificarla.'
      : 'Questo segment non ha track. Usa "+ Add track" per aggiungerne una.';
    return;
  }
  fields.className = 'inspector-fields';
  const schema = TRACK_SCHEMAS[track.type];
  if (!schema) {
    fields.classList.add('hint');
    fields.textContent = `Type '${track.type}' senza schema. Usa la vista JSON.`;
    return;
  }

  for (const field of schema.fields) {
    const row = document.createElement('div');
    row.className = 'field';
    row.innerHTML = `<label>${field.label}</label><div class="control"></div>`;
    const ctl = row.querySelector('.control');
    renderField(state, field, track, ctl);
    fields.appendChild(row);
  }
}

// Dispatcher per i renderer di field. Ogni renderer riceve (state, field,
// track, host) e wireì gli input handler per mutare track[field.key] e
// chiamare applyChange.
function renderField(state, field, track, host) {
  const renderers = {
    number:   renderFieldNumber,
    enum:     renderFieldEnum,
    bool:     renderFieldBool,
    string:   renderFieldString,
    pos:      renderFieldPos,
    propTo:   renderFieldPropTo,
    animClip: renderFieldAnimClip,
    prop:     renderFieldProp,
    anchor:   renderFieldAnchor,
  };
  const fn = renderers[field.type];
  if (!fn) {
    host.textContent = `(no renderer for type '${field.type}')`;
    return;
  }
  fn(state, field, track, host);
}

function renderFieldNumber(state, field, track, host) {
  const input = document.createElement('input');
  input.type = 'number';
  if (field.min != null) input.min = field.min;
  if (field.max != null) input.max = field.max;
  input.value = (track[field.key] != null) ? track[field.key] : (field.default ?? '');
  input.addEventListener('input', () => {
    const v = input.value === '' ? null : parseFloat(input.value);
    if (v == null || Number.isNaN(v)) delete track[field.key];
    else track[field.key] = v;
    applyChange(state);
  });
  host.appendChild(input);
}

function renderFieldEnum(state, field, track, host) {
  const sel = document.createElement('select');
  for (const v of field.values) {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    sel.appendChild(opt);
  }
  sel.value = track[field.key] ?? field.default ?? field.values[0];
  sel.addEventListener('change', () => {
    track[field.key] = sel.value;
    applyChange(state);
  });
  host.appendChild(sel);
}

function renderFieldBool(state, field, track, host) {
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = (track[field.key] != null) ? !!track[field.key] : !!field.default;
  cb.addEventListener('change', () => {
    track[field.key] = cb.checked;
    applyChange(state);
  });
  host.appendChild(cb);
}

function renderFieldString(state, field, track, host) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = track[field.key] ?? field.default ?? '';
  input.addEventListener('input', () => {
    track[field.key] = input.value;
    applyChange(state);
  });
  host.appendChild(input);
}

function renderFieldAnimClip(state, field, track, host) {
  const clips = state.director.character ? Object.keys(state.director.character.clips) : [];
  if (clips.length === 0) {
    // Fallback a text input se non ci sono clip caricate.
    return renderFieldString(state, field, track, host);
  }
  const sel = document.createElement('select');
  for (const c of clips.sort()) {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    sel.appendChild(opt);
  }
  // Match case-insensitive (Character.play è permissivo).
  const cur = (track[field.key] || '').toLowerCase();
  if (clips.includes(cur)) sel.value = cur;
  sel.addEventListener('change', () => {
    track[field.key] = sel.value;
    applyChange(state);
  });
  host.appendChild(sel);
}

function renderFieldProp(state, field, track, host) {
  const props = Object.keys(state.director.props || {});
  if (props.length === 0) return renderFieldString(state, field, track, host);
  const sel = document.createElement('select');
  for (const p of props.sort()) {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p;
    sel.appendChild(opt);
  }
  if (props.includes(track[field.key])) sel.value = track[field.key];
  sel.addEventListener('change', () => {
    track[field.key] = sel.value;
    applyChange(state);
  });
  host.appendChild(sel);
}

function renderFieldAnchor(state, field, track, host) {
  const anchors = Object.keys(state.director.anchors || {}).sort();
  const sel = document.createElement('select');
  for (const a of anchors) {
    const opt = document.createElement('option');
    opt.value = a; opt.textContent = a;
    sel.appendChild(opt);
  }
  if (anchors.includes(track[field.key])) sel.value = track[field.key];
  sel.addEventListener('change', () => {
    track[field.key] = sel.value;
    applyChange(state);
  });
  host.appendChild(sel);
}

// Position composite: due modalità (anchor+offset / literal vec3). Detection
// dal tipo del valore corrente; toggle mode preserva i valori "naturali" dei
// componenti (se passi da literal a anchor mantieni il vec3 come offset).
function renderFieldPos(state, field, track, host) {
  // Normalizza {x,y,z} -> [x,y,z] al primo render così non lo si ripaga dopo.
  let val = track[field.key];
  if (val && typeof val === 'object' && !Array.isArray(val) && !val.anchor &&
      ('x' in val || 'y' in val || 'z' in val)) {
    val = [val.x || 0, val.y || 0, val.z || 0];
    track[field.key] = val;
  }
  const isLiteral = Array.isArray(val);
  const mode = isLiteral ? 'literal' : 'anchor';

  const body = document.createElement('div');
  body.className = 'pos-body';
  // Mode toggle.
  const modeRow = document.createElement('div');
  modeRow.className = 'pos-row';
  const toggle = document.createElement('div');
  toggle.className = 'pos-mode';
  for (const m of ['anchor', 'literal']) {
    const btn = document.createElement('button');
    btn.textContent = m;
    btn.className = (m === mode) ? 'selected' : '';
    btn.addEventListener('click', () => {
      if (m === mode) return;
      // Switch mode preservando i numeri.
      if (m === 'literal') {
        // anchor → literal: usa l'offset corrente come vec3 (o [0,0,0]).
        const cur = track[field.key] || {};
        track[field.key] = (cur.offset && cur.offset.slice()) || [0, 0, 0];
      } else {
        // literal → anchor: vec3 corrente diventa offset, anchor = primo disponibile.
        const anchors = Object.keys(state.director.anchors || {}).sort();
        const cur = Array.isArray(track[field.key]) ? track[field.key] : [0, 0, 0];
        track[field.key] = { anchor: anchors[0] || '', offset: cur.slice() };
      }
      applyChange(state);
      // Re-render del field per riflettere il nuovo mode.
      host.innerHTML = '';
      renderFieldPos(state, field, track, host);
    });
    toggle.appendChild(btn);
  }
  modeRow.appendChild(toggle);
  body.appendChild(modeRow);

  if (mode === 'anchor') {
    // Anchor select.
    const anchorRow = document.createElement('div');
    anchorRow.className = 'pos-row';
    anchorRow.innerHTML = '<span class="sublabel">anchor</span>';
    const anchors = Object.keys(state.director.anchors || {}).sort();
    const sel = document.createElement('select');
    for (const a of anchors) {
      const opt = document.createElement('option');
      opt.value = a; opt.textContent = a;
      sel.appendChild(opt);
    }
    const cur = track[field.key] || {};
    if (anchors.includes(cur.anchor)) sel.value = cur.anchor;
    sel.addEventListener('change', () => {
      const v = track[field.key] || {};
      v.anchor = sel.value;
      track[field.key] = v;
      applyChange(state);
    });
    anchorRow.appendChild(sel);
    body.appendChild(anchorRow);

    // Offset (3 numeri).
    const offsetRow = document.createElement('div');
    offsetRow.className = 'pos-row';
    offsetRow.innerHTML = '<span class="sublabel">offset</span>';
    const vec3 = makeVec3Input(cur.offset || [0, 0, 0], (arr) => {
      const v = track[field.key] || {};
      // Se offset è tutto zero, rimuovilo per pulizia.
      if (arr.every(n => n === 0)) delete v.offset;
      else v.offset = arr;
      track[field.key] = v;
      applyChange(state);
    });
    offsetRow.appendChild(vec3);
    body.appendChild(offsetRow);
  } else {
    // Literal vec3.
    const litRow = document.createElement('div');
    litRow.className = 'pos-row';
    litRow.innerHTML = '<span class="sublabel">x/y/z</span>';
    const vec3 = makeVec3Input(track[field.key] || [0, 0, 0], (arr) => {
      track[field.key] = arr;
      applyChange(state);
    });
    litRow.appendChild(vec3);
    body.appendChild(litRow);
  }

  host.appendChild(body);
}

// 3 input number affiancati, con label "x/y/z" mini. onChange riceve l'array.
function makeVec3Input(initial, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'vec3';
  const inputs = ['x', 'y', 'z'].map((axis, i) => {
    const span = document.createElement('span');
    span.className = 'axis';
    span.textContent = axis;
    wrap.appendChild(span);
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.step = '0.1';
    inp.value = initial[i] != null ? initial[i] : 0;
    inp.addEventListener('input', () => {
      const arr = inputs.map(x => parseFloat(x.value) || 0);
      onChange(arr);
    });
    wrap.appendChild(inp);
    return inp;
  });
  return wrap;
}

// propTo: oggetto {posY: -3, scale: 1.2, ...}. UI = lista key/value editabili
// con add/remove. Le key sono enum chiuso (PROP_TO_KEYS).
function renderFieldPropTo(state, field, track, host) {
  const obj = track[field.key] || {};
  track[field.key] = obj; // assicura che esista anche se vuoto

  const wrap = document.createElement('div');
  wrap.style.flex = '1';
  wrap.style.minWidth = '0';

  for (const k of Object.keys(obj)) {
    wrap.appendChild(makePropToRow(state, field, track, k, obj[k]));
  }

  // Bottone add: dropdown con le keys non ancora usate.
  const unused = PROP_TO_KEYS.filter(k => !(k in obj));
  if (unused.length > 0) {
    const addBtn = document.createElement('button');
    addBtn.className = 'propto-add';
    addBtn.textContent = `+ add (${unused.join(', ')})`;
    addBtn.addEventListener('click', () => {
      // Promo a select.
      addBtn.replaceWith(makeAddPicker(state, field, track, unused, host));
    });
    wrap.appendChild(addBtn);
  }

  host.appendChild(wrap);
}

function makePropToRow(state, field, track, k, v) {
  const row = document.createElement('div');
  row.className = 'propto-row';

  const sel = document.createElement('select');
  for (const opt of PROP_TO_KEYS) {
    const o = document.createElement('option');
    o.value = opt; o.textContent = opt;
    sel.appendChild(o);
  }
  sel.value = k;
  sel.addEventListener('change', () => {
    const obj = track[field.key];
    if (sel.value === k) return;
    if (sel.value in obj) { sel.value = k; return; } // collisione: noop
    obj[sel.value] = obj[k];
    delete obj[k];
    applyChange(state);
    rerenderInspector(state);
  });

  const input = document.createElement('input');
  input.type = 'number';
  input.step = '0.1';
  input.value = v;
  input.addEventListener('input', () => {
    track[field.key][sel.value] = parseFloat(input.value) || 0;
    applyChange(state);
  });

  const rm = document.createElement('button');
  rm.className = 'remove';
  rm.textContent = '×';
  rm.title = 'Rimuovi';
  rm.addEventListener('click', () => {
    delete track[field.key][sel.value];
    applyChange(state);
    rerenderInspector(state);
  });

  row.appendChild(sel);
  row.appendChild(input);
  row.appendChild(rm);
  return row;
}

function makeAddPicker(state, field, track, unused, host) {
  const sel = document.createElement('select');
  const placeholder = document.createElement('option');
  placeholder.value = ''; placeholder.textContent = '— scegli key —';
  sel.appendChild(placeholder);
  for (const k of unused) {
    const o = document.createElement('option');
    o.value = k; o.textContent = k;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => {
    if (!sel.value) return;
    track[field.key][sel.value] = 0;
    applyChange(state);
    rerenderInspector(state);
  });
  return sel;
}

// Re-render dell'inspector mantenendo selezione + scroll position.
function rerenderInspector(state) {
  const root = state.panel.querySelector('div.inspector');
  const scroll = root.scrollTop;
  renderInspector(state);
  root.scrollTop = scroll;
}

// Sync dopo un edit dal form (o add/dup/remove): rigenera CM (suppresso) +
// timeline. Aggiorna sempre la toolbar info perché add/dup/remove possono
// aver cambiato la selezione, e l'extra cost è trascurabile. Marca dirty.
function applyChange(state) {
  const seg = state.segments[state.currentId];

  // 1. CM <- objeto (suppress per non triggerare il debounce inutile).
  state._suppressCMChange = true;
  state.cm.setValue(JSON.stringify(seg, null, 2));
  state._suppressCMChange = false;

  // 2. Timeline (mantiene la selezione via state.selectedTrackIndex).
  renderTimeline(state, seg);

  // 3. Toolbar info (riflette la track corrente, '' se nessuna).
  updateInspectorTitle(state);

  // 4. Dirty marker.
  setDirty(state, true);
}

// ---------------------------------------------------------------------------
// Add / duplicate / remove track (Fase 5)

// Costruisce una track default-popolata dato un type. Pesca i primi
// anchor/clip/prop disponibili dal director per evitare valori "vuoti" che
// crasherebbero al replay. Lo schema dei campi è in TRACK_SCHEMAS — il
// default qui ne è il companion runtime.
function defaultTrackFor(type, state) {
  const anchors = Object.keys(state.director.anchors || {}).sort();
  const firstAnchor = anchors[0] || '';
  const clips = state.director.character ? Object.keys(state.director.character.clips || {}) : [];
  const firstClip = clips.includes('idle') ? 'idle' : (clips[0] || 'idle');
  const props = Object.keys(state.director.props || {}).sort();
  const firstProp = props[0] || '';

  switch (type) {
    case 'characterMove':
      return {
        at: 0, type,
        to: firstAnchor ? { anchor: firstAnchor } : [0, 0, 0],
        duration: 1000, ease: 'linear',
      };
    case 'characterAnim':
      return { at: 0, type, clip: firstClip, loop: true };
    case 'cameraMove':
      // Pos/lookAt literal: l'utente li sintonizza subito a vista.
      return {
        at: 0, type,
        pos:    [0, 2, 5],
        lookAt: [0, 1, 0],
        duration: 1000, ease: 'inOut',
      };
    case 'cameraFollow':
      return { at: 0, type, transitionMs: 500 };
    case 'propTween':
      return {
        at: 0, type,
        prop: firstProp,
        to: { posY: 0 },
        duration: 1000, ease: 'smoothstep',
      };
    default:
      return { at: 0, type };
  }
}

function addTrack(state, type) {
  if (!state.currentId) return;
  if (!TRACK_SCHEMAS[type]) return;
  const seg = state.segments[state.currentId];
  if (!seg) return;
  if (!Array.isArray(seg.tracks)) seg.tracks = [];

  const tr = defaultTrackFor(type, state);
  seg.tracks.push(tr);
  state.selectedTrackIndex = seg.tracks.length - 1;
  applyChange(state);
  updateActionsState(state);
  setView(state, 'inspector');
}

function duplicateTrack(state) {
  const seg = state.segments[state.currentId];
  const i = state.selectedTrackIndex;
  if (!seg || !Array.isArray(seg.tracks) || !seg.tracks[i]) return;

  // Le track sono pure-data, deep clone via JSON è esatto e zero deps.
  const clone = JSON.parse(JSON.stringify(seg.tracks[i]));
  seg.tracks.push(clone);
  state.selectedTrackIndex = seg.tracks.length - 1;
  applyChange(state);
  updateActionsState(state);
  if (state.view === 'inspector') renderInspector(state);
}

function removeTrack(state) {
  const seg = state.segments[state.currentId];
  const i = state.selectedTrackIndex;
  if (!seg || !Array.isArray(seg.tracks) || !seg.tracks[i]) return;

  seg.tracks.splice(i, 1);
  state.selectedTrackIndex = null;
  applyChange(state);
  updateActionsState(state);
  // L'inspector non ha più una clip su cui puntare → torna alla vista JSON.
  setView(state, 'json');
}

// ---------------------------------------------------------------------------

async function saveCurrent(state) {
  // Stesso flush pattern di playCurrent: state è canonical, CM è una view.
  if (!flushPendingCMDebounce(state)) return;

  try {
    const res = await fetch(`/save/${state.segmentsPath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.segments, null, 2) + '\n',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setDirty(state, false);
    setStatus(state, '✓ Salvato');
  } catch (e) {
    setStatus(state, `✗ Save fallito: ${e.message}`, '#ea7a7a');
  }
}
