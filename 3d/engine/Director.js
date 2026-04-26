// Direttore: orchestratore minimale dell'engine. Tiene insieme:
//   - la scena Three.js (renderer, camera passati dall'esterno)
//   - i mixer di animazione che vanno avanzati a ogni frame
//   - un eventuale renderFn custom (per pipeline tipo flat+hatching, in cui
//     il render passa per un G-buffer e un post-pass anziché renderer.render)
//   - tickers per-frame opzionali (es. controls.update(), camera follow)
//   - il "context" passato alle level sequence (character, props, anchors,
//     ask, wait, ...)
// Ogni livello è una funzione async che riceve il context e ritorna una
// Promise con il risultato (es. 'win' / 'death').

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { showQuestion } from './QuestionUI.js';
import { collectAnchors } from './Anchors.js';
import { SegmentPlayer } from './Segment.js';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

export class Director {
  constructor({ scene, camera, renderer, renderFn = null }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    // Default: render diretto sullo schermo. Override per stylized pipeline.
    this.renderFn = renderFn || ((scn, cam) => this.renderer.render(scn, cam));

    this.character = null;
    this.props = {};
    this.anchors = {};
    this.setRoot = null;
    this.cameraController = null;
    // SegmentPlayer creato lazy (alla prima setCharacter/setCameraController),
    // così che possa essere iniettato con i riferimenti correnti senza ordine
    // di setup particolare. Vedi _ensureSegmentPlayer.
    this.segmentPlayer = null;
    this.mixers = [];
    this.tickers = [];

    this.clock = new THREE.Clock();
    this._running = false;
  }

  // Carica un GLB statico (il "set" del livello: pavimento, pareti, decor,
  // anchor). applyMaterial(mesh) → Material è opzionale e permette di
  // sostituire i materiali PBR del GLB con i nostri stylized (FlatMaterial).
  // Gli anchor (Empty in Blender con prefisso `anchor_`) vengono raccolti
  // automaticamente e registrati. Ritorna il root del set.
  async loadSet(url, { applyMaterial = null } = {}) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    const root = gltf.scene;

    if (applyMaterial) {
      root.traverse(obj => {
        if (obj.isMesh) obj.material = applyMaterial(obj);
      });
    }

    this.scene.add(root);
    this.setRoot = root;
    this.setAnchors(collectAnchors(root));
    return root;
  }

  setCharacter(character) {
    this.character = character;
    if (character.mixer) this.mixers.push(character.mixer);
    this.scene.add(character.root);
    this._ensureSegmentPlayer();
  }

  addProp(id, prop) {
    this.props[id] = prop;
    this.scene.add(prop.root);
    // Snapshot della transform al momento dell'add (tipicamente subito dopo
    // spawnAt(anchor)). Usata da resetForEditor per il replay deterministico
    // dei segment nell'editor.
    prop._initialTransform = {
      position: prop.root.position.clone(),
      rotation: prop.root.rotation.clone(),
      scale:    prop.root.scale.clone(),
    };
    this._ensureSegmentPlayer();
  }

  setAnchors(anchors) {
    this.anchors = anchors;
    this._ensureSegmentPlayer();
  }

  // Aggancia un CinematicCamera (o qualunque controller con .update()) e lo
  // registra come ticker. Il context delle level sequence vede `camera` =
  // questo controller, NON il three.js camera raw.
  setCameraController(controller) {
    this.cameraController = controller;
    this.addTicker(() => controller.update());
    this._ensureSegmentPlayer();
  }

  // Crea il SegmentPlayer al primo setup utile e lo aggiorna su ogni
  // cambio di character/camera/props/anchors. Aggancia il ticker una sola volta.
  _ensureSegmentPlayer() {
    if (!this.segmentPlayer) {
      this.segmentPlayer = new SegmentPlayer({
        character:        this.character,
        cameraController: this.cameraController,
        props:            this.props,
        anchors:          this.anchors,
      });
      this.addTicker(() => this.segmentPlayer.update());
    } else {
      this.segmentPlayer.setRefs({
        character:        this.character,
        cameraController: this.cameraController,
        props:            this.props,
        anchors:          this.anchors,
      });
    }
  }

  // Registra una callback chiamata a ogni frame con `dt` in secondi.
  // Tipicamente: () => controls.update(), follow camera, tween manager.
  addTicker(fn) {
    this.tickers.push(fn);
  }

  // Context passato alla level sequence. È volutamente piatto: il livello
  // accede direttamente a character/props/anchors senza go-betweens.
  context() {
    return {
      character: this.character,
      props: this.props,
      anchors: this.anchors,
      camera: this.cameraController,
      // Helper di alto livello per il level script: `play(segment)` lancia
      // un segment e ritorna Promise. Per skip/signal, lo script può
      // accedere a `segments` direttamente (uso meno comune).
      play:     (seg) => this.segmentPlayer.play(seg),
      segments: this.segmentPlayer,
      ask: showQuestion,
      wait,
    };
  }

  start() {
    if (this._running) return;
    this._running = true;
    const loop = () => {
      if (!this._running) return;
      requestAnimationFrame(loop);
      const dt = this.clock.getDelta();
      for (const m of this.mixers) m.update(dt);
      for (const fn of this.tickers) fn(dt);
      this.renderFn(this.scene, this.camera);
    };
    loop();
  }

  stop() {
    this._running = false;
  }

  async runLevel(sequenceFn) {
    return sequenceFn(this.context());
  }

  // Reset dello stato del mondo per il replay deterministico nell'editor:
  // - tutti i prop tornano alla transform iniziale (snapshot al momento di addProp)
  // - camera in modalità follow (snap, no transition) — baseline coerente per
  //   testare segment che non hanno track camera espliciti
  // Il character va riposizionato dal chiamante (l'editor sceglie lo spawn
  // anchor via dropdown).
  resetForEditor() {
    for (const prop of Object.values(this.props)) {
      if (!prop._initialTransform) continue;
      prop.root.position.copy(prop._initialTransform.position);
      prop.root.rotation.copy(prop._initialTransform.rotation);
      prop.root.scale.copy(prop._initialTransform.scale);
    }
    if (this.cameraController) {
      this.cameraController.resumeFollow({ transitionMs: 0 });
    }
  }
}
