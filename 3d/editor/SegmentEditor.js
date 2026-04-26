// Editor MVP per i segment del livello caricato.
//
// Attivato passando `?editor=1` nell'URL di engine-demo.html. In editor mode
// il livello non viene auto-eseguito: il personaggio viene solo spawnato a
// `anchor_player_start` (per dare un visual baseline) e l'utente decide cosa
// testare via il pannello.
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
        <div class="cm-host"></div>
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
  state.cm.on('change', () => setDirty(state, true));

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
  const json = JSON.stringify(state.segments[id], null, 2);
  state.cm.setValue(json);
  setDirty(state, false);

  state.panel.querySelectorAll('.seg-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });
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

function parseCurrent(state) {
  try {
    const obj = JSON.parse(state.cm.getValue());
    setError(state, '');
    return obj;
  } catch (e) {
    setError(state, `JSON invalido: ${e.message}`);
    return null;
  }
}

function playCurrent(state) {
  const seg = parseCurrent(state);
  if (!seg) return;

  // Aggiorna in-memory così la prossima play e il save rispecchiano l'edit.
  state.segments[state.currentId] = seg;

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

async function saveCurrent(state) {
  const seg = parseCurrent(state);
  if (!seg) return;

  state.segments[state.currentId] = seg;

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
