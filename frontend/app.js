let username = "";
let roomCode = "";
let currentPrompt = "";
let currentTool = "pencil";
let score = 0;
let correctGuesses = 0;
let timer = 60;
let timerInterval = null;
let roundSaved = false;

let isDrawing = false;
let lastPoint = null;
let strokes = [];
let currentStroke = [];
let history = [];

const loginScreen = document.getElementById("loginScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");
const dashboardScreen = document.getElementById("dashboardScreen");

const avatar = document.getElementById("avatar");
const dashboardBtn = document.getElementById("dashboardBtn");
const newGameBtn = document.getElementById("newGameBtn");

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginMessage = document.getElementById("loginMessage");

const playerName = document.getElementById("playerName");
const roomCodeText = document.getElementById("roomCodeText");
const activeRoomCode = document.getElementById("activeRoomCode");
const promptText = document.getElementById("promptText");

const categorySelect = document.getElementById("categorySelect");
const difficultySelect = document.getElementById("difficultySelect");
const joinRoomInput = document.getElementById("joinRoomInput");

const timerText = document.getElementById("timerText");
const predictionText = document.getElementById("predictionText");
const confidenceText = document.getElementById("confidenceText");
const confidenceBar = document.getElementById("confidenceBar");

const scoreboardList = document.getElementById("scoreboardList");
const activityList = document.getElementById("activityList");
const guessInput = document.getElementById("guessInput");
const historyTable = document.getElementById("historyTable");

const totalGamesEl = document.getElementById("totalGames");
const totalScoreEl = document.getElementById("totalScore");
const correctGuessesEl = document.getElementById("correctGuesses");
const bestCategoryEl = document.getElementById("bestCategory");

const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");

async function apiPost(url, data) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    let result;

    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (!response.ok) {
        throw new Error(result.detail || "Something went wrong");
    }

    return result;
}

async function apiGet(url) {
    const response = await fetch(url);

    let result;

    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (!response.ok) {
        throw new Error(result.detail || "Something went wrong");
    }

    return result;
}

function showScreen(screen) {
    loginScreen.classList.add("hidden");
    lobbyScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    dashboardScreen.classList.add("hidden");

    screen.classList.remove("hidden");
}

function addActivity(message) {
    const div = document.createElement("div");
    div.className = "activity-message";
    div.textContent = message;

    activityList.prepend(div);
}

function updateScoreboard() {
    scoreboardList.innerHTML = "";

    const players = [
        { name: username || "You", points: score },
        { name: "Ravi", points: 30 },
        { name: "Sneha", points: 20 },
        { name: "Arjun", points: 10 }
    ];

    players.forEach((player) => {
        const row = document.createElement("div");
        row.className = "player-row";

        row.innerHTML = `
            <span class="player-name">${player.name}</span>
            <span class="player-score">${player.points} pts</span>
        `;

        scoreboardList.appendChild(row);
    });
}

async function loadHistoryFromBackend() {
    if (!username) return;

    try {
        const records = await apiGet(`/api/history/${username}`);

        history = records.map((item) => {
            return {
                room: item.room_code,
                prompt: item.prompt || "-",
                prediction: item.predicted_category || "-",
                score: item.score,
                date: item.created_at
            };
        });

        updateDashboard();

    } catch (error) {
        console.log("Could not load history:", error.message);
    }
}

