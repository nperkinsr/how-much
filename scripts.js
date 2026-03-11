/////////////////////////////////////////////////////
// SECTION 1: STATE
/////////////////////////////////////////////////////

const gameState = {
  playerName: "",
  isHost: false,
  roundTime: 30,
  productCount: 5,
  gameCode: "",
  gameStarted: false,

  players: [],
  usedAvatars: [],
  usedTitles: [],

  productsCatalog: [],
  roundProducts: [],
  totalRounds: 0,
  currentRoundIndex: 0,

  guessedPeerIds: [],
  guessesByPeer: {},

  roundTimerId: null,
  roundResultsTimeoutId: null,
};

const networkState = {
  peer: null,
  myPeerId: "",
  hostConnections: {},
  connectedToHost: null,
};

const confettiState = {
  particles: [],
  animationId: null,
  stopTimeoutId: null,
};

/////////////////////////////////////////////////////
// SECTION 2: DOM REFERENCES
/////////////////////////////////////////////////////

const headerInfo = document.getElementById("header-info");
const headerActions = document.getElementById("header-actions");

const nameInput = document.getElementById("player-name");
const nameError = document.getElementById("name-error");
const hostBtn = document.getElementById("btn-host");
const joinBtn = document.getElementById("btn-join");

const generateBtn = document.getElementById("generate-room");
const roundTimeSelect = document.getElementById("round-time");
const productCountSelect = document.getElementById("product-count");

const joinCodeInput = document.getElementById("join-code");
const joinCodeError = document.getElementById("join-code-error");
const connectJoinBtn = document.getElementById("btn-connect-join");
const backFromJoinBtn = document.getElementById("btn-back-from-join");
const backFromHostSettingsBtn = document.getElementById(
  "btn-back-from-host-settings",
);

const roundCounterValue = document.getElementById("round-counter-value");
const secondsCounterValue = document.getElementById("seconds-counter-value");
const guessesCounterText = document.getElementById("guesses-counter-text");

const gameProductImage = document.getElementById("game-product-image");
const gameProductTitle = document.getElementById("game-product-title");
const gameProductDescription = document.getElementById("game-product-description");

const playerGuessInput = document.getElementById("player-guess-input");
const sendGuessBtn = document.getElementById("btn-send-guess");
const guessLockedText = document.getElementById("guess-locked-text");

const roundResultsOverlay = document.getElementById("round-results-overlay");
const resultsCard = document.getElementById("results-card");
const resultsSummaryText = document.getElementById("results-summary-text");
const resultsPlayersGrid = document.getElementById("results-players-grid");
const resultsConfettiCanvas = document.getElementById("results-confetti-canvas");

const buttonClickSound = new Audio("images/buttonClick.mp3");
const successSound = new Audio("images/success.mp3");

/////////////////////////////////////////////////////
// SECTION 3: EVENT BINDINGS
/////////////////////////////////////////////////////

hostBtn.addEventListener("click", handleHostClick);
joinBtn.addEventListener("click", handleJoinClick);
generateBtn.addEventListener("click", handleGenerateRoom);
connectJoinBtn.addEventListener("click", handleConnectJoin);
backFromJoinBtn.addEventListener("click", handleBackToStart);
backFromHostSettingsBtn.addEventListener("click", handleBackToStart);

nameInput.addEventListener("input", handleNameInput);
joinCodeInput.addEventListener("input", handleJoinCodeInput);
playerGuessInput.addEventListener("focus", handleGuessInputFocus);
sendGuessBtn.addEventListener("click", handleSendGuessClick);

// This one handler gives all buttons a click sound, including buttons created later.
document.addEventListener("click", handleGlobalButtonClick);
window.addEventListener("resize", resizeConfettiCanvas);

/////////////////////////////////////////////////////
// SECTION 4: HEADER UI
/////////////////////////////////////////////////////

