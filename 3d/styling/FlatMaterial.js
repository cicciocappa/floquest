// Colore puro, nessuna interazione con la luce. Pensato per essere accoppiato
// a un post-pass che si occupa lui dello shading (HatchPass nel nostro caso).
// Le normali e la depth vengono comunque scritte nel G-buffer, così il
// post-pass può ricalcolare l'illuminazione a posteriori.
//
// Texture transform: glTF supporta l'estensione KHR_texture_transform
// (corrispondente al Mapping node di Blender per offset/repeat/rotation).
// GLTFLoader la legge e popola `map.repeat / map.offset / map.rotation` →
// `map.updateMatrix()` compone questi valori in `map.matrix` (Matrix3) che
// passiamo al fragment shader. Senza questo, una texture "ripetuta 10×" in
// Blender risulta stirata una volta sola sull'intera mesh.

import * as THREE from 'three';
import { StylizedMaterial, SHARED_VERTEX, SHARED_FRAG_OUTPUTS } from './StylizedMaterial.js';

export class FlatMaterial extends StylizedMaterial {
  constructor({ color = 0xcc6633, map = null } = {}) {
    const uniforms = { uBaseColor: { value: new THREE.Color(color) } };
    const defines = {};
    if (map) {
      map.updateMatrix();
      uniforms.uColorMap       = { value: map };
      uniforms.uColorMapMatrix = { value: map.matrix };
      defines.USE_COLORMAP = '';
    }
    super({
      vertexShader: SHARED_VERTEX,
      fragmentShader: /* glsl */`
        precision highp float;
        ${SHARED_FRAG_OUTPUTS}

        uniform vec3 uBaseColor;
        #ifdef USE_COLORMAP
          uniform sampler2D uColorMap;
          uniform mat3 uColorMapMatrix;
        #endif

        vec3 shade() {
          #ifdef USE_COLORMAP
            vec2 uv = (uColorMapMatrix * vec3(vUv, 1.0)).xy;
            return texture(uColorMap, uv).rgb * uBaseColor;
          #else
            return uBaseColor;
          #endif
        }

        void main() { writeGBuffer(shade()); }
      `,
      uniforms,
      defines
    });
  }
}
