const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function buildRegular(row) {
    const answers = shuffle([row.c, row.i1, row.i2, row.i3]);
    return { id: row.id, q: row.q, answers, correct: answers.indexOf(row.c) };
}

function buildBonus(row) {
    const wrongs = [row.i1];
    if (row.i2 != null) wrongs.push(row.i2);
    if (row.i3 != null) wrongs.push(row.i3);
    const wrong = wrongs[Math.floor(Math.random() * wrongs.length)];
    const answers = shuffle([row.c, wrong]);
    return { id: row.id, q: row.q, answers, correct: answers.indexOf(row.c) };
}

export default {
    async fetch(request, env) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const url = new URL(request.url);
        if (url.pathname !== "/api/journey") {
            return json({ error: "not found" }, 404);
        }

        const difficulty = parseInt(url.searchParams.get("difficulty") || "1", 10);
        if (![1, 2, 3].includes(difficulty)) {
            return json({ error: "difficulty must be 1, 2 or 3" }, 400);
        }

        const lang = url.searchParams.get("lang") === "en" ? "en" : "it";

        // Regular: solo domande con 4 risposte (incorrect_2 e incorrect_3 presenti).
        const regularSql = `
            SELECT id,
                   question_${lang}         AS q,
                   correct_answer_${lang}   AS c,
                   incorrect_1_${lang}      AS i1,
                   incorrect_2_${lang}      AS i2,
                   incorrect_3_${lang}      AS i3
            FROM questions
            WHERE difficulty = ?
              AND question_${lang}    IS NOT NULL
              AND incorrect_1_${lang} IS NOT NULL
              AND incorrect_2_${lang} IS NOT NULL
              AND incorrect_3_${lang} IS NOT NULL
            ORDER BY RANDOM()
            LIMIT 100
        `;

        // Bonus: qualsiasi domanda (2 o 4 risposte). Per le 4-risposte,
        // il Worker pesca una delle incorrect a caso per formare la coppia.
        const bonusSql = `
            SELECT id,
                   question_${lang}         AS q,
                   correct_answer_${lang}   AS c,
                   incorrect_1_${lang}      AS i1,
                   incorrect_2_${lang}      AS i2,
                   incorrect_3_${lang}      AS i3
            FROM questions
            WHERE difficulty = ?
              AND question_${lang}    IS NOT NULL
              AND incorrect_1_${lang} IS NOT NULL
            ORDER BY RANDOM()
            LIMIT 36
        `;

        const [regularRes, bonusRes] = await env.DB.batch([
            env.DB.prepare(regularSql).bind(difficulty),
            env.DB.prepare(bonusSql).bind(difficulty),
        ]);

        return json({
            regular: regularRes.results.map(buildRegular),
            bonus: bonusRes.results.map(buildBonus),
        });
    },
};
