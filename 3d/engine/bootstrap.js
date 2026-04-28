// Bootstrap condiviso fra player.html ed editor.html: setup renderer/scene/
// camera/styling/director, caricamento set + character + prop opzionali,
// camera follow di baseline, e i due listener globali (resize + skip-space).
//
// Il `cameraConfig` è esposto come oggetto mutabile così l'editor può
// agganciarci sopra il pannello debug. In produzione (player.html) nessuno
// lo modifica e i valori restano quelli di CAMERA_DEFAULTS.

import * as THREE from 'three';

import { Director }        from './Director.js';
import { Character }       from './Character.js';
import { Prop }            from './Prop.js';
import { CinematicCamera } from './CinematicCamera.js';

import { FlatMaterial }    from '../styling/FlatMaterial.js';
import { GBufferRenderer } from '../styling/GBufferRenderer.js';
import { HatchPass }       from '../styling/HatchPass.js';

// Camera **prospettica** (post-pivot 2026-04-26): movimenti liberi/cinematici
// previsti via keyframe legati agli eventi del character. Baseline = follow
// rigido in X come la vecchia ortho. FOV 30° (vertical) ≈ 30mm equivalente —
// tono cinematografico, character a circa 1/3 schermo a distanza ~9m.
export const CAMERA_DEFAULTS = { fov: 30, camY: 5.1, camZ: 8.0, tiltDeg: 30 };

export async function createStage({ host, setUrl = 'assets/level1.glb' } = {}) {
  if (!host) host = document.getElementById('canvas-host');

  const cameraConfig = { ...CAMERA_DEFAULTS };
  const lookY = () => cameraConfig.camY - cameraConfig.camZ * Math.tan(cameraConfig.tiltDeg * Math.PI / 180);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  host.appendChild(renderer.domElement);

  if (!renderer.capabilities.isWebGL2) {
    throw new Error('WebGL2 required');
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xddeeff);

  const camera = new THREE.PerspectiveCamera(
    cameraConfig.fov, host.clientWidth / host.clientHeight, 0.1, 100
  );
  camera.position.set(0, cameraConfig.camY, cameraConfig.camZ);
  camera.lookAt(0, lookY(), 0);

  // La direzionale serve all'HatchPass per ricalcolare N·L in screen-space.
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(3, 5, 4);
  scene.add(dirLight);

  const gbuffer = new GBufferRenderer(renderer, host.clientWidth, host.clientHeight);
  const hatchPass = new HatchPass();

  const renderFn = (scn, cam) => {
    gbuffer.render(scn, cam);
    hatchPass.setInputs(gbuffer);
    hatchPass.update(scn, cam);
    hatchPass.render(renderer, null);
  };

  const director = new Director({ scene, camera, renderer, renderFn });

  // Carica il GLB del livello (mesh + anchor Empty). I materiali PBR di
  // Blender vengono sostituiti con FlatMaterial preservando base color e map
  // diffuse.
  await director.loadSet(setUrl, {
    applyMaterial: mesh => {
      const orig = mesh.material;
      const map  = orig && orig.map ? orig.map : null;
      const baseColor = map
        ? 0xffffff
        : (orig && orig.color ? orig.color.getHex() : 0x888888);
      return new FlatMaterial({ color: baseColor, map });
    },
  });

  const character = await Character.load('assets/character.glb');
  applyFlatMaterial(character.root, 0xb59373);
  director.setCharacter(character);

  if (director.anchors.anchor_statua) {
    const statua = await Prop.load('assets/statua.glb');
    applyFlatMaterial(statua.root, 0xc8c0a8);
    statua.spawnAt(director.anchors.anchor_statua);
    director.addProp('statua', statua);
  }

  if (director.anchors.anchor_door_1) {
    const door1 = await Prop.load('assets/door_1.glb');
    applyFlatMaterial(door1.root, 0x6b4a2a);
    door1.spawnAt(director.anchors.anchor_door_1);
    director.addProp('door_1', door1);
  }

  // Stessa modalità follow di prima come baseline (config passata come
  // funzione → i debug slider funzionano live), ma il livello può chiamare
  // `await camera.moveTo(...)` per qualunque shot cinematico.
  const cameraCtl = new CinematicCamera(camera);
  director.setCameraController(cameraCtl);
  cameraCtl.follow(character.root, () => ({
    posY: cameraConfig.camY, posZ: cameraConfig.camZ, lookY: lookY(),
  }));

  function applyProjection() {
    camera.fov = cameraConfig.fov;
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h);
    applyProjection();
    gbuffer.setSize(w, h);
  });

  // Skip animazione corrente via barra spaziatrice. Le domande non sono
  // segment, quindi la skip non scavalca mai un'attesa di input.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      director.segmentPlayer?.skip();
    }
  });

  return { director, character, cameraCtl, hatchPass, cameraConfig, applyProjection };
}

function applyFlatMaterial(root, fallbackColor) {
  // Sostituisce qualunque materiale PBR con FlatMaterial, eredita la map se
  // presente (così le texture diffuse Mixamo continuano a funzionare).
  root.traverse(obj => {
    if (!obj.isMesh) return;
    const origMap = obj.material && obj.material.map;
    obj.material = new FlatMaterial({
      color: origMap ? 0xffffff : fallbackColor,
      map: origMap || null,
    });
  });
}
