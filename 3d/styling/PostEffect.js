// Base class per un post-effect screen-space. Riceve il G-buffer in ingresso
// (via setInputs) e renderizza su uno specifico target, di default sullo
// schermo. Usa un fullscreen triangle (più efficiente del fullscreen quad).

import * as THREE from 'three';

export class PostEffect {
  constructor(shaderConfig) {
    this.enabled = true;
    this.material = new THREE.ShaderMaterial({
      ...shaderConfig,
      glslVersion: THREE.GLSL3
    });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position',
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  // Override nelle sottoclassi: assegna le texture del G-buffer agli uniform.
  setInputs(gbuffer) {}

  setParam(name, value) {
    if (this.material.uniforms[name]) {
      this.material.uniforms[name].value = value;
    }
  }

  render(renderer, outputTarget = null) {
    renderer.setRenderTarget(outputTarget);
    renderer.render(this.scene, this.camera);
  }
}
