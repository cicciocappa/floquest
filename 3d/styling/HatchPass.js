// Pensato per accoppiarsi a FlatMaterial: il colore arriva piatto, qui
// ricalcoliamo N·L dalle normali del G-buffer e usiamo il risultato come
// indice di luminanza per fare lookup in una Tonal Art Map a 7 livelli.
// Implementazione fedele a Praun/Hoppe 2001 (estesa con un livello sparso in
// più per ammorbidire l'ingresso del tratteggio): campiona i 7 livelli e fa
// blend a triangolo fra TAM adiacenti per una transizione tonale continua.
//
// Nota WebGL2: il sampler array `uTam[7]` non si può indicizzare con
// un'espressione runtime (GLSL ES 3.00 §4.1.7), quindi sampliamo tutti e 7 i
// livelli e li pesiamo con triangoli sovrapposti — sum dei pesi = 1 in [0,6].
//
// UV: triplanar in world space. Ricostruiamo posizione e normale world dal
// G-buffer (view-space depth + view-space normal + camera.matrixWorld) e
// proiettiamo il tratto su tre piani (YZ/XZ/XY) pesati da |worldNormal|^k.
// Costo: 3× il numero di TAM lookup, ma il tratteggio resta incollato alle
// superfici quando la camera si muove o tilta. Funziona con camera
// **prospettica** simmetrica: dato view_z lineare (ricostruito dal depth
// encoding -view_z/40 di SHARED_FRAG_OUTPUTS), le coordinate view.xy si
// ricavano come ndc * (-view_z) * tan(fov/2) [scalato per aspect su X].
// Caso ortografico non più supportato (v. memory: pivot 2026-04-26 sera).

import * as THREE from 'three';
import { PostEffect } from './PostEffect.js';
import { getPaperTexture, getTamTextures } from './textures.js';

