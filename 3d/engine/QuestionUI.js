// UI domanda DOM-based. Volutamente brutta ma funzionale: l'engine demo
// non è il posto per il polish UI — quello arriverà sopra Phaser/canvas.
// L'unica cosa che conta è la semantica: showQuestion(q) → Promise<bool>.

let activeUI = null;

// q: { text: string, answers: string[], correctIndex: number }
export function showQuestion(q) {
  if (activeUI) activeUI.remove();

  const overlay = document.createElement('div');
  overlay.className = 'fq-question-overlay';
  overlay.innerHTML = `
    <div class="fq-question-card">
      <div class="fq-question-text"></div>
      <div class="fq-question-answers"></div>
    </div>
  `;
  overlay.querySelector('.fq-question-text').textContent = q.text;

  const answersDiv = overlay.querySelector('.fq-question-answers');
  document.body.appendChild(overlay);
  activeUI = overlay;

  return new Promise(resolve => {
    q.answers.forEach((ans, i) => {
      const btn = document.createElement('button');
      btn.className = 'fq-question-btn';
      btn.textContent = ans;
      btn.onclick = () => {
        overlay.remove();
        activeUI = null;
        resolve(i === q.correctIndex);
      };
      answersDiv.appendChild(btn);
    });
  });
}

// CSS minimo iniettato una sola volta. Centrato in basso, semitrasparente,
// non blocca completamente la scena.
const STYLE = `
  .fq-question-overlay {
    position: fixed; inset: auto 0 24px 0;
    display: flex; justify-content: center; pointer-events: none;
    z-index: 1000;
  }
  .fq-question-card {
    pointer-events: auto;
    background: rgba(20, 20, 25, 0.92);
    border: 1px solid #444; border-radius: 10px;
    padding: 16px 20px; min-width: 480px; max-width: 720px;
    color: #eee; font-family: -apple-system, system-ui, sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }
  .fq-question-text {
    font-size: 16px; font-weight: 500; margin-bottom: 12px;
  }
  .fq-question-answers {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  }
  .fq-question-btn {
    background: #2a2a2a; color: #eee;
    border: 1px solid #555; border-radius: 6px;
    padding: 10px 14px; font-size: 14px; cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }
  .fq-question-btn:hover {
    background: #3a3a3a; border-color: #777;
  }
`;
const styleEl = document.createElement('style');
styleEl.textContent = STYLE;
document.head.appendChild(styleEl);
