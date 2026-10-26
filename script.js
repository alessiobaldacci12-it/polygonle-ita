/**
 * POLYGONLE ITALIA - Script Principale
 * Gestisce l'importazione JSON, i simboli in alto ingranditi, l'animazione flip,
 * la selezione giornaliera basata su epoch days e il blocco della sfida giornaliera.
 */

const FALLBACK_SOLUZIONI = ["ANANAS", "BALLATA", "CASCATA", "FANTASMA", "ROBOTICA", "SABATO", "MARTELL", "PALLONE", "TARANTOLA"];
const FALLBACK_TENTATIVI = ["ANANAS", "BALLATA", "CASCATA", "FANTASMA", "ROBOTICA", "SABATO", "MARTELL", "PALLONE", "TARANTOLA", "AZZURRO", "BISCARD", "CANDIDO", "DIPINTO", "ELEFANT", "FINALE"];

const SHAPES_SVG = [
    (c) => `<svg class="shape-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="${c}"/></svg>`,
    (c) => `<svg class="shape-icon" viewBox="0 0 24 24"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="${c}"/></svg>`,
    (c) => `<svg class="shape-icon" viewBox="0 0 24 24"><polygon points="2,22 22,2 22,22" fill="${c}"/></svg>`,
    (c) => `<svg class="shape-icon" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="${c}"/></svg>`,
    (c) => `<svg class="shape-icon" viewBox="0 0 24 24"><polygon points="12,2 22,22 2,22" fill="${c}"/></svg>`,
    (c) => `<svg class="shape-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${c}"/></svg>`,
    (c) => `<svg class="shape-icon" viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" fill="${c}"/></svg>`,
    (c) => `<svg class="shape-icon" viewBox="0 0 24 24"><polygon points="12,2 22,9 18,21 6,21 2,9" fill="${c}"/></svg>`
];

const COLOR_PALETTE = [
    "#2B6CB0", "#ED8936", "#00B4D8", "#E63946", "#F4A261", "#2A9D8F", "#9B5DE5", "#F15BB5"
];

let soluzioni = [];
let tentativiValidi = [];
let targetWord = "";
let currentGuess = "";
let currentAttempt = 0;
let gameOver = false;
let isAnimating = false;
let mode = "daily";
let letterToPatternMap = {};

const KEYBOARD_ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
];

// --- GESTIONE DATA E COMPLETAMENTO GIORNALIERA ---
function getTodayDateStr() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function isDailyCompleted() {
    const key = `polygonle_completed_${getTodayDateStr()}`;
    return localStorage.getItem(key) === 'true';
}

function markDailyCompleted() {
    const key = `polygonle_completed_${getTodayDateStr()}`;
    localStorage.setItem(key, 'true');
}

// --- INIZIALIZZAZIONE ---
document.addEventListener("DOMContentLoaded", async () => {
    await loadDictionaries();
    initGame();
    setupEventListeners();
    showRulesModal();
});

async function loadDictionaries() {
    try {
        const [resSol, resTent] = await Promise.all([
            fetch('soluzioni.json').catch(() => null),
            fetch('tentativi.json').catch(() => null)
        ]);

        if (resSol && resSol.ok) {
            soluzioni = await resSol.json();
        } else {
            soluzioni = FALLBACK_SOLUZIONI;
        }

        if (resTent && resTent.ok) {
            tentativiValidi = await resTent.json();
        } else {
            tentativiValidi = FALLBACK_TENTATIVI;
        }
    } catch (e) {
        soluzioni = FALLBACK_SOLUZIONI;
        tentativiValidi = FALLBACK_TENTATIVI;
    }
}

function initGame() {
    if (mode === "daily" && isDailyCompleted()) {
        showToast("Hai già completato la sfida di oggi! Passaggio all'Allenamento.");
        mode = "practice";
        updateModeUI();
    }

    gameOver = false;
    isAnimating = false;
    currentGuess = "";
    currentAttempt = 0;
    
    selectTargetWord();
    generateSymbolMapping();
    renderTopSymbols();
    renderBoard();
    renderKeyboard();
    updateActiveTileHighlight();
}

function selectTargetWord() {
    const validSol = soluzioni.filter(w => w.length === 7);
    const pool = validSol.length > 0 ? validSol : FALLBACK_SOLUZIONI;

    if (mode === "daily") {
        // Uso dei giorni trascorsi dall'epoca Unix per garantire una rotazione univoca e progressiva ogni giorno
        const epochDays = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
        const index = epochDays % pool.length;
        targetWord = pool[index].toUpperCase();
    } else {
        const index = Math.floor(Math.random() * pool.length);
        targetWord = pool[index].toUpperCase();
    }
}