export class HatchPass extends PostEffect {
  constructor() {
    super({
      uniforms: {
        uColor:         { value: null },
        uNormal:        { value: null },
        uDepth:         { value: null },
        uPaper:         { value: getPaperTexture() },
        uTam:           { value: getTamTextures() },
        uTexel:         { value: new THREE.Vector2() },
        uViewToWorld:   { value: new THREE.Matrix4() },
        uTanHalfFov:    { value: new THREE.Vector2() },
        uLightDir:      { value: new THREE.Vector3(0.3, 0.7, 0.6) },
        uAmbient:       { value: 0.15 },
        uSceneTint:     { value: new THREE.Color(0xffffff) },
        uHatchScale:    { value: 2.0 },   // tiles per meter
        uTriplanarSharp:{ value: 4.0 },
        uHatchStrength: { value: 0.85 },
        uLightCutoff:   { value: 0.20 },
        uInkColor:      { value: new THREE.Color(0x1a1410) },
        uThickness:     { value: 0.5 },
        uThreshold:     { value: 0.7 },
        uPaperStrength: { value: 0.35 },
        uPaperScale:    { value: 2.5 }
      },
      vertexShader: /* glsl */`
        out vec2 vUv;
        void main() {
          vUv = position.xy * 0.5 + 0.5;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        in vec2 vUv;
        uniform sampler2D uColor, uNormal, uDepth, uPaper;
        uniform sampler2D uTam[7];
        uniform vec2 uTexel;
        uniform mat4 uViewToWorld;
        uniform vec2 uTanHalfFov;  // (tan(fov/2)*aspect, tan(fov/2))
        uniform vec3 uLightDir;
        uniform float uAmbient;
        uniform vec3 uSceneTint;
        uniform float uHatchScale, uTriplanarSharp, uHatchStrength, uLightCutoff;
        uniform vec3 uInkColor;
        uniform float uThickness, uThreshold;
        uniform float uPaperStrength, uPaperScale;
        out vec4 outColor;

        float sobel(sampler2D tex, vec2 uv, float off) {
          vec3 tl = texture(tex, uv + vec2(-1,-1)*uTexel*off).rgb;
          vec3 tm = texture(tex, uv + vec2( 0,-1)*uTexel*off).rgb;
          vec3 tr = texture(tex, uv + vec2( 1,-1)*uTexel*off).rgb;
          vec3 ml = texture(tex, uv + vec2(-1, 0)*uTexel*off).rgb;
          vec3 mr = texture(tex, uv + vec2( 1, 0)*uTexel*off).rgb;
          vec3 bl = texture(tex, uv + vec2(-1, 1)*uTexel*off).rgb;
          vec3 bm = texture(tex, uv + vec2( 0, 1)*uTexel*off).rgb;
          vec3 br = texture(tex, uv + vec2( 1, 1)*uTexel*off).rgb;
          vec3 gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
          vec3 gy = -tl - 2.0*tm - tr + bl + 2.0*bm + br;
          return length(gx) + length(gy);
        }

        // Sample tutti i 7 livelli TAM allo stesso UV, blend a triangolo
        // basato sull'indice tonale t ∈ [0, 6] (sum dei pesi = 1).
        float tamMix(vec2 uv, float t) {
          float s0 = texture(uTam[0], uv).r;
          float s1 = texture(uTam[1], uv).r;
          float s2 = texture(uTam[2], uv).r;
          float s3 = texture(uTam[3], uv).r;
          float s4 = texture(uTam[4], uv).r;
          float s5 = texture(uTam[5], uv).r;
          float s6 = texture(uTam[6], uv).r;
          float r = 0.0;
          r += s0 * max(0.0, 1.0 - abs(t - 0.0));
          r += s1 * max(0.0, 1.0 - abs(t - 1.0));
          r += s2 * max(0.0, 1.0 - abs(t - 2.0));
          r += s3 * max(0.0, 1.0 - abs(t - 3.0));
          r += s4 * max(0.0, 1.0 - abs(t - 4.0));
          r += s5 * max(0.0, 1.0 - abs(t - 5.0));
          r += s6 * max(0.0, 1.0 - abs(t - 6.0));
          return r;
        }

        void main() {
          vec3 color = texture(uColor, vUv).rgb;

          vec3 viewN = normalize(texture(uNormal, vUv).xyz * 2.0 - 1.0);
          vec3 L = normalize(uLightDir);
          float ndl = max(dot(viewN, L), 0.0);
          float lit = clamp(ndl * (1.0 - uAmbient) + uAmbient, 0.0, 1.0);
          float darkness = 1.0 - lit;

          // Background: depth==0 → niente geometria. Skip TAM, manteniamo
          // soltanto edge detection per i contorni (sotto).
          float depthSample = texture(uDepth, vUv).r;
          float hasGeom = step(0.001, depthSample);

          // Ricostruzione world-space (camera prospettica simmetrica).
          //   view_z = -depth * 40        (encoding di SHARED_FRAG_OUTPUTS)
          //   view.xy = ndc * (-view_z) * tan(fov/2) * (aspect, 1)
          // Le componenti di uTanHalfFov contengono già tan(fov/2)*aspect su x
          // e tan(fov/2) su y, quindi la moltiplicazione è componente per
          // componente.
          vec2 ndc = vUv * 2.0 - 1.0;
          float view_z = -depthSample * 40.0;
          vec3 viewPos = vec3(ndc * (-view_z) * uTanHalfFov, view_z);
          vec3 worldPos = (uViewToWorld * vec4(viewPos, 1.0)).xyz;
          vec3 worldN = normalize((uViewToWorld * vec4(viewN, 0.0)).xyz);

          // Pesi triplanar — sharpening con pow per ridurre la zona di blend
          // (utile per geometria axis-aligned dove le normali sono nette).
          vec3 absN = pow(abs(worldN), vec3(uTriplanarSharp));
          vec3 w = absN / max(absN.x + absN.y + absN.z, 1e-4);

          vec2 uvX = worldPos.yz * uHatchScale;
          vec2 uvY = worldPos.xz * uHatchScale;
          vec2 uvZ = worldPos.xy * uHatchScale;

          float t = clamp(darkness * 6.0, 0.0, 6.0);
          float tam = tamMix(uvX, t) * w.x
                    + tamMix(uvY, t) * w.y
                    + tamMix(uvZ, t) * w.z;

          float ink = (1.0 - tam) * uHatchStrength * hasGeom;
          float lightGate = smoothstep(max(uLightCutoff - 0.05, 0.0),
                                       uLightCutoff + 0.05, darkness);
          ink *= lightGate;
          color = mix(color, uInkColor, ink);

          if (uThickness > 0.0) {
            float eN = sobel(uNormal, vUv, uThickness);
            float eD = sobel(uDepth,  vUv, uThickness) * 6.0;
            float e  = max(eN, eD);
            float line = smoothstep(uThreshold, uThreshold + 0.1, e);
            color = mix(color, uInkColor, line * 0.9);
          }

          vec3 paper = texture(uPaper, vUv * uPaperScale).rgb;
          color = color * mix(vec3(1.0), paper, uPaperStrength);

          // Tinta globale di scena (es. caldo per ambienti illuminati a fuoco).
          color = color * uSceneTint;

          // Linear → sRGB (piecewise IEC 61966-2-1). Tutto il pipeline lavora
          // in lineare (texture sRGB decodificate dalla GPU, FlatMaterial
          // scrive lineare nel gbuffer), e qui re-encodiamo prima di mandare
          // al canvas — che il browser interpreta come sRGB.
          vec3 lower = color * 12.92;
          vec3 upper = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0/2.4)) - 0.055;
          vec3 srgb  = mix(lower, upper, step(vec3(0.0031308), color));

          outColor = vec4(srgb, 1.0);
        }
      `
    });

    this._lightWorld  = new THREE.Vector3();
    this._targetWorld = new THREE.Vector3();
  }

  setInputs(gbuffer) {
    this.material.uniforms.uColor.value  = gbuffer.color;
    this.material.uniforms.uNormal.value = gbuffer.normal;
    this.material.uniforms.uDepth.value  = gbuffer.depth;
    const w = gbuffer.target.width, h = gbuffer.target.height;
    this.material.uniforms.uTexel.value.set(1 / w, 1 / h);
  }

  // Trasforma la direzione della prima DirectionalLight in view-space,
  // identico a quello che Three.js fa per `directionalLights[0].direction`.
  // Aggiorna anche le matrici/parametri della camera prospettica usati per
  // la ricostruzione world-space del triplanar.
  // Richiede `camera` di tipo `PerspectiveCamera` (legge .fov e .aspect).
  update(scene, camera) {
    let dirLight = null;
    scene.traverse(o => { if (!dirLight && o.isDirectionalLight) dirLight = o; });
    if (dirLight) {
      this._lightWorld.setFromMatrixPosition(dirLight.matrixWorld);
      this._targetWorld.setFromMatrixPosition(dirLight.target.matrixWorld);
      const dir = this._lightWorld.sub(this._targetWorld);
      dir.transformDirection(camera.matrixWorldInverse);
      this.material.uniforms.uLightDir.value.copy(dir);
    }
    this.material.uniforms.uViewToWorld.value.copy(camera.matrixWorld);
    const tanHalfV = Math.tan((camera.fov * Math.PI / 180) * 0.5);
    this.material.uniforms.uTanHalfFov.value.set(tanHalfV * camera.aspect, tanHalfV);
  }
}
