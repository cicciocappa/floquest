// Singletons per le texture condivise dal pipeline di stilizzazione.
// Lazy-load: le texture vengono caricate alla prima richiesta e poi
// riutilizzate. I path sono relativi alla pagina HTML che importa, non al
// modulo (TextureLoader.load risolve contro document.baseURI).

import * as THREE from 'three';

let _paper = null;
let _tam = null;

export function getPaperTexture() {
  if (_paper) return _paper;
  _paper = new THREE.TextureLoader().load('assets/ivory-off-white-paper-texture.jpg');
  _paper.wrapS = THREE.RepeatWrapping;
  _paper.wrapT = THREE.RepeatWrapping;
  _paper.minFilter = THREE.LinearMipmapLinearFilter;
  _paper.magFilter = THREE.LinearFilter;
  return _paper;
}

// Tonal Art Maps — 7 livelli di tratteggio a densità crescente (Praun/Hoppe
// "Real-Time Hatching", SIGGRAPH 2001, esteso con un livello sparso in più).
// hatch_0 = molto sparso (transizione morbida verso colore puro);
// hatch_6 = cross-hatch saturo. Se hatch_0.jpg manca, Three.js usa la
// texture default bianca → equivale a "nessun tratto" sul primo livello.
export function getTamTextures() {
  if (_tam) return _tam;
  const loader = new THREE.TextureLoader();
  _tam = [];
  for (let i = 0; i < 7; i++) {
    const t = loader.load(`assets/tam/hatch_${i}.jpg`);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    _tam.push(t);
  }
  return _tam;
}