function generateSymbolMapping() {
    letterToPatternMap = {};
    const uniqueLetters = Array.from(new Set(targetWord.split('')));
    
    const shuffledShapes = [...SHAPES_SVG].sort(() => 0.5 - Math.random());
    const shuffledColors = [...COLOR_PALETTE].sort(() => 0.5 - Math.random());

    uniqueLetters.forEach((char, idx) => {
        letterToPatternMap[char] = {
            shapeRender: shuffledShapes[idx % shuffledShapes.length],
            color: shuffledColors[idx % shuffledColors.length]
        };
    });
}

function renderTopSymbols() {
    const symbolsContainer = document.getElementById("symbols-row");
    symbolsContainer.innerHTML = "";

    for (let c = 0; c < 7; c++) {
        const char = targetWord[c];
        const pattern = letterToPatternMap[char];

        const symbolBox = document.createElement("div");
        symbolBox.className = "symbol-box";
        if (pattern) {
            symbolBox.innerHTML = pattern.shapeRender(pattern.color);
        }
        symbolsContainer.appendChild(symbolBox);
    }
}

function renderBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";

    for (let r = 0; r < 6; r++) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "row";
        rowDiv.id = `row-${r}`;

        for (let c = 0; c < 7; c++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            tile.id = `tile-${r}-${c}`;
            rowDiv.appendChild(tile);
        }
        board.appendChild(rowDiv);
    }
}

function renderKeyboard() {
    const keyboard = document.getElementById("keyboard");
    keyboard.innerHTML = "";

    KEYBOARD_ROWS.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "keyboard-row";

        row.forEach(key => {
            const btn = document.createElement("button");
            btn.className = "key";
            btn.textContent = key;
            btn.id = `key-${key}`;

            if (key === "ENTER" || key === "⌫") {
                btn.classList.add("large");
            }

            btn.addEventListener("click", () => handleKeyPress(key));
            rowDiv.appendChild(btn);
        });
        keyboard.appendChild(rowDiv);
    });
}

function setupEventListeners() {
    document.addEventListener("keydown", (e) => {
        if (gameOver || isAnimating) return;
        
        if (e.key === "Enter") {
            handleKeyPress("ENTER");
        } else if (e.key === "Backspace") {
            handleKeyPress("⌫");
        } else {
            const char = e.key.toUpperCase();
            if (char.length === 1 && char >= "A" && char <= "Z") {
                handleKeyPress(char);
            }
        }
    });

    document.getElementById("btn-help").addEventListener("click", showRulesModal);
    document.getElementById("close-rules").addEventListener("click", hideRulesModal);
    document.getElementById("btn-start-game").addEventListener("click", hideRulesModal);
    
    document.getElementById("close-end").addEventListener("click", () => {
        document.getElementById("modal-end").classList.add("hidden");
    });
    
    document.getElementById("btn-restart").addEventListener("click", () => {
        document.getElementById("modal-end").classList.add("hidden");
        initGame();
    });

    document.getElementById("btn-surrender").addEventListener("click", handleSurrender);

    document.getElementById("mode-daily").addEventListener("click", () => {
        if (mode === "daily" || isAnimating) return;
        if (isDailyCompleted()) {
            showToast("Hai già completato la sfida giornaliera!");
            return;
        }
        mode = "daily";
        updateModeUI();
        initGame();
    });

    document.getElementById("mode-practice").addEventListener("click", () => {
        if (mode === "practice" || isAnimating) return;
        mode = "practice";
        updateModeUI();
        initGame();
    });
}

function updateModeUI() {
    document.getElementById("mode-daily").classList.toggle("active", mode === "daily");
    document.getElementById("mode-practice").classList.toggle("active", mode === "practice");
}

function handleKeyPress(key) {
    if (gameOver || isAnimating) return;

    if (key === "⌫") {
        if (currentGuess.length > 0) {
            currentGuess = currentGuess.slice(0, -1);
            updateRowUI();
        }
    } else if (key === "ENTER") {
        if (currentGuess.length === 7) {
            submitGuess();
        } else {
            showToast("La parola deve contenere 7 lettere!");
        }
    } else {
        if (currentGuess.length < 7) {
            currentGuess += key;
            updateRowUI();
        }
    }
}

