# FloQuest — Sequenza di Gameplay per Livello

## Viewport

- Altezza fissa viewport: **1024px** (4x altezza personaggio)
- Personaggio: **256x256px** (sprite 128x128, scala 2x)
- Larghezza viewport: **100% risoluzione orizzontale** del monitor
- Se risoluzione verticale monitor < 1024px: scala tutto proporzionalmente
- Se risoluzione verticale monitor >= 1024px: viewport centrato verticalmente, bande vuote sopra/sotto
- Sfondo molto più largo del viewport, scorre orizzontalmente
- **FPS animazioni: 30** (Mixamo export)

## Layout Verticale

Lo spazio verticale di 1024px è diviso in **4 fasce uguali di 256px**, una per ogni corridoio/passaggio.
Il personaggio parte e ritorna sempre al **centro verticale** (y = 512).

| Fascia | Y centro | Corridoio | Angolazione dal centro |
|--------|----------|-----------|----------------------|
| 1 (top)    | 128  | Risposta A | walk_up60 (più lontano) |
| 2          | 384  | Risposta B | walk_up (più vicino) |
| 3          | 640  | Risposta C | walk_down (più vicino) |
| 4 (bottom) | 896  | Risposta D | walk_down60 (più lontano) |

## Struttura del Livello

Ogni livello si compone di due macro-fasi:

1. **Intro livello** (una sola volta): il personaggio raccoglie il foglio con le 10 domande
2. **Loop domande** (×10): domanda sovrapposta all'animazione, scelta corridoio, attraversamento con suspense

### Principi chiave

1. **Domande sovrapposte all'animazione**: le domande appaiono come overlay mentre il personaggio cammina, mai in sequenza dopo l'animazione. I tempi morti sono eliminati.
2. **Risposta modificabile**: il giocatore può cambiare la risposta selezionata fino al "punto di non ritorno" (fine del walk in B.1). Questo trasforma psicologicamente l'attesa in "tempo concesso per decidere" — il giocatore non si sente in attesa, ma in controllo.
3. **Suspense preservata**: nessuna indicazione sull'esito fino al punto trappola a metà corridoio.

---

## Fase A — Intro Livello (una sola volta)

Il personaggio raccoglie dal pavimento un foglio che contiene la lista delle 10 domande del livello. Questa è l'unica volta in cui viene eseguita l'animazione di picking.

| Step | Animazione | Cicli | Avanzamento | Note |
|------|-----------|-------|-------------|------|
| A.1 | idle | 1-2 cicli | nessuno | Appare il nome del livello, tema, trappola |
| A.2 | idle → walk_right (transizione) | 1x (7 frame) | nessuno | |
| A.3 | walk_right | 2-3 cicli | orizzontale + scroll | Il personaggio avanza verso il foglio |
| A.4 | walk_right → picking (transizione) | 1x (8 frame) | nessuno | |
| A.5 | picking | 1x (224 frame, non-loop) | nessuno | Il personaggio raccoglie il foglio con le 10 domande |
| A.6 | picking → idle (transizione) | 1x (8 frame) | nessuno | L'intro del livello scompare |

Narrativamente il foglio raccolto contiene la mappa con tutte e 10 le domande del livello. Al termine della Fase A il gioco entra nel loop delle domande.

---

## Fase B — Loop Domande (×10)

Il loop si ripete per ciascuna delle 10 domande del livello. Il flusso è progettato per eliminare i tempi morti: la domanda appare mentre il personaggio è in movimento, e la suspense viene preservata al punto trappola.

### B.1 — Domanda + Avanzamento

La domanda (testo + 4 risposte) appare come overlay UI. In contemporanea il personaggio cammina verso destra. Il giocatore legge e seleziona la risposta mentre l'animazione procede. **La risposta è modificabile** fino alla fine del walk: il giocatore può cambiare idea in qualsiasi momento.

**Per la domanda 1**: la domanda appare subito dopo la fine della Fase A.
**Per le domande 2-10**: la domanda appare durante la fase B.4/B.5 della domanda precedente, vedi sotto.

