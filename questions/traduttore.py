import sqlite3
import json
import time
import ast
from openai import OpenAI

# ==========================================
# CONFIGURAZIONE
# ==========================================
DB_FILE = 'trivia_game.db'
API_BASE_URL = "http://172.30.0.18:8080/v1"
API_KEY = "sk-no-key-required"
LIMIT_SESSIONE = 1000 # Quante domande tradurre prima di fermarsi

# Inizializza il client sincrono
client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)

SYSTEM_PROMPT = """
Sei un traduttore professionista e un autore di giochi trivia.
Ti fornirò una domanda di un quiz in INGLESE, completa di risposta corretta e risposte sbagliate.
Il tuo compito è:
1. Tradurre la domanda in ITALIANO in modo colloquiale, breve e diretto.
2. Tradurre la risposta corretta in ITALIANO.
3. Tradurre le risposte sbagliate in ITALIANO mantenendo lo stesso livello di plausibilità.
4. Valutare se la domanda è strettamente legata alla cultura pop, geografia o politica degli Stati Uniti (1) o se è di cultura generale internazionale (0).

Restituisci ESCLUSIVAMENTE un oggetto JSON valido con queste chiavi:
"question_it" (stringa),
"correct_answer_it" (stringa),
"incorrect_answers_it" (array di stringhe),
"is_us_centric" (intero: 0 o 1).
Non aggiungere spiegazioni o testo fuori dal JSON.
"""

def map_difficulty(diff_str):
    """Mappa la difficoltà testuale di OpenTDB nel nostro formato numerico"""
    mapping = {'easy': 1, 'medium': 2, 'hard': 3}
    return mapping.get(diff_str.lower(), 2)

def main():
    print("Inizializzazione Traduttore OpenTDB...")
    
    # Connessione al database
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Peschiamo le domande grezze che non sono ancora state tradotte
    cursor.execute('''
        SELECT id, category, type, difficulty, question, correct_answer, incorrect_answers 
        FROM opentdb_raw 
        WHERE is_translated = 0 
        LIMIT ?
    ''', (LIMIT_SESSIONE,))
    
    righe_da_tradurre = cursor.fetchall()
    
    if not righe_da_tradurre:
        print("Non ci sono nuove domande da tradurre nel database. Avvia prima il downloader.")
        conn.close()
        return

    print(f"Trovate {len(righe_da_tradurre)} domande da elaborare in questa sessione.")
    print("-" * 50)

    for riga in righe_da_tradurre:
        raw_id, category_en, q_type, diff_str, question_en, correct_en, incorrect_str = riga
        
        # Recuperiamo l'array delle risposte sbagliate salvato come stringa
        try:
            incorrect_en_list = ast.literal_eval(incorrect_str)
        except Exception:
            incorrect_en_list = []

        difficulty_int = map_difficulty(diff_str)
        
        # Prepariamo il prompt per l'LLM
        user_prompt = f"""
Domanda Originale: {question_en}
Risposta Corretta: {correct_en}
Risposte Sbagliate: {json.dumps(incorrect_en_list)}
"""
        try:
            start_time = time.time()
            
            response = client.chat.completions.create(
                model="local-model",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1, # Molto bassa: vogliamo una traduzione precisa, non creatività
                response_format={"type": "json_object"}
            )
            
            output_text = response.choices[0].message.content.strip()
            data = json.loads(output_text)
            
            # Gestione array risposte sbagliate (italiano e inglese)
            inc_it = data.get('incorrect_answers_it', [])
            
            # Pad degli array per evitare errori di indice se l'API restituisce meno distrattori (es. domande Vero/Falso)
            inc_en_1 = incorrect_en_list[0] if len(incorrect_en_list) > 0 else None
            inc_en_2 = incorrect_en_list[1] if len(incorrect_en_list) > 1 else None
            inc_en_3 = incorrect_en_list[2] if len(incorrect_en_list) > 2 else None
            
            inc_it_1 = inc_it[0] if len(inc_it) > 0 else None
            inc_it_2 = inc_it[1] if len(inc_it) > 1 else None
            inc_it_3 = inc_it[2] if len(inc_it) > 2 else None

            # 1. Recupero o inserimento Categoria
            cursor.execute("SELECT id FROM categories WHERE name_en = ?", (category_en,))
            cat_row = cursor.fetchone()
            if cat_row:
                cat_id = cat_row[0]
            else:
                cursor.execute("INSERT INTO categories (name_en) VALUES (?)", (category_en,))
                cat_id = cursor.lastrowid

            # 2. Inserimento nella tabella principale (sfalsiamo l'indice per non sovrascriverci con Jeopardy)
            # Usiamo raw_id + 1000000 come source_row_index fittizio
            fake_source_index = raw_id + 100000 
            
            cursor.execute('''
            INSERT OR REPLACE INTO questions (
                source_row_index, category_id, difficulty, is_us_centric,
                question_en, correct_answer_en, incorrect_1_en, incorrect_2_en, incorrect_3_en,
                question_it, correct_answer_it, incorrect_1_it, incorrect_2_it, incorrect_3_it
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                fake_source_index, cat_id, difficulty_int, data.get('is_us_centric', 0),
                question_en, correct_en, inc_en_1, inc_en_2, inc_en_3,
                data.get('question_it', ''), data.get('correct_answer_it', ''),
                inc_it_1, inc_it_2, inc_it_3
            ))
            
            # 3. Aggiorniamo il flag nella tabella grezza
            cursor.execute('UPDATE opentdb_raw SET is_translated = 1 WHERE id = ?', (raw_id,))
            
            conn.commit()
            
            gen_time = round(time.time() - start_time, 2)
            print(f"[SUCCESS] ID {raw_id} tradotto e salvato ({gen_time}s)")
            
        except json.JSONDecodeError:
            print(f"[ERROR] ID {raw_id} -> L'LLM ha generato un JSON malformato. Verrà riprovato al prossimo avvio.")
        except Exception as e:
            print(f"[API ERROR] Problema all'ID {raw_id}: {e}")
            time.sleep(3) # Pausa di recupero in caso di errore server

    conn.close()
    print("-" * 50)
    print("Sessione di traduzione completata.")

if __name__ == "__main__":
    main()
