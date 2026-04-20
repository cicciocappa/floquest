# Sincronizzazione domande: locale → Cloudflare D1

Le domande del gioco vivono in due posti:

- **Locale**: `questions/trivia_game.db` (SQLite), dove si traducono e si
  curano le domande a partire da `opentdb_raw`.
- **Remoto**: database D1 `floquest` su Cloudflare, interrogato dal Worker
  (`api/worker.js`) per servire le domande al gioco.

Questa procedura descrive come portare nuove domande dal DB locale al D1 remoto.

---

## Procedura standard — aggiungere nuove domande

1. **Traduci / inserisci nuove righe in locale**

   Con `traduttore.py` (o altro), traduci righe da `opentdb_raw` e scrivile
   nella tabella `questions` del file `questions/trivia_game.db`.

2. **Rigenera il dump**

   ```bash
   cd api
   bash dump.sh
   ```

   Produce `api/data.sql` con tutte le righe correnti di `categories` e
   `questions`, usando `INSERT OR IGNORE INTO ...`. Lo script è idempotente:
   rilanciarlo non duplica nulla perché la colonna `source_row_index` è UNIQUE.

3. **Sincronizza sul D1 remoto**

   ```bash
   npx wrangler d1 execute floquest --remote --file=data.sql
   ```

   Solo le righe nuove vengono effettivamente inserite. Il Worker le vede
   immediatamente alla prima chiamata successiva: **nessun redeploy del Worker
   è necessario**, perché il codice non cambia — cambia solo il contenuto del
   DB.

4. **Verifica**

   ```bash
   npx wrangler d1 execute floquest --remote --command="SELECT COUNT(*) FROM questions"
   ```

---

## Casi particolari

### Correggere una domanda già sincronizzata

`INSERT OR IGNORE` non sovrascrive le righe esistenti. Due opzioni:

- **Fix puntuale** — update diretto sul remoto:

  ```bash
  npx wrangler d1 execute floquest --remote \
    --command="UPDATE questions SET question_it='...nuovo testo...' WHERE id=123"
  ```

- **Fix in bulk** — cambia temporaneamente `dump.sh` da
  `INSERT OR IGNORE` a `INSERT OR REPLACE`, lancia dump + sync, poi ripristina.

### Reset totale del dataset remoto

Dopo refactor significativi è più pulito ripartire da zero:

```bash
npx wrangler d1 execute floquest --remote \
  --command="DELETE FROM questions; DELETE FROM categories;"
cd api
bash dump.sh
npx wrangler d1 execute floquest --remote --file=data.sql
```

### Test in locale prima di deployare

Se vuoi provare modifiche allo schema o al Worker senza toccare la produzione:

```bash
cd api
npx wrangler dev
```

Il Worker gira su `http://localhost:8787` contro un D1 locale. Per popolarlo
usa `--local` al posto di `--remote` nei comandi:

```bash
npx wrangler d1 execute floquest --local --file=schema.sql
npx wrangler d1 execute floquest --local --file=data.sql
```

---

## Cosa NON è sincronizzato

- La tabella `opentdb_raw` vive **solo in locale**. È la sorgente grezza da
  tradurre: non serve al Worker e non viene importata su D1.
- `dump.sh` esporta solo `categories` e `questions`.
