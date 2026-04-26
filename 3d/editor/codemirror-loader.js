// Lazy loader per CodeMirror 5 da CDN. CodeMirror 5 espone un global
// `window.CodeMirror`, quindi va caricato come `<script>` non come ESM
// (niente bundler nel progetto). Questo modulo aggiunge i tag al volo e
// ritorna il global a load completato.
//
// Versione 5.65.16 (ultima della serie 5, mantenuta). Modalità JavaScript
// con flag `json: true` per JSON puro.

const CM_VERSION = '5.65.16';
const CM_BASE = `https://cdn.jsdelivr.net/npm/codemirror@${CM_VERSION}`;

export const CM_CSS_HREF   = `${CM_BASE}/lib/codemirror.css`;
export const CM_THEME_HREF = `${CM_BASE}/theme/material-darker.css`;

const SCRIPTS = [
  `${CM_BASE}/lib/codemirror.js`,
  `${CM_BASE}/mode/javascript/javascript.js`,
];

let _loaded = null;

export function loadCodeMirror() {
  if (_loaded) return _loaded;
  _loaded = (async () => {
    appendLink(CM_CSS_HREF);
    for (const src of SCRIPTS) await appendScript(src);
    if (!window.CodeMirror) throw new Error('CodeMirror global non disponibile dopo il load');
    return window.CodeMirror;
  })();
  return _loaded;
}

function appendLink(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function appendScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Load fallito: ${src}`));
    document.head.appendChild(s);
  });
}
