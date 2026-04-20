#!/bin/bash
# Esporta i dati di categories + questions da trivia_game.db in data.sql
# (solo INSERT, lo schema è in schema.sql).
set -euo pipefail

DB="$(dirname "$0")/../questions/trivia_game.db"
OUT="$(dirname "$0")/data.sql"

if [ ! -f "$DB" ]; then
    echo "DB non trovato: $DB" >&2
    exit 1
fi

sqlite3 "$DB" <<'EOF' | sed 's/^INSERT INTO/INSERT OR IGNORE INTO/' > "$OUT"
.mode insert categories
SELECT * FROM categories;
.mode insert questions
SELECT * FROM questions;
EOF

echo "Scritto $OUT ($(wc -l < "$OUT") righe)"
