// Base class per i materiali stilizzati. Caratteristica chiave: scrivono in
// 3 render target simultaneamente via MRT (vedi GBufferRenderer):
//   location 0 = colore finale (post-shading)
//   location 1 = normale view-space, codificata in [0,1]
//   location 2 = depth lineare nel canale R
// Tutti i materiali derivati condividono la stessa struttura di output,
// quindi i post-effect screen-space funzionano identici su qualsiasi materiale.
//
// I chunk shared (vertex + frag outputs) sono esportati per consentire a
// nuove sottoclassi di scrivere il proprio `vec3 shade()` senza duplicare
// boilerplate di skinning, MRT, e codifica normali.

import * as THREE from 'three';

export const SHARED_VERTEX = /* glsl */`
  #include <skinning_pars_vertex>

  out vec3 vNormalV;
  out vec3 vPosV;
  out vec2 vUv;

  void main() {
    vec3 transformed = position;
    vec3 objectNormal = normal;

    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <skinning_vertex>

    vec4 posV = viewMatrix * modelMatrix * vec4(transformed, 1.0);
    vPosV = posV.xyz;
    vNormalV = normalize(normalMatrix * objectNormal);
    vUv = uv;
    gl_Position = projectionMatrix * posV;
  }
`;

export const SHARED_FRAG_OUTPUTS = /* glsl */`
  layout(location = 0) out vec4 outColor;
  layout(location = 1) out vec4 outNormal;
  layout(location = 2) out vec4 outDepth;

  in vec3 vNormalV;
  in vec3 vPosV;
  in vec2 vUv;

  void writeGBuffer(vec3 color) {
    outColor  = vec4(color, 1.0);
    outNormal = vec4(normalize(vNormalV) * 0.5 + 0.5, 1.0);
    outDepth  = vec4(clamp(-vPosV.z / 40.0, 0.0, 1.0), 0.0, 0.0, 1.0);
  }
`;

export class StylizedMaterial extends THREE.ShaderMaterial {
  constructor({ vertexShader, fragmentShader, uniforms = {}, defines = {} }) {
    super({
      vertexShader,
      fragmentShader,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.lights,
        uniforms
      ]),
      defines: { USE_MRT: '', ...defines },
      lights: true,
      glslVersion: THREE.GLSL3
    });
  }
}