function updateDashboard() {
    const totalScoreFromHistory = history.reduce((sum, item) => {
        return sum + Number(item.score || 0);
    }, 0);

    totalGamesEl.textContent = history.length;
    totalScoreEl.textContent = totalScoreFromHistory;
    correctGuessesEl.textContent = correctGuesses;
    bestCategoryEl.textContent = categorySelect.value;

    historyTable.innerHTML = "";

    history.forEach((item) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${item.room}</td>
            <td>${item.prompt}</td>
            <td>${item.prediction}</td>
            <td>${item.score}</td>
            <td>${item.date}</td>
        `;

        historyTable.appendChild(row);
    });
}

function startTimer() {
    clearInterval(timerInterval);

    timer = 60;
    timerText.textContent = `${timer}s`;

    timerInterval = setInterval(() => {
        timer--;
        timerText.textContent = `${timer}s`;

        if (timer <= 0) {
            clearInterval(timerInterval);
            addActivity("Time is up! Round ended.");
            saveRoundHistory();
        }
    }, 1000);
}

async function saveRoundHistory() {
    if (roundSaved) return;

    roundSaved = true;

    const prediction = predictionText.textContent;

    const localRecord = {
        room: roomCode,
        prompt: currentPrompt,
        prediction: prediction,
        score: score,
        date: new Date().toLocaleString()
    };

    history.unshift(localRecord);
    updateDashboard();

    try {
        const result = await apiPost("/api/history", {
            room_code: roomCode,
            username: username,
            score: score,
            prompt: currentPrompt,
            predicted_category: prediction
        });

        addActivity(result.message);

    } catch (error) {
        addActivity("History save failed: " + error.message);
    }
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;
    ctx.strokeStyle = document.getElementById("colorPicker").value;
}

function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();

    let clientX;
    let clientY;

    if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function startDrawing(event) {
    event.preventDefault();

    isDrawing = true;
    lastPoint = getCanvasPoint(event);
    currentStroke = [lastPoint];
}

function draw(event) {
    if (!isDrawing) return;

    event.preventDefault();

    const newPoint = getCanvasPoint(event);

    if (currentTool === "eraser") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 18;
    } else {
        ctx.strokeStyle = document.getElementById("colorPicker").value;
        ctx.lineWidth = 5;
    }

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(newPoint.x, newPoint.y);
    ctx.stroke();

    currentStroke.push(newPoint);
    lastPoint = newPoint;
}

function stopDrawing(event) {
    if (!isDrawing) return;

    event.preventDefault();

    isDrawing = false;

    if (currentStroke.length > 1) {
        strokes.push(currentStroke);
    }

    currentStroke = [];
    lastPoint = null;
}

async function startGame() {
    if (!roomCode) {
        alert("Create or join a room first.");
        return;
    }

    if (!currentPrompt) {
        try {
            const result = await apiPost("/api/prompt", {
                category: categorySelect.value,
                difficulty: difficultySelect.value
            });

            currentPrompt = result.prompt;

        } catch (error) {
            alert(error.message);
            return;
        }
    }

    roundSaved = false;
    strokes = [];
    score = 0;

    activeRoomCode.textContent = roomCode;
    promptText.textContent = currentPrompt;

    predictionText.textContent = "Not predicted";
    confidenceText.textContent = "Confidence: 0%";
    confidenceBar.style.width = "0%";

    showScreen(gameScreen);

    setTimeout(() => {
        resizeCanvas();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateScoreboard();
        addActivity(`${username} joined the room.`);
        addActivity("AI prompt received from backend.");
        startTimer();
    }, 100);
}

document.getElementById("registerBtn").addEventListener("click", async () => {
    const enteredName = usernameInput.value.trim();
    const enteredPassword = passwordInput.value.trim();

    if (enteredName.length < 3) {
        loginMessage.textContent = "Username must be at least 3 characters.";
        return;
    }

    if (enteredPassword.length < 4) {
        loginMessage.textContent = "Password must be at least 4 characters.";
        return;
    }

    try {
        const result = await apiPost("/api/register", {
            username: enteredName,
            password: enteredPassword
        });

        loginMessage.textContent = result.message + ". Now click Login.";

    } catch (error) {
        loginMessage.textContent = error.message;
    }
});

document.getElementById("loginBtn").addEventListener("click", async () => {
    const enteredName = usernameInput.value.trim();
    const enteredPassword = passwordInput.value.trim();

    if (enteredName.length < 3) {
        loginMessage.textContent = "Username must be at least 3 characters.";
        return;
    }

    if (enteredPassword.length < 4) {
        loginMessage.textContent = "Password must be at least 4 characters.";
        return;
    }

    try {
        const result = await apiPost("/api/login", {
            username: enteredName,
            password: enteredPassword
        });

        username = result.username;

        playerName.textContent = username;
        avatar.textContent = username.charAt(0).toUpperCase();

        avatar.classList.remove("hidden");
        dashboardBtn.classList.remove("hidden");
        newGameBtn.classList.remove("hidden");

        loginMessage.textContent = "";
        showScreen(lobbyScreen);

        await loadHistoryFromBackend();

    } catch (error) {
        loginMessage.textContent = error.message;
    }
});

document.getElementById("createRoomBtn").addEventListener("click", async () => {
    try {
        const result = await apiPost("/api/rooms/create", {
            category: categorySelect.value,
            difficulty: difficultySelect.value
        });

        roomCode = result.room_code;
        currentPrompt = result.prompt;

        roomCodeText.textContent = roomCode;

        alert("Room created successfully. Click the room code to start game.");

    } catch (error) {
        alert(error.message);
    }
});

document.getElementById("joinRoomBtn").addEventListener("click", async () => {
    const code = joinRoomInput.value.trim().toUpperCase();

    if (code.length < 4) {
        alert("Enter a valid room code.");
        return;
    }

    roomCode = code;
    roomCodeText.textContent = roomCode;

    try {
        const result = await apiPost("/api/prompt", {
            category: categorySelect.value,
            difficulty: difficultySelect.value
        });

        currentPrompt = result.prompt;
        await startGame();

    } catch (error) {
        alert(error.message);
    }
});

document.getElementById("copyRoomBtn").addEventListener("click", () => {
    if (!roomCode) {
        alert("Create a room first.");
        return;
    }

    navigator.clipboard.writeText(roomCode);
    alert("Room code copied.");
});

roomCodeText.addEventListener("click", async () => {
    if (roomCode !== "") {
        await startGame();
    }
});

document.getElementById("newPromptBtn").addEventListener("click", async () => {
    try {
        const result = await apiPost("/api/prompt", {
            category: categorySelect.value,
            difficulty: difficultySelect.value
        });

        currentPrompt = result.prompt;
        promptText.textContent = currentPrompt;
        addActivity("New AI prompt generated from backend.");

    } catch (error) {
        alert(error.message);
    }
});

document.querySelectorAll(".difficulty-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".difficulty-tabs button").forEach((b) => {
            b.classList.remove("active");
        });

        btn.classList.add("active");
        difficultySelect.value = btn.dataset.level;
    });
});

document.getElementById("pencilBtn").addEventListener("click", () => {
    currentTool = "pencil";
    document.getElementById("pencilBtn").classList.add("active");
    document.getElementById("eraserBtn").classList.remove("active");
});

document.getElementById("eraserBtn").addEventListener("click", () => {
    currentTool = "eraser";
    document.getElementById("eraserBtn").classList.add("active");
    document.getElementById("pencilBtn").classList.remove("active");
});

document.getElementById("clearBtn").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes = [];
    predictionText.textContent = "Not predicted";
    confidenceText.textContent = "Confidence: 0%";
    confidenceBar.style.width = "0%";

    addActivity("Canvas cleared.");
});

document.getElementById("predictBtn").addEventListener("click", async () => {
    if (strokes.length === 0) {
        alert("Draw something first.");
        return;
    }

    try {
        const result = await apiPost("/api/predict", {
            strokes: strokes
        });

        const prediction = result.predicted_category;
        const confidence = result.confidence;

        predictionText.textContent = prediction;
        confidenceText.textContent = `Confidence: ${confidence}%`;
        confidenceBar.style.width = `${confidence}%`;

        addActivity(`Real ML predicted category: ${prediction} (${confidence}%)`);

    } catch (error) {
        alert("ML prediction failed: " + error.message);
    }
});

document.getElementById("submitGuessBtn").addEventListener("click", submitGuess);

guessInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        submitGuess();
    }
});

function submitGuess() {
    const guess = guessInput.value.trim();

    if (!guess) return;

    addActivity(`${username} guessed: ${guess}`);

    const category = categorySelect.value.toLowerCase();
    const prompt = currentPrompt.toLowerCase();

    if (
        guess.toLowerCase().includes(category.slice(0, -1)) ||
        prompt.includes(guess.toLowerCase())
    ) {
        score += 10;
        correctGuesses++;
        addActivity("Correct guess! +10 points.");
        updateScoreboard();
        saveRoundHistory();
    }

    guessInput.value = "";
}

dashboardBtn.addEventListener("click", async () => {
    await loadHistoryFromBackend();
    updateDashboard();
    showScreen(dashboardScreen);
});

newGameBtn.addEventListener("click", () => {
    showScreen(lobbyScreen);
});

window.addEventListener("resize", resizeCanvas);

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseleave", stopDrawing);

canvas.addEventListener("touchstart", startDrawing);
canvas.addEventListener("touchmove", draw);
canvas.addEventListener("touchend", stopDrawing);