| Step | Animazione | Cicli | Avanzamento | Note |
|------|-----------|-------|-------------|------|
| B.1.1 | idle → walk_right (transizione) | 1x (7 frame) | nessuno | La domanda è già visibile (o appare ora per la domanda 1) |
| B.1.2 | walk_right | N cicli | orizzontale + scroll | Timer = durata walk. Il giocatore può selezionare e **cambiare** risposta |

**Meccanica della selezione modificabile:**

- L'overlay mostra la domanda e 4 risposte. Il giocatore ne seleziona una (click o tasto 1-4)
- La risposta selezionata è evidenziata, ma **può essere cambiata** in qualsiasi momento durante B.1
- Questo trasforma l'attesa in tempo decisionale attivo: anche se il giocatore risponde subito, sa di poter ripensarci
- Il walk_right procede sempre per tutti gli N cicli — non si interrompe alla prima selezione
- **Punto di non ritorno**: alla fine dell'ultimo ciclo di B.1.2, la selezione corrente viene bloccata e l'overlay scompare
- Se il giocatore **non ha selezionato nulla** alla fine del walk: morte immediata (per trappola o caduta)
- Se la domanda era già apparsa durante B.5 della domanda precedente e il giocatore ha già selezionato, B.1 usa meno cicli di walk (il giocatore ha già avuto tempo di leggere), ma può comunque cambiare idea durante il walk ridotto

### B.2 — Movimento verso il Corridoio Scelto

Al termine del walk di B.1, la selezione viene bloccata e l'overlay scompare. Il personaggio si dirige verso il corridoio corrispondente alla risposta selezionata. **Nessuna indicazione sull'esito** — la suspense inizia.

| Step | Animazione | Cicli | Avanzamento | Note |
|------|-----------|-------|-------------|------|
| B.2.1 | walk_right | 1 ciclo | orizzontale | Breve avanzamento verso il bivio |
| B.2.2 | walk_right → walk_up/down/up60/down60 (transizione) | 1x (30 frame) | orizzontale + verticale | Direzione dipende dal corridoio scelto |
| B.2.3 | walk_up/down/up60/down60 | 1-2 cicli | orizzontale + verticale | Avvicinamento all'ingresso del corridoio |
| B.2.4 | walk_up/down/up60/down60 → walk_right (transizione) | 1x (30 frame) | orizzontale + verticale | Riallineamento orizzontale all'ingresso |

### B.3 — Attraversamento Corridoio (prima metà — suspense)

Il personaggio entra nel corridoio. Il punto trappola è a **metà corridoio**. Fino a quel punto il giocatore non sa se ha scelto bene o male.

| Step | Animazione | Cicli | Avanzamento | Note |
|------|-----------|-------|-------------|------|
| B.3.1 | walk_right | 2 cicli | orizzontale | Prima metà del corridoio — suspense massima |

### B.4 — Esito (seconda metà corridoio)

Al punto trappola l'esito si rivela.

#### Risposta corretta:

| Step | Animazione | Cicli | Avanzamento | Note |
|------|-----------|-------|-------------|------|
| B.4.1 | walk_right | 2 cicli | orizzontale | Seconda metà — il personaggio attraversa indenne |

**⚙️ Da calibrare nel prototipo:** la domanda successiva potrebbe apparire a metà corridoio (appena superata la trappola, step B.4.1) oppure alla fine del corridoio (dopo B.4.1). La prima opzione risparmia ~1-2 secondi ma potrebbe sembrare frettolosa. Testare entrambe le varianti.

#### Risposta sbagliata:

| Step | Animazione | Cicli | Avanzamento | Note |
|------|-----------|-------|-------------|------|
| B.4.1a | walk_right → death (transizione, 8 frame) | 1x | nessuno | Trappola: morte |
| B.4.1b | walk_right → falling (transizione, 8 frame) + falling (loop) | 1x + loop | verticale (caduta) | Trappola: caduta nel vuoto |

