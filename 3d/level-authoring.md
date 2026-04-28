# Guida — Authoring di un livello in Blender

Documento di lavoro: aggiornare via via che le convenzioni si stabilizzano.

## Sistema di coordinate

- **X** = asse del corridoio (il personaggio cammina lungo X+).
- **Y** = up.
- **Z** = profondità. Il **lato camera** è **+Z**, la **back wall** è su **−Z**.
- Origine `(0, 0, 0)` al centro del corridoio sul piano del pavimento (il pavimento ha la faccia superiore a `y = 0`).

## Dimensioni corridoio standard

- 40 m lungo X (player utilizza utilmente `x ∈ [-19, 19]`, 1m di margine per lato).
- 5 m lungo Z.
- 3 m lungo Y.
- Back wall su `z = -2.5`. Lato camera (`z = +2.5`) **aperto** (niente parete, è da dove guarda la camera).

## Anchor (Empty in Blender)

Convenzione: ogni Empty con nome che inizia per `anchor_` viene raccolto automaticamente da `collectAnchors()` e registrato nel Director. La sequenza del livello li riferisce per nome senza coordinate hardcoded.

L'orientamento dell'Empty viene rispettato: per gli anchor di props posso usarlo per dare la rotazione iniziale del prop (`spawnAt` copia posizione + quaternion).

### Obbligatori

| Nome                  | Cosa rappresenta                                 |
|-----------------------|--------------------------------------------------|
| `anchor_player_start` | Posizione di spawn del personaggio a inizio livello. |
| `anchor_q1` … `anchor_q10` | Punto in cui il personaggio si ferma per la domanda 1…10. Posizionarli lungo X a distanze ragionevoli (~3-4 m fra loro). |
| `anchor_end`          | Punto finale, raggiunto dopo l'ultima domanda corretta. |

### Opzionali (per i prop animabili del livello)

Per ogni prop animabile (statua, leva, botola, porta…) serve un anchor con nome:

```
anchor_<propid>
```

dove `<propid>` è l'id usato nel codice della sequenza (`props.<propid>`). Esempio: `anchor_statua` ↔ `props.statua`.

L'Empty va posizionato dove il prop deve apparire all'inizio del livello.

### Convenzioni nomi

- Tutto **lowercase**, snake_case.
- Solo prefisso `anchor_`. Niente altri prefissi/suffissi convenzionali per ora.
- Gli anchor possono essere figli di qualsiasi nodo nella scena: `traverse()` li trova ovunque.

## Materiali

I materiali assegnati in Blender vengono **sostituiti runtime** da `FlatMaterial` quando il GLB viene caricato (il colore base viene letto dal materiale originale o passato esplicitamente). Non serve quindi tarare PBR/roughness/etc., conta solo il **base color** (e la `map` diffuse, se presente).

L'illuminazione finale è gestita dal post-pass (`HatchPass`) usando una `DirectionalLight` di scena. Nel GLB del livello **non** servono luci.

## Export GLB

- Formato: **glTF 2.0 binario** (`.glb`), un singolo file per livello.
- Includere: meshes, empties (anchor), materiali (per il base color), UV.
- **Non** includere: luci, camere, animazioni del set (le animazioni della geometria del livello, se servono in futuro, andranno discusse).
- "Apply transforms" sui mesh: opzionale ma consigliato — gli anchor invece **devono** mantenere posizione/rotazione (è la loro funzione).

## Path di destinazione

Convenzione attuale: `3d/assets/level<N>.glb`. Caricato in `engine/bootstrap.js` con:

```js
await director.loadSet('assets/level1.glb', {
  applyMaterial: mesh => new FlatMaterial({
    color: mesh.material?.color?.getHex() ?? 0x888888,
    map: mesh.material?.map ?? null,
  }),
});
```

`loadSet()` raccoglie automaticamente gli anchor dal GLB caricato.

## Checklist pre-export

- [ ] Origine corridoio a `(0, 0, 0)`, asse X = direzione percorso.
- [ ] Back wall su `z = -2.5`, lato camera aperto su `z = +2.5`.
- [ ] `anchor_player_start` presente.
- [ ] `anchor_q1` … `anchor_q10` presenti e ordinati lungo X.
- [ ] `anchor_end` presente, dopo l'ultima domanda.
- [ ] Un `anchor_<propid>` per ogni prop animabile previsto dalla sequenza del livello.
- [ ] Niente luci né camere nel GLB.
