// Wrapper su un personaggio scheletrico (tipicamente Mixamo).
// Espone primitives Promise-based per la coreografia async/await:
//   - play(name)   → riproduce una clip e (se non in loop) risolve a fine clip
//   - moveTo(tgt)  → tween posizione + clip walk in parallelo
// Il mixer è esposto perché l'engine deve avanzarlo nel render loop.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Character {
  static async load(url) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    return new Character(gltf);
  }

  constructor(gltf) {
    this.root = gltf.scene;
    this.mixer = new THREE.AnimationMixer(this.root);

    // Indicizza le clip in lowercase per match permissivo.
    this.clips = {};
    for (const clip of gltf.animations || []) {
      this.clips[clip.name.toLowerCase()] = clip;
    }

    // Avvia idle se presente, altrimenti la prima clip disponibile.
    this.currentAction = null;
    const first = this.clips['idle'] || (gltf.animations || [])[0];
    if (first) {
      this.currentAction = this.mixer.clipAction(first);
      this.currentAction.play();
    }
  }

  // Posiziona il personaggio su un anchor (Object3D) o un Vector3.
  spawnAt(target) {
    if (!target) return;
    const pos = target.isVector3 ? target : (target.position || target);
    this.root.position.copy(pos);
    if (target.quaternion) this.root.quaternion.copy(target.quaternion);
  }

  // Crossfade verso una clip. Ritorna Promise risolta:
  //   - immediatamente, se loop = true (la clip non "finisce")
  //   - alla fine della clip, se loop = false
  // opts: { loop = true, fadeMs = 200, timeScale = 1 }
  play(name, opts = {}) {
    const { loop = true, fadeMs = 200, timeScale = 1 } = opts;
    const clip = this.clips[name.toLowerCase()];
    if (!clip) {
      console.warn(`[Character] clip '${name}' non trovata; clip disponibili:`,
                   Object.keys(this.clips));
      return Promise.resolve();
    }

    const next = this.mixer.clipAction(clip);
    next.reset();
    next.timeScale = timeScale;
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    next.fadeIn(fadeMs / 1000);
    next.play();

    if (this.currentAction && this.currentAction !== next) {
      this.currentAction.fadeOut(fadeMs / 1000);
    }
    this.currentAction = next;

    if (loop) return Promise.resolve();

    return new Promise(resolve => {
      const onFinish = (e) => {
        if (e.action === next) {
          this.mixer.removeEventListener('finished', onFinish);
          resolve();
        }
      };
      this.mixer.addEventListener('finished', onFinish);
    });
  }

  // Scrub a una clip a un tempo specifico (no fade, no Promise). Usato dal
  // SegmentPlayer.evaluateAt durante il timeline scrubbing dell'editor: serve
  // posizionare il mixer a un tempo arbitrario su una clip data senza
  // attraversare la macchina dei crossfade. `time` è in secondi (coerente
  // con clip.duration).
  scrubTo(name, time, { loop = true } = {}) {
    const clip = this.clips[name.toLowerCase()];
    if (!clip) return;
    const dur = clip.duration;
    // Doppio mod per gestire valori negativi correttamente in JS.
    const targetTime = loop
      ? ((time % dur) + dur) % dur
      : Math.max(0, Math.min(time, dur));

    if (this.currentAction && this.currentAction.getClip() === clip) {
      this.currentAction.time = targetTime;
    } else {
      // Switch fast: stop dell'attuale, play della nuova senza fadeIn.
      if (this.currentAction) this.currentAction.stop();
      const next = this.mixer.clipAction(clip);
      next.reset();
      next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      next.clampWhenFinished = !loop;
      next.time = targetTime;
      next.play();
      this.currentAction = next;
    }
    // mixer.update(0) applica il `time` corrente alle bones senza avanzare.
    this.mixer.update(0);
  }

  // Sposta il personaggio fino a `target`, opzionalmente riproducendo `anim`
  // durante il movimento (di default 'walk').
  // target può essere Vector3, Object3D, o {x,y,z}.
  // opts: { speed = 1.5, duration = null, anim = 'walk', faceTarget = true }
  //   - speed: m/s, durata calcolata da distance/speed (default 1.5 m/s)
  //   - duration: se passato, ha priorità su speed (ms)
  async moveTo(target, opts = {}) {
    const { speed = 1.5, duration = null, anim = 'walk', faceTarget = true } = opts;
    const targetPos = target.isVector3 ? target.clone()
                    : target.position    ? target.position.clone()
                    : new THREE.Vector3(target.x, target.y, target.z);

    if (faceTarget) {
      const dir = targetPos.clone().sub(this.root.position).setY(0);
      if (dir.lengthSq() > 1e-6) {
        const lookAt = this.root.position.clone().add(dir);
        this.root.lookAt(lookAt);
      }
    }

    if (anim) this.play(anim, { loop: true });

    const startPos = this.root.position.clone();
    const distance = startPos.distanceTo(targetPos);
    const ms = duration != null ? duration : (distance / speed) * 1000;

    return new Promise(resolve => {
      if (ms <= 0) { this.root.position.copy(targetPos); resolve(); return; }
      const startTime = performance.now();
      const tick = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / ms, 1);
        this.root.position.lerpVectors(startPos, targetPos, t);
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      tick();
    });
  }
}