Dopo la trappola: perdita di una vita. Se restano vite, la stessa domanda viene riproposta (ripartenza da B.1 con la stessa domanda, il personaggio riappare al centro). Se le vite sono esaurite: Game Over.

### B.5 — Ritorno al Centro (solo se risposta corretta)

Il personaggio torna alla linea centrale. **La domanda successiva appare durante questa fase** (il momento esatto dipende dalla calibrazione di B.4, vedi sopra). Il giocatore inizia a leggere la prossima domanda mentre il personaggio torna al centro — il ritorno diventa tempo di lettura utile, non tempo morto.

| Step | Animazione | Cicli | Avanzamento | Note |
|------|-----------|-------|-------------|------|
| B.5.1 | walk_right → walk_up/down/up60/down60 (transizione) | 1x (30 frame) | orizzontale + verticale | Direzione opposta alla fase B.2 |
| B.5.2 | walk_up/down/up60/down60 | 1-2 cicli | orizzontale + verticale | Avvicinamento al centro |
| B.5.3 | walk_up/down/up60/down60 → walk_right (transizione) | 1x (30 frame) | orizzontale + verticale | Riallineamento al centro |

Al termine di B.5 il loop ricomincia da **B.1** con la domanda successiva (che il giocatore sta già leggendo).

---

## Flusso Complessivo

```
Fase A (intro + picking)
  │
  └─→ Domanda 1 appare
       │
       B.1 (walk_right, giocatore legge e risponde)
       B.2 (verso corridoio scelto — suspense inizia)
       B.3 (prima metà corridoio — suspense massima)
       B.4 (punto trappola — rivelazione esito)
       │
       ├─ CORRETTO:
       │    B.4 seconda metà corridoio
       │    B.5 ritorno al centro ← domanda successiva appare qui
       │    └─→ B.1 domanda successiva (giocatore sta già leggendo)
       │
       └─ SBAGLIATO:
            B.4 trappola → morte
            ├─ vite > 0 → ripartenza da B.1 (stessa domanda)
            └─ vite = 0 → Game Over

  ... ×10 domande ...
  └─→ Livello completato
```

## Tempistiche Stimate

| Fase | Durata approssimativa | Note |
|------|----------------------|------|
| A (intro) | ~12-15s | Una sola volta per livello |
| B.1 (domanda + walk) | ~5-10s | Tempo effettivo ridotto: il giocatore ha iniziato a leggere durante B.5 precedente |
| B.2 (verso corridoio) | ~3-5s | Variabile per corridoio, nessuna indicazione sull'esito |
| B.3 (prima metà) | ~2-3s | Suspense |
| B.4 (esito) | ~2-3s corretto, ~2-4s sbagliato | Rivelazione |
| B.5 (ritorno) | ~3-5s | Tempo di lettura per la domanda successiva |
| **Totale per domanda (corretto)** | ~15-25s | vs ~35-50s della versione originale |

## Note

- **Avanzamento**: comprende sia lo spostamento del personaggio nel mondo sia lo scroll della camera/sfondo.
- **Angolazioni**: walk_up60/down60 per i corridoi esterni (1 e 4), walk_up/down per i corridoi interni (2 e 3). L'angolazione maggiore (60°) compensa la distanza verticale maggiore.
- **Cicli variabili** (1-2, 2-3): da calibrare con prove visive per trovare il ritmo migliore.
- **Animazioni di transizione**: sono sempre complete (non interrompibili). Il numero di frame è fisso.
- **Overlay domanda**: l'UI della domanda è sovrapposta alla scena di gioco, non blocca le animazioni. Deve essere leggibile ma non coprire eccessivamente l'azione.
- **Picking**: eseguito una sola volta all'inizio del livello. Narrativamente il foglio raccolto contiene la mappa/lista di tutte e 10 le domande.
- **Punto di apparizione domanda successiva**: da testare nel prototipo. Due varianti: (1) a metà corridoio, appena superata la trappola; (2) alla fine del corridoio, prima del ritorno. La differenza è di ~1-2 secondi.
