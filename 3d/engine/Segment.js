// Sistema Segment-based per le sequenze di livello.
//
// Un Segment è una **mini-timeline multi-track pure-data** con durata
// determinata (fissa in ms o `{ until: 'signal' }`) e un `endState` esplicito
// che dice "se mi salti, ecco dove devono finire le cose".
//
// Tre principi guida:
//   1. Pure data — niente closures, riferimenti come stringhe (anchor names,
//      prop ids). Serializzabili JSON, base per un futuro editor visuale.
//   2. Skippabile — il SegmentPlayer cancella i tween in corso e applica
//      endState al volo, risolvendo la Promise di play().
//   3. Track types minimi — characterMove, characterAnim, propTween,
//      cameraMove, cameraFollow. Estendere su necessità.
//
// Il SegmentPlayer:
//   - possiede i tween numerici (per poterli cancellare; le primitive
//     Character.moveTo/Prop.tween non sono cancellabili)
//   - delega Character.play e CinematicCamera.moveTo (interruttibili
//     naturalmente: una nuova chiamata sostituisce la precedente)
//   - espone play(seg) → Promise, skip(), signal(name), update() per il
//     ticker del Director.
//
// Reference resolution:
//   - { anchor: 'anchor_q1' }                 → anchors[name].position (Vector3)
//   - { anchor: 'anchor_q1', offset: [x,y,z] }→ anchor pos + offset
//   - [x, y, z]                                → Vector3(x,y,z)
//   - { x, y, z }                              → Vector3(x,y,z)

import * as THREE from 'three';

const EASINGS = {
  linear:     t => t,
  in:         t => t * t,
  out:        t => 1 - (1 - t) * (1 - t),
  inOut:      t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  smoothstep: t => t * t * (3 - 2 * t),
};

// Setter per le chiavi tween di un prop (stesse convenzioni di Prop.tween).
const PROP_KEYS = {
  posX:  (o, v) => o.position.x = v,   posY: (o, v) => o.position.y = v,   posZ: (o, v) => o.position.z = v,
  rotX:  (o, v) => o.rotation.x = v,   rotY: (o, v) => o.rotation.y = v,   rotZ: (o, v) => o.rotation.z = v,
  scale: (o, v) => o.scale.set(v, v, v),
};
const PROP_READERS = {
  posX:  o => o.position.x, posY: o => o.position.y, posZ: o => o.position.z,
  rotX:  o => o.rotation.x, rotY: o => o.rotation.y, rotZ: o => o.rotation.z,
  scale: o => o.scale.x,
};

export class SegmentPlayer {
  constructor({ character, cameraController, props, anchors }) {
    this.character = character;
    this.camera    = cameraController;
    this.props     = props;
    this.anchors   = anchors;
    this._run = null;  // { segment, t0, firedTracks: Set, activeTweens: [], signal, resolve }
  }

  // Riferimenti dinamici: i props/anchors crescono dopo la creazione del player
  // (caricamento async). Permettiamo al Director di iniettarli via setter.
  setRefs({ character, cameraController, props, anchors }) {
    if (character)        this.character = character;
    if (cameraController) this.camera    = cameraController;
    if (props)            this.props     = props;
    if (anchors)          this.anchors   = anchors;
  }

  // Avvia un segment. Cancella eventuale segment in corso (resolve immediato
  // del precedente, senza endState — chi orchestra ha il dovere di non
  // sovrapporre play). Ritorna Promise risolta a fine segment.
  play(segment) {
    if (this._run) {
      const r = this._run.resolve;
      this._run = null;
      r();
    }
    return new Promise(resolve => {
      this._run = {
        segment,
        t0: performance.now(),
        firedTracks: new Set(),
        activeTweens: [],
        signal: (segment.duration && segment.duration.until) || null,
        resolve,
      };
    });
  }

  // Skip il segment in corso: cancella tween, applica endState, risolve.
  // Idempotente (no-op se nessun segment è in corso).
  skip() {
    if (!this._run) return;
    const seg = this._run.segment;
    this._run.activeTweens.length = 0;
    if (seg.endState) this._applyEndState(seg.endState);
    const r = this._run.resolve;
    this._run = null;
    r();
  }

  // Risolve un segment in attesa del signal `name`. Equivalente a skip()
  // se il segment in corso è gated su quello specifico signal.
  signal(name) {
    if (this._run && this._run.signal === name) this.skip();
  }

  // Avanza il segment in corso. Da chiamare a ogni frame dal ticker.
  update() {
    if (!this._run) return;
    const elapsed = performance.now() - this._run.t0;

    // Fire dei track events ai loro `at` (in ordine sorgente, monotono in t).
    const tracks = this._run.segment.tracks || [];
    for (let i = 0; i < tracks.length; i++) {
      if (this._run.firedTracks.has(i)) continue;
      const tr = tracks[i];
      if (elapsed >= (tr.at || 0)) {
        this._run.firedTracks.add(i);
        this._fireTrack(tr);
      }
    }

    // Avanzamento dei tween posseduti.
    const tweens = this._run.activeTweens;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const t = Math.min((performance.now() - tw.t0) / tw.duration, 1);
      tw.apply(tw.ease(t));
      if (t >= 1) tweens.splice(i, 1);
    }

