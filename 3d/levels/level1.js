// Sequenza del livello 1, **segment-based**.
//
// I segment vivono in `level1.segments.json` (formato pure-data, JSON puro
// per essere round-trippabile da un futuro editor visuale). Questo file
// contiene solo l'orchestrazione async/await: il "grafo" delle sotto-sequenze
// e il branching sulle risposte. Le domande restano un primitivo separato
// (`ask`) e fanno da separatore naturale tra segment skippabili.
//
// Convenzioni di authoring per i segment (ricordate qui perché JSON non
// supporta commenti):
//   - tracks fanno *avvenire* le cose (anim play, tween start, camera move)
//     ai loro `at` ms dall'inizio del segment
//   - endState rappresenta lo stato finale a cui *snappare* in caso di skip
//     o auto-end: position, anim, transform di prop, mode camera
//   - le transizioni anim "a fine clip" (es. walk → idle) stanno SOLO
//     nell'endState, non come track separata, per evitare retrigger di
//     Character.play sulla stessa clip
//   - skip via barra spaziatrice (handler in engine/bootstrap.js) — le domande
//     non sono segment, quindi non vengono mai scavalcate
//
// Riferimenti pure-data risolti dal SegmentPlayer:
//   { "anchor": "name" }                 → anchors[name].position
//   { "anchor": "name", "offset": [...] }→ anchor pos + offset
//   [x, y, z]  o  {x, y, z}              → Vector3 letterale

const SEGMENTS = await fetch(new URL('./level1.segments.json', import.meta.url)).then(r => r.json());

export async function level1(ctx) {
  const { character, anchors, ask, play } = ctx;

  if (anchors.anchor_player_start) {
    character.spawnAt(anchors.anchor_player_start);
  }

  await play(SEGMENTS.intro);
  await play(SEGMENTS.walk_to_q1);

  const correct = await ask({
    text: 'Qual è la capitale d\'Italia?',
    answers: ['Roma', 'Milano', 'Napoli', 'Firenze'],
    correctIndex: 0,
  });

  if (!correct) {
    await play(SEGMENTS.die);
    return 'death';
  }

  await play(SEGMENTS.door_drop);
  await play(SEGMENTS.walk_to_end);
  return 'win';
}