function updateRowUI() {
    for (let c = 0; c < 7; c++) {
        const tile = document.getElementById(`tile-${currentAttempt}-${c}`);
        const prevChar = tile.textContent;
        const newChar = currentGuess[c] || "";
        
        tile.textContent = newChar;

        if (newChar && !prevChar) {
            tile.classList.add("pop");
            setTimeout(() => tile.classList.remove("pop"), 100);
        }
    }
    updateActiveTileHighlight();
}

function updateActiveTileHighlight() {
    for (let c = 0; c < 7; c++) {
        const tile = document.getElementById(`tile-${currentAttempt}-${c}`);
        if (tile) {
            if (c === currentGuess.length && !gameOver) {
                tile.classList.add("active");
            } else {
                tile.classList.remove("active");
            }
        }
    }
}

function submitGuess() {
    const guess = currentGuess.toUpperCase();
    
    const isValid = tentativiValidi.length === 0 || 
                    tentativiValidi.map(w => w.toUpperCase()).includes(guess) ||
                    soluzioni.map(w => w.toUpperCase()).includes(guess);

    if (!isValid) {
        showToast("Parola non presente nel dizionario!");
        return;
    }

    isAnimating = true;
    updateActiveTileHighlight();

    const targetArr = targetWord.split('');
    const guessArr = guess.split('');
    const resultStatus = Array(7).fill("absent");

    for (let i = 0; i < 7; i++) {
        if (guessArr[i] === targetArr[i]) {
            resultStatus[i] = "correct";
            targetArr[i] = null;
        }
    }

    for (let i = 0; i < 7; i++) {
        if (resultStatus[i] !== "correct") {
            const indexInTarget = targetArr.indexOf(guessArr[i]);
            if (indexInTarget !== -1) {
                resultStatus[i] = "present";
                targetArr[indexInTarget] = null;
            }
        }
    }

    guessArr.forEach((letter, c) => {
        setTimeout(() => {
            const tile = document.getElementById(`tile-${currentAttempt}-${c}`);
            tile.classList.add("flip");
            
            setTimeout(() => {
                tile.classList.add(resultStatus[c]);

                const keyBtn = document.getElementById(`key-${letter}`);
                if (keyBtn) {
                    if (resultStatus[c] === "correct") {
                        keyBtn.className = "key correct";
                    } else if (resultStatus[c] === "present" && !keyBtn.classList.contains("correct")) {
                        keyBtn.className = "key present";
                    } else if (resultStatus[c] === "absent" && !keyBtn.classList.contains("correct") && !keyBtn.classList.contains("present")) {
                        keyBtn.className = "key absent";
                    }
                }
            }, 250);

            if (c === 6) {
                setTimeout(() => {
                    isAnimating = false;

                    if (guess === targetWord) {
                        gameOver = true;
                        if (mode === "daily") markDailyCompleted();
                        const rowWin = document.getElementById(`row-${currentAttempt}`);
                        rowWin.classList.add("win");
                        setTimeout(() => showEndModal(true, "Complimenti! Hai trovato la parola! 🎉"), 600);
                        return;
                    }

                    currentAttempt++;
                    currentGuess = "";

                    if (currentAttempt >= 6) {
                        gameOver = true;
                        if (mode === "daily") markDailyCompleted();
                        setTimeout(() => showEndModal(false, "Peccato! Hai esaurito i tentativi. 😔"), 400);
                    } else {
                        updateActiveTileHighlight();
                    }
                }, 500);
            }
        }, c * 250);
    });
}

function handleSurrender() {
    if (gameOver || isAnimating) return;
    gameOver = true;
    if (mode === "daily") markDailyCompleted();
    showEndModal(false, "Ti sei arreso! Ecco la soluzione:");
}

function showRulesModal() {
    document.getElementById("modal-rules").classList.remove("hidden");
}

function hideRulesModal() {
    document.getElementById("modal-rules").classList.add("hidden");
}

function showEndModal(isWin, message) {
    document.getElementById("end-title").textContent = isWin ? "Vittoria!" : "Partita Conclusa";
    document.getElementById("end-message").textContent = message;
    document.getElementById("end-word").textContent = targetWord;
    document.getElementById("modal-end").classList.remove("hidden");
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.remove("hidden");
    setTimeout(() => {
        toast.classList.add("hidden");
    }, 2000);
}