    // Auto-end per segment a durata fissa.
    const dur = this._run.segment.duration;
    if (typeof dur === 'number' && elapsed >= dur) {
      this.skip();
    }
  }

  _fireTrack(tr) {
    switch (tr.type) {
      case 'characterMove': return this._tweenCharacterMove(tr);
      case 'characterAnim': return this._playCharacterAnim(tr);
      case 'propTween':     return this._tweenProp(tr);
      case 'cameraMove':    return this._cameraMove(tr);
      case 'cameraFollow':  return this._cameraFollow(tr);
      default:
        console.warn(`[Segment] track type ignoto: '${tr.type}'`);
    }
  }

  _tweenCharacterMove(tr) {
    const target = this.character.root;
    const endVec = this._resolveVec3(tr.to);
    const startPos = target.position.clone();
    const ease = EASINGS[tr.ease] || EASINGS.linear;
    if (tr.faceTarget !== false) {
      const dir = endVec.clone().sub(startPos).setY(0);
      if (dir.lengthSq() > 1e-6) target.lookAt(startPos.clone().add(dir));
    }
    this._run.activeTweens.push({
      t0: performance.now(),
      duration: tr.duration || 1000,
      ease,
      apply: e => target.position.lerpVectors(startPos, endVec, e),
    });
  }

  _playCharacterAnim(tr) {
    this.character.play(tr.clip, { loop: tr.loop !== false });
  }

  _tweenProp(tr) {
    const prop = this.props[tr.prop];
    if (!prop) { console.warn(`[Segment] prop '${tr.prop}' non trovato`); return; }
    const target = prop.root;
    const startVals = {};
    for (const k of Object.keys(tr.to)) {
      if (!PROP_READERS[k]) { console.warn(`[Segment] chiave propTween ignota: ${k}`); continue; }
      startVals[k] = PROP_READERS[k](target);
    }
    const ease = EASINGS[tr.ease] || EASINGS.smoothstep;
    this._run.activeTweens.push({
      t0: performance.now(),
      duration: tr.duration || 1000,
      ease,
      apply: e => {
        for (const k of Object.keys(startVals)) {
          PROP_KEYS[k](target, startVals[k] + (tr.to[k] - startVals[k]) * e);
        }
      },
    });
  }

  _cameraMove(tr) {
    const pos    = this._resolveVec3(tr.pos).toArray();
    const lookAt = this._resolveVec3(tr.lookAt).toArray();
    this.camera.moveTo({ pos, lookAt }, tr.duration || 1000, tr.ease || 'inOut');
  }

  _cameraFollow(tr) {
    this.camera.resumeFollow({ transitionMs: tr.transitionMs || 0 });
  }

  // Snap immediato dell'endState. Le chiavi del dizionario sono nomi target
  // ('character', 'camera', 'props.<id>'); i valori sono parametri da snappare.
  _applyEndState(endState) {
    for (const targetName of Object.keys(endState)) {
      const state = endState[targetName];

      if (targetName === 'character') {
        if (state.position) this.character.root.position.copy(this._resolveVec3(state.position));
        if (state.anim)     this.character.play(state.anim, { loop: state.loop !== false });
        continue;
      }

      if (targetName === 'camera') {
        if (state.pose)         this.camera.setPose(state.pose);
        else if (state.follow)  this.camera.resumeFollow({ transitionMs: 0 });
        continue;
      }

      if (targetName.startsWith('props.')) {
        const prop = this.props[targetName.slice(6)];
        if (!prop) continue;
        for (const k of Object.keys(state)) {
          if (PROP_KEYS[k]) PROP_KEYS[k](prop.root, state[k]);
        }
        continue;
      }
    }
  }

  _resolveVec3(ref) {
    if (Array.isArray(ref)) return new THREE.Vector3(ref[0] || 0, ref[1] || 0, ref[2] || 0);
    if (ref && ref.isVector3) return ref.clone();
    if (ref && typeof ref === 'object' && ref.anchor) {
      const a = this.anchors[ref.anchor];
      if (!a) {
        console.warn(`[Segment] anchor '${ref.anchor}' non trovato`);
        return new THREE.Vector3();
      }
      const v = a.position.clone();
      if (ref.offset) v.add(new THREE.Vector3(ref.offset[0] || 0, ref.offset[1] || 0, ref.offset[2] || 0));
      return v;
    }
    if (ref && typeof ref === 'object') {
      return new THREE.Vector3(ref.x || 0, ref.y || 0, ref.z || 0);
    }
    return new THREE.Vector3();
  }
}
