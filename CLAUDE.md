# FloQuest - L'Avventura del Sapere

Trivia game HTML/JavaScript in stile Indiana Jones. 10 livelli, 10 domande ciascuno, 4 corridoi (3 trappole + 1 corretto). Sprite 2D con normal-map lighting (Phaser 3 WebGL).

## Stack

- **Phaser 3** via CDN (`https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js`)
- **WebGL** — pipeline custom per normal-map lighting (`LitSpritePipeline`)
- **No bundler** — script tags con namespace `FloQuest.*`, si apre con `index.html`
- **Spritesheet animate** — 128×128 frame, color + normal map per ogni animazione (in `img/`)
- **Grafica procedurale** — texture UI generate con Phaser Graphics (TextureGenerator)
- **Audio sintetizzato** — Web Audio API, nessun file audio
- **localStorage** — salvataggio progressi e high score

## Struttura Progetto

```
floquest/
├── index.html                  — Entry point, carica tutti gli script
├── css/style.css               — Fullscreen viewport, sfondo nero
├── img/                        — Spritesheet color + normal map per ogni animazione
│   ├── idle_color.png / idle_normal.png
│   ├── walk_right_color.png / walk_right_normal.png
│   ├── death_color.png / death_normal.png
│   ├── falling_color.png / falling_normal.png
│   └── ... (22 animazioni totali)
├── js/
│   ├── config.js               — Costanti (viewport, walk, punteggi, corridoi, colori)
│   ├── main.js                 — Viewport dinamico (larghezza = schermo), Phaser.Game
│   ├── data/
│   │   ├── questions.js        — 100 domande (10 per livello), risposta corretta sempre index 0
│   │   └── levels.js           — Array 10 livelli con nome, ambiente, trappola, colori, tema
│   ├── scenes/
│   │   ├── BootScene.js        — Carica spritesheet, registra pipeline, crea animazioni
│   │   ├── TitleScene.js       — Menu principale, pulsante Inizia/Continua, high score
│   │   ├── LevelIntroScene.js  — Presentazione livello (nome, tema, trappola, vite)
│   │   ├── GameScene.js        — Gameplay: loop async domande, corridoi, trappole inline
│   │   ├── LevelCompleteScene.js — Riepilogo livello, bonus perfetto, pulsante prossimo
│   │   ├── GameOverScene.js    — Schermata morte, riprova/menu
│   │   └── VictoryScene.js     — Schermata finale, conteggio punteggio, confetti
│   ├── objects/
│   │   ├── Player.js           — ANIM_DATA, preload spritesheet, createSprite, step helpers
│   │   ├── CorridorSystem.js   — 4 corridoi (Y, angoli, animazioni), calcolo movimenti diagonali
│   │   ├── QuestionUI.js       — Pannello domanda/risposte/timer overlay (scrollFactor 0)
│   │   ├── Environment.js      — 10 sfondi procedurali (legacy, da integrare)
│   │   └── TrapEffect.js       — 10 effetti trappola animati (legacy, da integrare)
│   └── utils/
│       ├── LightPipeline.js    — Custom LightPipeline con fragment shader per normal maps
│       ├── AudioManager.js     — Oscillatori Web Audio per tutti i suoni di gioco
│       ├── TextureGenerator.js — Genera texture pixel art (player, heart, skull, ecc.)
│       ├── ScoreManager.js     — Punteggio, vite, livello corrente, save/load localStorage
│       └── ParticleFactory.js  — Configurazioni particle emitter per ambienti ed effetti
```

## Architettura GameScene

Il gameplay usa un loop **async/await** basato su animazioni sprite:

```
Phase A — Intro:  idle → walk → picking (raccolta oggetto)
Phase B — Domande (×10):
  B.1  Domanda visibile + walk right (= tempo per rispondere)
  B.2  Spostamento diagonale verso corridoio scelto
  B.3  Suspense walk nel corridoio
  B.4  Esito: passaggio sicuro OPPURE trappola (death/falling) + respawn
  B.5  Ritorno al centro (prossima domanda già visibile)
Phase C — Bonus (TODO): 60s, 16 domande binarie, scegli la risposta SBAGLIATA
```

### 4 Corridoi

| # | Y    | Angolo | Animazione        |
|---|------|--------|-------------------|
| 1 | 128  | 60°    | walk_up60         |
| 2 | 384  | 45°    | walk_up           |
| 3 | 640  | 45°    | walk_down         |
| 4 | 896  | 60°    | walk_down60       |

Centro: Y = 512 (VIEWPORT_H / 2)

## I 10 Livelli

| # | Nome | Ambiente | Trappola | Anim Trappola | Tema Domande |
|---|------|----------|----------|---------------|--------------|
| 1 | Il Tempio Perduto | temple | darts | death | Geografia italiana |
| 2 | La Caverna dei Cristalli | cave | stalactites | death | Scienze naturali |
| 3 | La Giungla Maledetta | jungle | quicksand | falling | Storia antica |
| 4 | Il Ponte sul Vulcano | volcano | lava | falling | Letteratura italiana |
| 5 | La Biblioteca Proibita | library | shelves | death | Arte e architettura |
| 6 | Il Labirinto di Ghiaccio | ice | freeze | death | Musica e cinema |
| 7 | Le Catacombe Egizie | catacombs | mummy | death | Storia medievale/moderna |
| 8 | La Nave Fantasma | ship | kraken | falling | Mitologia e leggende |
| 9 | La Torre dell'Alchimista | tower | explosion | death | Scienza e invenzioni |
| 10 | La Camera del Tesoro | treasure | collapse | falling | Mix finale |

## Meccaniche

- **4 corridoi** per domanda, risposte shufflate a ogni visualizzazione
- **Selezione modificabile** — il giocatore può cambiare risposta fino al lock-in (fine walk)
- **3 vite per livello** (reset a ogni nuovo livello)
- **Punteggio**: +100 base, +50 velocità (<5s), +50 primo tentativo, +200 completamento, +500 perfetto
- **Timer**: walk cycles = tempo per rispondere (12 cicli normali, 3 se pre-selezionato)
- **Domande**: la risposta corretta è sempre `answers[0]`; lo shuffle avviene in QuestionUI

## Viewport Dinamico

- Altezza fissa: 1024px
- Larghezza: calcolata da `window.innerWidth / window.innerHeight * 1024`
- Scale mode: `Phaser.Scale.FIT` + `CENTER_BOTH`
- Il mondo di gioco è largo 40000px; la camera segue il player orizzontalmente

## Flusso Scene

```
Boot → Title → [LevelIntro → GameScene → LevelComplete] ×10 → Victory
                                ↓ (vite=0)
                           GameOver → Title
```

Le trappole sono gestite inline in GameScene (no TrapScene separata).

## Convenzioni Codice

- Namespace globale `FloQuest` — ogni file assegna a `FloQuest.NomeModulo`
- Nessun import/export ES6, tutto via script tag in ordine nel HTML
- Scene Phaser come classi ES6 (`class extends Phaser.Scene`)
- GameScene usa `async/await` per il flusso di animazioni
- Oggetti/utility come IIFE o object literal con metodi statici
- Colori come valori hex numerici (`0xc9a84c`), convertiti a stringa CSS dove serve

## Come Testare

Servire con un web server locale (es. `python3 -m http.server` o VS Code Live Server) e aprire `index.html`. Serve connessione internet per il CDN di Phaser.
