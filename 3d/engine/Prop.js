// Wrapper su un prop GLB animabile via tween (leve, porte, botole).
// La superficie animabile è la trasform del root: posizione, rotazione,
// scala. Niente skeletal animation — quello è compito di Character.
//
// API tween: chiavi pos{X,Y,Z} | rot{X,Y,Z} | scale (uniforme), valori
// assoluti. Esempio:
//   await lever.tween({ rotX: -0.6 }, { duration: 800 });
//   await door.tween({ posY: 3, rotY: Math.PI/2 }, { duration: 1500 });

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const KEYS = {
  posX:   (o, v) => o.position.x = v,
  posY:   (o, v) => o.position.y = v,
  posZ:   (o, v) => o.position.z = v,
  rotX:   (o, v) => o.rotation.x = v,
  rotY:   (o, v) => o.rotation.y = v,
  rotZ:   (o, v) => o.rotation.z = v,
  scale:  (o, v) => o.scale.set(v, v, v),
};
const READERS = {
  posX:   o => o.position.x,
  posY:   o => o.position.y,
  posZ:   o => o.position.z,
  rotX:   o => o.rotation.x,
  rotY:   o => o.rotation.y,
  rotZ:   o => o.rotation.z,
  scale:  o => o.scale.x,
};

// Ease "smoothstep" — abbastanza "naturale" da non aver bisogno di scegliere
// una curva ad-hoc per ogni tween. Sostituibile via opts.easing.
const SMOOTHSTEP = t => t * t * (3 - 2 * t);

export class Prop {
  static async load(url) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    return new Prop(gltf);
  }

  constructor(gltf) {
    this.root = gltf.scene;
  }

  // Posiziona il prop su un anchor (Object3D) — copia posizione + rotazione.
  spawnAt(target) {
    if (!target) return;
    if (target.position) this.root.position.copy(target.position);
    if (target.quaternion) this.root.quaternion.copy(target.quaternion);
  }

  // tween(props, opts) — props con chiavi pos*/rot*/scale, valori target
  // assoluti. opts: { duration = 1000, delay = 0, easing = smoothstep }.
  // Risolve la Promise a fine animazione.
  tween(props, opts = {}) {
    const { duration = 1000, delay = 0, easing = SMOOTHSTEP } = opts;

    return new Promise(resolve => {
      const start = () => {
        // snapshot dei valori iniziali per ogni chiave
        const startVals = {};
        for (const k of Object.keys(props)) {
          if (!READERS[k]) {
            console.warn(`[Prop] chiave tween ignota: ${k}`);
            continue;
          }
          startVals[k] = READERS[k](this.root);
        }

        const t0 = performance.now();
        const tick = () => {
          const elapsed = performance.now() - t0;
          const t = Math.min(elapsed / duration, 1);
          const e = easing(t);
          for (const k of Object.keys(startVals)) {
            const v = startVals[k] + (props[k] - startVals[k]) * e;
            KEYS[k](this.root, v);
          }
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        };
        tick();
      };

      if (delay > 0) setTimeout(start, delay);
      else start();
    });
  }
}
