// Helper per estrarre punti di ancoraggio da una scena GLTF.
// Convenzione: gli Empty in Blender con nome che inizia per `anchor_` sono
// raccolti in una mappa { 'anchor_player_start': Object3D, ... }. Il codice
// di gioco li usa per sapere dove spawnare personaggio e props senza
// hardcoded coordinates.

export function collectAnchors(root) {
  const anchors = {};
  root.traverse(obj => {
    if (obj.name && obj.name.startsWith('anchor_')) {
      anchors[obj.name] = obj;
    }
  });
  return anchors;
}