function setHeaderIntro() {
  headerInfo.innerHTML = `
    <h3>GUESS THE REAL PRICES OF ACTUAL ETSY PRODUCTS</h3>
    <p>Compete with your friends to see who can guess the closest</p>
  `;

  headerActions.innerHTML = "";
}

function setHeaderLobbyHost(hostCode) {
  headerInfo.innerHTML = "";

  headerActions.innerHTML = `
    <div class="lobby-header-right">
      <button id="btn-start-game" class="btn btn-start" disabled>
        Start game
      </button>
      <div class="lobby-host-info">
        <span>Your host ID:</span>
        <div class="host-code-box">
          <input id="host-code" class="host-code-input" readonly value="${hostCode}">
          <button id="copy-code" class="copy-btn">
            <i class="bi bi-copy"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  setupCopyButton();
  setupStartGameButton();
}

/////////////////////////////////////////////////////
// SECTION 5: INPUT VALIDATION
/////////////////////////////////////////////////////

function handleNameInput() {
  if (nameInput.value.length > 11) {
    nameInput.value = nameInput.value.slice(0, 11);
  }

  nameError.classList.remove("visible");
  nameInput.classList.remove("input-invalid");
}

function handleJoinCodeInput() {
  joinCodeError.classList.remove("visible");
  joinCodeInput.classList.remove("input-invalid");
}

function handleGuessInputFocus() {
  playerGuessInput.placeholder = "";
}

function getValidatedPlayerName() {
  const formatted = formatPlayerName(nameInput.value);

  if (formatted === "") {
    nameError.classList.add("visible");
    nameInput.classList.add("input-invalid");
    return null;
  }

  nameError.classList.remove("visible");
  nameInput.classList.remove("input-invalid");
  nameInput.value = formatted;
  return formatted;
}

function getValidatedJoinCode() {
  const code = joinCodeInput.value.trim();

  if (code === "") {
    joinCodeError.classList.add("visible");
    joinCodeInput.classList.add("input-invalid");
    return null;
  }

  joinCodeError.classList.remove("visible");
  joinCodeInput.classList.remove("input-invalid");
  return code;
}

function formatPlayerName(rawName) {
  const trimmed = rawName.trim().slice(0, 11);
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/////////////////////////////////////////////////////
// SECTION 6: SCREEN NAVIGATION
/////////////////////////////////////////////////////

function showScreen(screenId) {
  const screens = document.querySelectorAll(".screen");

  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  document.getElementById(screenId).classList.add("active");

  if (screenId === "screen-lobby-host") {
    setHeaderLobbyHost(gameState.gameCode);
  } else {
    setHeaderIntro();
  }
}

/////////////////////////////////////////////////////
// SECTION 7: BUTTON HANDLERS
/////////////////////////////////////////////////////

function handleHostClick() {
  const name = getValidatedPlayerName();
  if (!name) return;

  gameState.playerName = name;
  gameState.isHost = true;
  showScreen("screen-host-settings");
}

function handleJoinClick() {
  const name = getValidatedPlayerName();
  if (!name) return;

  gameState.playerName = name;
  gameState.isHost = false;
  showScreen("screen-join-as-player");
}

async function handleGenerateRoom() {
  gameState.roundTime = parseInt(roundTimeSelect.value, 10);
  gameState.productCount = parseInt(productCountSelect.value, 10);
  await startHostLobby();
}

async function handleConnectJoin() {
  const hostCode = getValidatedJoinCode();
  if (!hostCode) return;

  await connectToHostLobby(hostCode);
}

function handleBackToStart() {
  showScreen("screen-start");
}

async function handleStartGameClick() {
  await ensureProductsLoaded();

  const totalRounds = Math.min(gameState.productCount, gameState.productsCatalog.length);
  if (totalRounds === 0) return;

  gameState.roundProducts = pickRandomProductsForGame(totalRounds);
  gameState.totalRounds = totalRounds;
  gameState.gameStarted = true;

  const payload = {
    roundTime: gameState.roundTime,
    totalRounds,
    roundProducts: gameState.roundProducts,
    players: gameState.players,
  };

  applyStartGamePayload(payload);
  broadcastToPlayers({ type: "startGame", payload });
}

function handleSendGuessClick() {
  if (playerGuessInput.disabled) return;

  const rawValue = playerGuessInput.value.trim();
  if (!rawValue) return;

  const guessValue = Number(rawValue);
  if (Number.isNaN(guessValue)) return;

  lockGuessUI();

  if (gameState.isHost) {
    const isNewGuess = registerGuessForPeer(networkState.myPeerId, guessValue);
    if (isNewGuess) {
      broadcastGuessCounter();
    }
    return;
  }

  if (networkState.connectedToHost && networkState.connectedToHost.open) {
    networkState.connectedToHost.send({
      type: "submitGuess",
      payload: {
        peerId: networkState.myPeerId,
        value: guessValue,
      },
    });
  }
}

/////////////////////////////////////////////////////
// SECTION 8: AUDIO HELPERS
/////////////////////////////////////////////////////

function handleGlobalButtonClick(event) {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  playButtonClickSound();
}

function playButtonClickSound() {
  const instance = buttonClickSound.cloneNode();
  instance.play().catch(() => {});
}

function playSuccessSound() {
  const instance = successSound.cloneNode();
  instance.play().catch(() => {});
}

/////////////////////////////////////////////////////
// SECTION 9: LOBBY RENDERING
/////////////////////////////////////////////////////

function renderLobbyPlayerLists() {
  renderPlayers("players-container");
  renderPlayers("players-container-player");
}

function renderPlayers(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  gameState.players.forEach((player) => {
    const card = document.createElement("div");
    card.classList.add("player-card");

    card.innerHTML = `
      <img src="${player.avatar}" class="player-avatar" alt="${player.name}">
      <div class="player-info">
        <div class="player-name">${player.name}</div>
        <div class="player-title">${player.title}</div>
        <div class="player-points">${player.points} points</div>
      </div>
    `;

    container.appendChild(card);
  });
}

/////////////////////////////////////////////////////
// SECTION 10: PRODUCTS AND ROUND SETUP
/////////////////////////////////////////////////////

async function ensureProductsLoaded() {
  if (gameState.productsCatalog.length > 0) return;

  const response = await fetch("products.json");
  const products = await response.json();
  gameState.productsCatalog = Array.isArray(products) ? products : [];
}

function pickRandomProductsForGame(count) {
  const sortedById = [...gameState.productsCatalog].sort(
    (a, b) => Number(a.id) - Number(b.id),
  );

  for (let i = sortedById.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [sortedById[i], sortedById[j]] = [sortedById[j], sortedById[i]];
  }

  return sortedById.slice(0, count);
}

function applyStartGamePayload(payload) {
  gameState.roundTime = payload.roundTime;
  gameState.totalRounds = payload.totalRounds;
  gameState.roundProducts = payload.roundProducts || [];

  if (payload.players) {
    gameState.players = payload.players;
  }

  startRoundAtIndex(0);
}

function startRoundAtIndex(roundIndex) {
  gameState.currentRoundIndex = roundIndex;
  gameState.guessedPeerIds = [];
  gameState.guessesByPeer = {};

  hideResultsOverlay();
  showScreen("screen-game");

  renderCurrentRoundProduct();
  setRoundCounter();
  updateGuessCounterText();
  resetGuessUI();
  startRoundTimer(gameState.roundTime);
}

function renderCurrentRoundProduct() {
  const product = gameState.roundProducts[gameState.currentRoundIndex];
  if (!product) return;

  gameProductImage.src = product.image || "";
  gameProductImage.alt = product.name || "Product image";
  gameProductTitle.textContent = product.name || "{Product-name}";
  gameProductDescription.textContent =
    product.description || "{product-description}";
}

function setRoundCounter() {
  roundCounterValue.textContent = `${gameState.currentRoundIndex + 1}/${gameState.totalRounds}`;
}

function updateGuessCounterText() {
  guessesCounterText.textContent = `${gameState.guessedPeerIds.length} out of ${gameState.players.length} players have sent their guesses`;
}

/////////////////////////////////////////////////////
// SECTION 11: GUESS INPUT UI CONTROL
/////////////////////////////////////////////////////

function setGuessControlsEnabled(isEnabled) {
  playerGuessInput.disabled = !isEnabled;
  sendGuessBtn.disabled = !isEnabled;
}

function resetGuessUI() {
  playerGuessInput.value = "";
  playerGuessInput.placeholder = "45.37";
  guessLockedText.style.display = "none";
  setGuessControlsEnabled(true);
}

function lockGuessUI() {
  guessLockedText.style.display = "block";
  setGuessControlsEnabled(false);
}

/////////////////////////////////////////////////////
// SECTION 12: TIMERS AND ROUND END
/////////////////////////////////////////////////////

function clearRunningTimers() {
  if (gameState.roundTimerId) {
    clearInterval(gameState.roundTimerId);
    gameState.roundTimerId = null;
  }

  if (gameState.roundResultsTimeoutId) {
    clearTimeout(gameState.roundResultsTimeoutId);
    gameState.roundResultsTimeoutId = null;
  }
}

function startRoundTimer(seconds) {
  clearRunningTimers();

  let remainingSeconds = Number(seconds);
  secondsCounterValue.textContent = String(remainingSeconds);

  gameState.roundTimerId = setInterval(() => {
    remainingSeconds -= 1;
    secondsCounterValue.textContent = String(Math.max(remainingSeconds, 0));

    if (remainingSeconds > 0) return;

    clearInterval(gameState.roundTimerId);
    gameState.roundTimerId = null;
    setGuessControlsEnabled(false);

    if (gameState.isHost) {
      finishRoundAsHost();
    }
  }, 1000);
}

function registerGuessForPeer(peerId, value) {
  if (gameState.guessedPeerIds.includes(peerId)) return false;

  gameState.guessedPeerIds.push(peerId);
  gameState.guessesByPeer[peerId] = Number(value);
  updateGuessCounterText();
  return true;
}

function finishRoundAsHost() {
  const currentProduct = gameState.roundProducts[gameState.currentRoundIndex];
  if (!currentProduct) return;

  const actualPrice = Number(currentProduct.price);
  const winnerIds = getRoundWinnerIds(actualPrice);

  awardRoundPoints(winnerIds);

  const summaryText = buildRoundSummaryText(winnerIds, actualPrice);
  showResultsOverlay(summaryText, winnerIds);

  broadcastToPlayers({
    type: "roundResult",
    payload: {
      summaryText,
      winnerIds,
      players: gameState.players,
    },
  });

  const isLastRound = gameState.currentRoundIndex >= gameState.totalRounds - 1;

  gameState.roundResultsTimeoutId = setTimeout(() => {
    if (isLastRound) {
      finishGameAsHost();
      return;
    }

    const nextRoundIndex = gameState.currentRoundIndex + 1;
    startRoundAtIndex(nextRoundIndex);

    broadcastToPlayers({
      type: "roundStart",
      payload: {
        currentRoundIndex: nextRoundIndex,
        roundTime: gameState.roundTime,
        totalRounds: gameState.totalRounds,
        players: gameState.players,
      },
    });
  }, 6000);
}

function awardRoundPoints(winnerIds) {
  winnerIds.forEach((peerId) => {
    const player = getPlayerById(peerId);
    if (!player) return;
    player.points = (player.points || 0) + 100;
  });
}

function finishGameAsHost() {
  const winnerIds = getOverallWinnerIds();
  const summaryText = buildGameSummaryText(winnerIds);

  showResultsOverlay(summaryText, winnerIds, { celebrate: true });

  broadcastToPlayers({
    type: "gameOver",
    payload: {
      summaryText,
      winnerIds,
      players: gameState.players,
    },
  });
}

/////////////////////////////////////////////////////
// SECTION 13: ROUND RESULT CALCULATIONS
/////////////////////////////////////////////////////

function getRoundWinnerIds(actualPrice) {
  const entries = Object.entries(gameState.guessesByPeer);
  if (entries.length === 0) return [];

  let closestDiff = Number.POSITIVE_INFINITY;

  entries.forEach(([, guess]) => {
    const diff = Math.abs(Number(guess) - actualPrice);
    if (diff < closestDiff) {
      closestDiff = diff;
    }
  });

  return entries
    .filter(([, guess]) => Math.abs(Number(guess) - actualPrice) === closestDiff)
    .map(([peerId]) => peerId);
}

function getOverallWinnerIds() {
  if (gameState.players.length === 0) return [];

  let topScore = Number.NEGATIVE_INFINITY;

  gameState.players.forEach((player) => {
    if (player.points > topScore) {
      topScore = player.points;
    }
  });

  return gameState.players
    .filter((player) => player.points === topScore)
    .map((player) => player.peerId);
}

function getPlayerById(peerId) {
  return gameState.players.find((player) => player.peerId === peerId);
}

function formatPrice(value) {
  return Number(value).toFixed(2);
}

function buildRoundSummaryText(winnerIds, actualPrice) {
  if (winnerIds.length === 0) {
    return `No one guessed this round. The real price was £${formatPrice(actualPrice)}.`;
  }

  const winnerNames = winnerIds
    .map((peerId) => getPlayerById(peerId)?.name || "Player")
    .join(", ");

  if (winnerIds.length === 1) {
    const guess = gameState.guessesByPeer[winnerIds[0]];
    return `${winnerNames} guessed £${formatPrice(guess)} and the real price was £${formatPrice(actualPrice)}.`;
  }

  return `${winnerNames} tied with the closest guesses. The real price was £${formatPrice(actualPrice)}.`;
}

function buildGameSummaryText(winnerIds) {
  if (winnerIds.length === 0) {
    return "Game over. No winner this time.";
  }

  const winnerNames = winnerIds
    .map((peerId) => getPlayerById(peerId)?.name || "Player")
    .join(", ");

  const topScore = getPlayerById(winnerIds[0])?.points || 0;

  if (winnerIds.length === 1) {
    return `Game over! ${winnerNames} wins with ${topScore} points.`;
  }

  return `Game over! Tie between ${winnerNames} with ${topScore} points.`;
}

/////////////////////////////////////////////////////
// SECTION 14: RESULTS OVERLAY AND CONFETTI
/////////////////////////////////////////////////////

function showResultsOverlay(summaryText, winnerIds, options = {}) {
  resultsSummaryText.textContent = summaryText;
  renderResultsPlayers(winnerIds);
  roundResultsOverlay.classList.remove("hidden");

  if (options.celebrate) {
    startWinnerConfetti();
    playSuccessSound();
  } else {
    stopWinnerConfetti();
  }
}

function hideResultsOverlay() {
  roundResultsOverlay.classList.add("hidden");
  stopWinnerConfetti();
}

function renderResultsPlayers(winnerIds) {
  resultsPlayersGrid.innerHTML = "";

  gameState.players.forEach((player) => {
    const card = document.createElement("div");
    card.className = "results-player-card";

    if (winnerIds.includes(player.peerId)) {
      card.classList.add("winner");
    }

    card.innerHTML = `
      <img src="${player.avatar}" class="results-player-avatar" alt="${player.name}">
      <div>
        <div class="results-player-name">${player.name}</div>
        <div class="results-player-title">${player.title}</div>
        <div class="results-player-points">${player.points} points</div>
      </div>
    `;

    resultsPlayersGrid.appendChild(card);
  });
}

// Canvas size is recalculated when window size changes, so particles stay sharp.
function resizeConfettiCanvas() {
  if (!resultsConfettiCanvas || !roundResultsOverlay) return;

  const ratio = window.devicePixelRatio || 1;
  const width = roundResultsOverlay.clientWidth;
  const height = roundResultsOverlay.clientHeight;

  resultsConfettiCanvas.width = Math.max(1, Math.floor(width * ratio));
  resultsConfettiCanvas.height = Math.max(1, Math.floor(height * ratio));

  const ctx = resultsConfettiCanvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function spawnConfettiBurst() {
  if (!resultsCard || !roundResultsOverlay) return;

  const overlayRect = roundResultsOverlay.getBoundingClientRect();
  const cardRect = resultsCard.getBoundingClientRect();

  const originX = cardRect.left - overlayRect.left + cardRect.width / 2;
  const originY = cardRect.top - overlayRect.top + 8;

  const colors = ["#f5822a", "#f0c419", "#4ecdc4", "#ffffff", "#ff6b6b"];

  for (let i = 0; i < 110; i += 1) {
    confettiState.particles.push({
      x: originX + (Math.random() - 0.5) * 70,
      y: originY + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 6.5,
      vy: -7 - Math.random() * 6,
      size: 4 + Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 70 + Math.floor(Math.random() * 40),
    });
  }
}

function drawAndUpdateConfetti() {
  const ctx = resultsConfettiCanvas?.getContext("2d");

  if (!ctx || !roundResultsOverlay || roundResultsOverlay.classList.contains("hidden")) {
    confettiState.animationId = null;
    return;
  }

  const width = roundResultsOverlay.clientWidth;
  const height = roundResultsOverlay.clientHeight;
  ctx.clearRect(0, 0, width, height);

  confettiState.particles = confettiState.particles.filter(
    (particle) => particle.life > 0 && particle.y < height + 30,
  );

  confettiState.particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.24;
    particle.rotation += particle.rotationSpeed;
    particle.life -= 1;

    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.fillStyle = particle.color;
    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.65);
    ctx.restore();
  });

  if (confettiState.particles.length === 0) {
    confettiState.animationId = null;
    return;
  }

  confettiState.animationId = requestAnimationFrame(drawAndUpdateConfetti);
}

function startWinnerConfetti() {
  if (!resultsConfettiCanvas) return;

  resizeConfettiCanvas();
  stopWinnerConfetti();

  spawnConfettiBurst();
  setTimeout(spawnConfettiBurst, 180);

  if (!confettiState.animationId) {
    confettiState.animationId = requestAnimationFrame(drawAndUpdateConfetti);
  }

  confettiState.stopTimeoutId = setTimeout(() => {
    stopWinnerConfetti();
  }, 3600);
}

function stopWinnerConfetti() {
  if (confettiState.stopTimeoutId) {
    clearTimeout(confettiState.stopTimeoutId);
    confettiState.stopTimeoutId = null;
  }

  if (confettiState.animationId) {
    cancelAnimationFrame(confettiState.animationId);
    confettiState.animationId = null;
  }

  confettiState.particles = [];

  const ctx = resultsConfettiCanvas?.getContext("2d");
  if (ctx && roundResultsOverlay) {
    ctx.clearRect(0, 0, roundResultsOverlay.clientWidth, roundResultsOverlay.clientHeight);
  }
}

/////////////////////////////////////////////////////
// SECTION 15: PEER CONNECTION CORE
/////////////////////////////////////////////////////

function createPeerConnection() {
  return new Promise((resolve) => {
    const peer = new window.Peer(undefined, { debug: 1 });

    peer.on("open", (id) => {
      networkState.peer = peer;
      networkState.myPeerId = id;
      resolve(peer);
    });
  });
}

/////////////////////////////////////////////////////
// SECTION 16: HOST FLOW
/////////////////////////////////////////////////////

async function startHostLobby() {
  const peer = await createPeerConnection();
  const hostId = networkState.myPeerId;

  gameState.gameCode = hostId;

  const hostPlayer = createPlayer({
    peerId: hostId,
    name: gameState.playerName,
    points: 0,
  });

  gameState.players = [hostPlayer];

  peer.on("connection", (connection) => {
    setupHostConnection(connection);
  });

  showScreen("screen-lobby-host");
  renderLobbyPlayerLists();
}

function setupHostConnection(connection) {
  networkState.hostConnections[connection.peer] = connection;

  connection.on("data", (data) => {
    handleMessageForHost(connection.peer, data);
  });

  connection.on("close", () => {
    delete networkState.hostConnections[connection.peer];
    removePlayerById(connection.peer);

    if (!gameState.gameStarted) {
      broadcastLobbyState();
      renderLobbyPlayerLists();
    } else {
      updateGuessCounterText();
    }
  });
}

function handleMessageForHost(peerId, data) {
  if (data.type === "joinLobby") {
    const incoming = data.payload.player;

    const newPlayer = createPlayer({
      peerId,
      name: incoming.name,
      avatar: incoming.avatar,
      title: incoming.title,
      points: 0,
    });

    addOrUpdatePlayer(newPlayer);
    broadcastLobbyState();
    renderLobbyPlayerLists();
    return;
  }

  if (data.type === "submitGuess") {
    const senderId = data.payload.peerId || peerId;
    const isNewGuess = registerGuessForPeer(senderId, data.payload.value);

    if (isNewGuess) {
      broadcastGuessCounter();
    }
  }
}

function broadcastLobbyState() {
  broadcastToPlayers({
    type: "lobbyState",
    payload: {
      hostCode: gameState.gameCode,
      players: gameState.players,
    },
  });
}

function broadcastGuessCounter() {
  updateGuessCounterText();

  broadcastToPlayers({
    type: "guessCounter",
    payload: {
      guessedPeerIds: gameState.guessedPeerIds,
    },
  });
}

function broadcastToPlayers(message) {
  Object.values(networkState.hostConnections).forEach((connection) => {
    if (connection && connection.open) {
      connection.send(message);
    }
  });
}

/////////////////////////////////////////////////////
// SECTION 17: PLAYER FLOW
/////////////////////////////////////////////////////

async function connectToHostLobby(hostCode) {
  const peer = await createPeerConnection();
  const normalizedHostCode = hostCode.trim();

  gameState.gameCode = normalizedHostCode;

  const selfPlayer = createPlayer({
    peerId: networkState.myPeerId,
    name: gameState.playerName,
    points: 0,
  });

  const connection = peer.connect(normalizedHostCode);
  networkState.connectedToHost = connection;

  await new Promise((resolve) => {
    connection.on("open", () => {
      connection.send({
        type: "joinLobby",
        payload: { player: selfPlayer },
      });
      resolve();
    });
  });

  connection.on("close", () => {
    clearRunningTimers();
    showScreen("screen-start");
  });

  connection.on("data", (data) => {
    handleMessageForPlayer(data);
  });

  showScreen("screen-lobby-player");
  gameState.players = [selfPlayer];
  renderLobbyPlayerLists();
}

function handleMessageForPlayer(data) {
  if (data.type === "lobbyState") {
    gameState.players = data.payload.players;
    gameState.gameCode = data.payload.hostCode || gameState.gameCode;
    renderLobbyPlayerLists();
    setHeaderIntro();
    return;
  }

  if (data.type === "startGame") {
    gameState.gameStarted = true;
    applyStartGamePayload(data.payload);
    return;
  }

  if (data.type === "roundStart") {
    gameState.players = data.payload.players || gameState.players;
    gameState.totalRounds = data.payload.totalRounds || gameState.totalRounds;
    gameState.roundTime = data.payload.roundTime || gameState.roundTime;
    startRoundAtIndex(data.payload.currentRoundIndex);
    return;
  }

  if (data.type === "guessCounter") {
    gameState.guessedPeerIds = data.payload.guessedPeerIds || [];
    updateGuessCounterText();
    return;
  }

  if (data.type === "roundResult") {
    gameState.players = data.payload.players || gameState.players;
    showResultsOverlay(data.payload.summaryText, data.payload.winnerIds || []);
    return;
  }

  if (data.type === "gameOver") {
    clearRunningTimers();
    gameState.players = data.payload.players || gameState.players;
    showResultsOverlay(data.payload.summaryText, data.payload.winnerIds || [], {
      celebrate: true,
    });
  }
}

/////////////////////////////////////////////////////
// SECTION 18: PLAYER OBJECT UTILITIES
/////////////////////////////////////////////////////

function createPlayer({ peerId, name, avatar, title, points }) {
  return {
    peerId,
    name: name || "Player",
    avatar: avatar || getRandomAvatar(),
    title: title || getRandomTitle(),
    points: Number.isFinite(points) ? points : 0,
  };
}

function addOrUpdatePlayer(player) {
  const index = gameState.players.findIndex(
    (existingPlayer) => existingPlayer.peerId === player.peerId,
  );

  if (index >= 0) {
    gameState.players[index] = player;
    return;
  }

  gameState.players.push(player);
}

function removePlayerById(peerId) {
  gameState.players = gameState.players.filter(
    (player) => player.peerId !== peerId,
  );
}

/////////////////////////////////////////////////////
// SECTION 19: AVATAR AND TITLE HELPERS
/////////////////////////////////////////////////////

let titles = ["Bargain Hunter", "Deal Detective"];

function getRandomAvatar() {
  const totalAvatars = 22;
  const availableAvatarNumbers = [];

  for (let number = 1; number <= totalAvatars; number += 1) {
    if (!gameState.usedAvatars.includes(number)) {
      availableAvatarNumbers.push(number);
    }
  }

  if (availableAvatarNumbers.length === 0) {
    return "images/profile/1.jpg";
  }

  const randomIndex = Math.floor(Math.random() * availableAvatarNumbers.length);
  const selectedNumber = availableAvatarNumbers[randomIndex];

  gameState.usedAvatars.push(selectedNumber);
  return `images/profile/${selectedNumber}.jpg`;
}

async function loadTitles() {
  const response = await fetch("titles.json");
  const data = await response.json();
  titles = data.titles;
}

function getRandomTitle() {
  const availableTitles = titles.filter(
    (title) => !gameState.usedTitles.includes(title),
  );

  const titlePool = availableTitles.length > 0 ? availableTitles : titles;
  const randomIndex = Math.floor(Math.random() * titlePool.length);
  const selectedTitle = titlePool[randomIndex];

  gameState.usedTitles.push(selectedTitle);
  return selectedTitle;
}

/////////////////////////////////////////////////////
// SECTION 20: HEADER BUTTON HELPERS
/////////////////////////////////////////////////////

function setupCopyButton() {
  const copyBtn = document.getElementById("copy-code");
  if (!copyBtn) return;

  copyBtn.removeEventListener("click", handleCopyClick);
  copyBtn.addEventListener("click", handleCopyClick);
}

function setupStartGameButton() {
  const startGameBtn = document.getElementById("btn-start-game");
  if (!startGameBtn) return;

  startGameBtn.disabled = false;
  startGameBtn.removeEventListener("click", handleStartGameClick);
  startGameBtn.addEventListener("click", handleStartGameClick);
}

function handleCopyClick() {
  const hostCodeInput = document.getElementById("host-code");
  if (!hostCodeInput) return;

  navigator.clipboard.writeText(hostCodeInput.value);
}

/////////////////////////////////////////////////////
// SECTION 21: STARTUP
/////////////////////////////////////////////////////

loadTitles();
setHeaderIntro();
