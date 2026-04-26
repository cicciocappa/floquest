// Controller cinematico della camera. Tre modalità:
//   - 'follow': segue un Object3D (tipicamente il character) con offset/lookAt
//     fissi. Comportamento legacy della vecchia ortho follow-cam.
//   - 'tween':  interpola posizione e lookAt verso una pose target nel tempo,
//     poi torna in 'free'. Promise risolta a fine tween.
//   - 'free':   nessun aggiornamento; camera ferma all'ultimo stato.
//
// API pensata per script di livello async/await:
//   await camera.moveTo({ pos: [x,y,z], lookAt: [x,y,z] }, ms);
//   await camera.follow(character.root, cfg, { transitionMs: 800 });
//   camera.freeze();
//
// Tracciamo `_lastLook` perché three.js non memorizza il punto di lookAt: per
// continuità tra moveTo successivi (e per costruire la pose follow al volo)
// dobbiamo sapere dove stiamo guardando, non solo la rotazione.

import * as THREE from 'three';

const EASINGS = {
  linear: t => t,
  in:     t => t * t,
  out:    t => 1 - (1 - t) * (1 - t),
  inOut:  t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};

export class CinematicCamera {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'free';
    this._followTarget = null;
    this._followConfig = null;
    // Snapshot persistente dell'ultimo `follow()`. Sopravvive a moveTo/freeze
    // così che `resumeFollow()` possa tornare al setup baseline senza che lo
    // script di livello debba ricopiarlo (e mantenendo i parametri live se
    // erano una funzione).
    this._defaultFollowTarget = null;
    this._defaultFollowConfig = null;
    this._tween = null;
    this._lastLook = new THREE.Vector3();

    // Inizializza _lastLook dalla direzione corrente della camera (a distanza 1).
    // Permette il primo moveTo di partire da una pose ragionevole anche se non
    // abbiamo ancora chiamato follow/setPose.
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    this._lastLook.copy(this.camera.position).add(fwd);
  }

  // Applica immediatamente una pose senza animazione.
  setPose({ pos, lookAt }) {
    this._tween = null;
    this._followTarget = null;
    this.mode = 'free';
    this.camera.position.fromArray(pos);
    this._lastLook.fromArray(lookAt);
    this.camera.lookAt(this._lastLook);
  }

  // Interpola posizione e lookAt verso la pose target. Ritorna Promise.
  // Eventuale tween in corso viene risolto immediatamente prima di partire
  // (lo script chiamante non rimane appeso).
  moveTo({ pos, lookAt }, duration, easing = 'inOut') {
    if (this._tween) {
      const r = this._tween.resolve;
      this._tween = null;
      r();
    }
    this.mode = 'tween';
    this._followTarget = null;
    return new Promise(resolve => {
      this._tween = {
        startPos:  this.camera.position.clone(),
        startLook: this._lastLook.clone(),
        endPos:    new THREE.Vector3().fromArray(pos),
        endLook:   new THREE.Vector3().fromArray(lookAt),
        t0:        performance.now(),
        duration,
        ease:      EASINGS[easing] || EASINGS.inOut,
        resolve,
      };
    });
  }

  // Entra in modalità follow. `config` è { posY, posZ, lookY, posOffsetX,
  // lookOffsetX } oppure una funzione che ritorna lo stesso oggetto (utile
  // per parametri live editabili dal pannello debug).
  // `transitionMs > 0`: tween dalla pose corrente alla pose follow calcolata
  // all'inizio della transizione, poi engage follow. Evita il "salto" quando
  // si torna da uno shot cinematico.
  async follow(target, config, { transitionMs = 0 } = {}) {
    this._defaultFollowTarget = target;
    this._defaultFollowConfig = config;
    if (transitionMs > 0) {
      const cfg = typeof config === 'function' ? config() : config;
      const cx = target.position.x + (cfg.posOffsetX || 0);
      const lookX = target.position.x + (cfg.lookOffsetX || 0);
      await this.moveTo({
        pos:    [cx, cfg.posY, cfg.posZ],
        lookAt: [lookX, cfg.lookY, 0],
      }, transitionMs);
    }
    this.mode = 'follow';
    this._followTarget = target;
    this._followConfig = config;
    this._tween = null;
  }

  // Re-engage del follow con target/config dell'ultimo `follow()` chiamato.
  // Tipicamente usato dopo uno shot cinematico per tornare alla baseline.
  async resumeFollow(opts = {}) {
    if (!this._defaultFollowTarget) return;
    return this.follow(this._defaultFollowTarget, this._defaultFollowConfig, opts);
  }

  freeze() {
    this._tween = null;
    this._followTarget = null;
    this.mode = 'free';
  }

  update() {
    if (this.mode === 'tween' && this._tween) {
      const elapsed = performance.now() - this._tween.t0;
      const t = Math.min(elapsed / this._tween.duration, 1);
      const e = this._tween.ease(t);
      this.camera.position.lerpVectors(this._tween.startPos, this._tween.endPos, e);
      this._lastLook.lerpVectors(this._tween.startLook, this._tween.endLook, e);
      this.camera.lookAt(this._lastLook);
      if (t >= 1) {
        const r = this._tween.resolve;
        this._tween = null;
        this.mode = 'free';
        r();
      }
    } else if (this.mode === 'follow' && this._followTarget) {
      const cfg = typeof this._followConfig === 'function'
                ? this._followConfig() : this._followConfig;
      const baseX = this._followTarget.position.x;
      this.camera.position.set(baseX + (cfg.posOffsetX || 0), cfg.posY, cfg.posZ);
      this._lastLook.set(baseX + (cfg.lookOffsetX || 0), cfg.lookY, 0);
      this.camera.lookAt(this._lastLook);
    }
  }
}
