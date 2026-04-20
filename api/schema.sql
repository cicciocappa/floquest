CREATE TABLE IF NOT EXISTS categories (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name_en TEXT UNIQUE,
    name_it TEXT
);

CREATE TABLE IF NOT EXISTS questions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    source_row_index  INTEGER UNIQUE,
    category_id       INTEGER,
    difficulty        INTEGER CHECK(difficulty IN (1, 2, 3)),
    is_us_centric     INTEGER CHECK(is_us_centric IN (0, 1)),
    question_en       TEXT NOT NULL,
    correct_answer_en TEXT NOT NULL,
    incorrect_1_en    TEXT,
    incorrect_2_en    TEXT,
    incorrect_3_en    TEXT,
    question_it       TEXT,
    correct_answer_it TEXT,
    incorrect_1_it    TEXT,
    incorrect_2_it    TEXT,
    incorrect_3_it    TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    CHECK (
        (incorrect_2_en IS NULL     AND incorrect_3_en IS NULL)
     OR (incorrect_2_en IS NOT NULL AND incorrect_3_en IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_questions_difficulty_shape
    ON questions(difficulty, incorrect_2_it);
