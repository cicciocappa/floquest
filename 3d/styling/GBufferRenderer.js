// Render target multi-texture per MRT: rendering singolo pass con 3 output
// simultanei (color / normal / depth), senza dover re-renderizzare la scena
// per ogni pass di post-processing.
//
// Three.js r160 espone l'API MRT come WebGLMultipleRenderTargets.
// L'array di texture è esposto come `.texture` (non `.textures`).

import * as THREE from 'three';

export class GBufferRenderer {
  constructor(renderer, width, height) {
    this.renderer = renderer;
    this.target = new THREE.WebGLMultipleRenderTargets(width, height, 3, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false
    });
    this.target.texture[0].name = 'color';
    this.target.texture[1].name = 'normal';
    this.target.texture[2].name = 'depth';
  }

  render(scene, camera) {
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
  }

  setSize(w, h) { this.target.setSize(w, h); }
  get color()  { return this.target.texture[0]; }
  get normal() { return this.target.texture[1]; }
  get depth()  { return this.target.texture[2]; }
}
