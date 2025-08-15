// --- Config ---
const EMOJI = [
  "🐶","🐱","🦊","🦁","🐷","🐼","🐨","🐵",
  "🦄","🐸","🐙","🐧","🐤","🦉","🐝","🦋",
  "🌸","🍀","🍎","🍊","🍋","🍇","🥕","🍩",
  "⚽","🏀","🎲","🎯","🚗","✈️","🌈","⭐"
];

const DIFF = {
  easy:   { pairs: 8,  gridClass: "easy"   },
  medium: { pairs: 12, gridClass: "medium" },
  hard:   { pairs: 18, gridClass: "hard"   }
};

// --- State ---
let first = null, second = null, lock = false;
let moves = 0, matched = 0, totalPairs = 0;
let timer = null, seconds = 0, started = false;
let currentDiff = "easy";

// --- Elements ---
const grid = document.getElementById("grid");
const movesEl = document.getElementById("moves");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");
const restartBtn = document.getElementById("restart");
const diffSel = document.getElementById("difficulty");
const winDialog = document.getElementById("winDialog");
const finalTimeEl = document.getElementById("finalTime");
const finalMovesEl = document.getElementById("finalMoves");
const playAgainBtn = document.getElementById("playAgain");
const closeDialogBtn = document.getElementById("closeDialog");
const shareBtn = document.getElementById("share");

// --- Utils ---
function shuffle(arr) {
  // Fisher–Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getBestKey() { return `mm_best_time_${currentDiff}`; }
function loadBest() {
  const v = localStorage.getItem(getBestKey());
  bestEl.textContent = v ? v : "—";
}
function saveBestIfNeeded() {
  const k = getBestKey();
  const prev = localStorage.getItem(k);
  if (!prev || seconds < Number(prev)) localStorage.setItem(k, String(seconds));
}

// --- Timer ---
function startTimer() {
  if (started) return;
  started = true;
  timer = setInterval(() => {
    seconds++;
    timeEl.textContent = seconds;
  }, 1000);
}
function stopTimer() {
  clearInterval(timer);
  timer = null;
}

// --- Game setup ---
function newDeck(pairs) {
  const choices = shuffle([...EMOJI]).slice(0, pairs);
  const deck = shuffle([...choices, ...choices]); // duplicate and shuffle
  return deck;
}

function makeCard(symbol, index) {
  const card = document.createElement("button");
  card.className = "card";
  card.setAttribute("aria-label", "Hidden card");
  card.setAttribute("data-state", "hidden");
  card.dataset.value = symbol;
  card.dataset.index = index;
  card.innerHTML = `
    <div class="card-inner">
      <div class="card-front">❓</div>
      <div class="card-back" aria-hidden="true">${symbol}</div>
    </div>
  `;
  card.addEventListener("click", () => flip(card));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(card); }
  });
  return card;
}

function resetState() {
  first = second = null;
  lock = false;
  moves = 0; matched = 0; started = false; seconds = 0;
  movesEl.textContent = "0";
  timeEl.textContent = "0";
  if (timer) stopTimer();
}

function render() {
  const { pairs, gridClass } = DIFF[currentDiff];
  totalPairs = pairs;
  grid.className = `grid ${gridClass}`;
  grid.innerHTML = "";

  resetState();
  loadBest();

  const deck = newDeck(pairs);
  deck.forEach((sym, idx) => grid.appendChild(makeCard(sym, idx)));
}

function flip(card) {
  if (lock) return;
  const state = card.getAttribute("data-state");
  if (state !== "hidden") return;

  startTimer();

  card.setAttribute("data-state", "flipped");
  card.setAttribute("aria-label", `Revealed ${card.dataset.value}`);

  if (!first) { first = card; return; }
  if (card === first) return;

  second = card;
  moves++; movesEl.textContent = String(moves);

  checkMatch();
}

function checkMatch() {
  const isMatch = first.dataset.value === second.dataset.value;

  if (isMatch) {
    first.setAttribute("data-state", "matched");
    second.setAttribute("data-state", "matched");
    first.setAttribute("aria-label", `Matched ${first.dataset.value}`);
    second.setAttribute("aria-label", `Matched ${second.dataset.value}`);
    first = second = null;
    matched++;
    if (matched === totalPairs) return win();
  } else {
    lock = true;
    setTimeout(() => {
      first.setAttribute("data-state", "hidden");
      second.setAttribute("data-state", "hidden");
      first.setAttribute("aria-label", "Hidden card");
      second.setAttribute("aria-label", "Hidden card");
      first = second = null;
      lock = false;
    }, 700);
  }
}

function win() {
  stopTimer();
  saveBestIfNeeded();
  loadBest();

  finalTimeEl.textContent = String(seconds);
  finalMovesEl.textContent = String(moves);
  winDialog.showModal();
}

// Detect first player action and hide instructions
let gameStarted = false;

document.addEventListener("click", function (e) {
  if (!gameStarted) {
    const instructions = document.getElementById("instructions");
    if (instructions) {
      instructions.style.display = "none";
    }
    gameStarted = true;
  }
}, { once: true }); // once:true ensures it runs only once

document.addEventListener("click", function () {
  if (!gameStarted) {
    const instructions = document.getElementById("instructions");
    if (instructions) {
      instructions.classList.add("hide");
      setTimeout(() => instructions.remove(), 500); // Remove after fade
    }
    gameStarted = true;
  }
}, { once: true });


// --- Events ---
restartBtn.addEventListener("click", render);
diffSel.addEventListener("change", (e) => {
  currentDiff = e.target.value;
  render();
});
playAgainBtn.addEventListener("click", () => { winDialog.close(); render(); });
closeDialogBtn.addEventListener("click", () => winDialog.close());
shareBtn.addEventListener("click", () => {
  const text = `I beat Memory Match (${currentDiff}) in ${seconds}s with ${moves} moves!`;
  const url = location.href;
  const data = { title: "Memory Match", text, url };
  if (navigator.share) {
    navigator.share(data).catch(() => {});
  } else {
    // Fallback: WhatsApp
    const msg = encodeURIComponent(`${text} ${url}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }
});

// Initial render
render();
