/////////////////////////////////////////////////////
// SECTION 1: STATE
/////////////////////////////////////////////////////

const gameState = {
  playerName: "",
  isHost: false, // This is determined at the start
  roundTime: 30,
  productCount: 5,
  gameCode: "",
  gameStarted: false, // Becomes true once the host starts the game

  players: [],
  usedAvatars: [], // To avoid duplicate avatar assignments
  usedTitles: [],

  productsCatalog: [],
  roundProducts: [], // Products selected for the current game session
  totalRounds: 0,
  currentRoundIndex: 0,
  roundFinished: false,

  guessedPeerIds: [],
  guessesByPeer: {}, // { peerId: guessValue }

  roundTimerId: null, // For counting down the seconds in a round
};

const networkState = {
  peer: null,
  myPeerId: "",
  hostConnections: {},
  connectedToHost: null,
  isDisconnecting: false,
};

// For the confetti animation I found on CodePen by user "Lukasz Kwasniewski" here https://codepen.io/lukaszkwasniewski/pen/KKVqZyB
const confettiState = {
  particles: [],
  animationId: null,
  burstTimeoutId: null,
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
const hostError = document.getElementById("host-error");

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
const gameProductDescription = document.getElementById(
  "game-product-description",
);

const playerGuessInput = document.getElementById("player-guess-input");
const sendGuessBtn = document.getElementById("btn-send-guess");
const guessError = document.getElementById("guess-error");
const guessLockedText = document.getElementById("guess-locked-text");

const roundResultsOverlay = document.getElementById("round-results-overlay");
const resultsCard = document.getElementById("results-card");
const resultsSummaryText = document.getElementById("results-summary-text");
const resultsPlayersGrid = document.getElementById("results-players-grid");
const resultsActions = document.getElementById("results-actions");
const resultsConfettiCanvas = document.getElementById(
  "results-confetti-canvas",
);

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
playerGuessInput.addEventListener("input", handleGuessInputChange);
nameInput.addEventListener("keydown", handleNameInputKeydown);
joinCodeInput.addEventListener("keydown", handleJoinCodeInputKeydown);
playerGuessInput.addEventListener("keydown", handleGuessInputKeydown);
sendGuessBtn.addEventListener("click", handleSendGuessClick);

// This one handler gives all buttons a click sound
document.addEventListener("click", handleGlobalButtonClick);
window.addEventListener("resize", resizeConfettiCanvas);

/////////////////////////////////////////////////////
// SECTION 4: HEADER UI
/////////////////////////////////////////////////////

function setHeaderIntro() {
  headerInfo.replaceChildren();

  const title = document.createElement("h3");
  title.textContent = "GUESS THE REAL PRICES OF ACTUAL ETSY PRODUCTS";

  const subtitle = document.createElement("p");
  subtitle.textContent = "Compete with your friends to see who can guess the closest";

  headerInfo.append(title, subtitle);
  headerActions.replaceChildren();
}

function setHeaderLobbyHost(hostCode) {
  headerInfo.replaceChildren();
  headerActions.replaceChildren();

  const headerRight = document.createElement("div");
  headerRight.className = "lobby-header-right";

  const startButton = document.createElement("button");
  startButton.id = "btn-start-game";
  startButton.className = "btn btn-start";
  startButton.type = "button";
  startButton.textContent = "Start game";

  const hostInfo = document.createElement("div");
  hostInfo.className = "lobby-host-info";

  const label = document.createElement("label");
  label.htmlFor = "host-code";
  label.textContent = "Your host ID:";

  const codeBox = document.createElement("div");
  codeBox.className = "host-code-box";

  const hostCodeInput = document.createElement("input");
  hostCodeInput.id = "host-code";
  hostCodeInput.className = "host-code-input";
  hostCodeInput.readOnly = true;
  hostCodeInput.value = hostCode;

  const copyButton = document.createElement("button");
  copyButton.id = "copy-code";
  copyButton.className = "copy-btn";
  copyButton.type = "button";
  copyButton.setAttribute("aria-label", "Copy host ID");
  copyButton.title = "Copy host ID";

  const copyIcon = document.createElement("i");
  copyIcon.className = "bi bi-copy";
  copyIcon.setAttribute("aria-hidden", "true");

  const copyFeedback = document.createElement("span");
  copyFeedback.id = "copy-feedback";
  copyFeedback.className = "copy-feedback";
  copyFeedback.textContent = "Copied";

  copyButton.append(copyIcon);
  codeBox.append(hostCodeInput, copyButton);
  hostInfo.append(label, codeBox, copyFeedback);
  headerRight.append(startButton, hostInfo);
  headerActions.append(headerRight);

  setupCopyButton();
  setupStartGameButton();
}

function setBusyButton(button, isBusy, busyText) {
  if (!button) return;

  if (isBusy) {
    button.dataset.defaultText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.defaultText || button.textContent;
  button.disabled = false;
}

/////////////////////////////////////////////////////
// SECTION 5: INPUT VALIDATION
/////////////////////////////////////////////////////

function handleNameInput() {
  if (nameInput.value.length > 11) {
    nameInput.value = nameInput.value.slice(0, 11);
  }

  setInputError(nameInput, nameError, false);
}

function handleJoinCodeInput() {
  joinCodeInput.value = joinCodeInput.value.trim().toUpperCase();
  setInputError(joinCodeInput, joinCodeError, false);
}

function handleGuessInputFocus() {
  playerGuessInput.placeholder = "";
}

function handleGuessInputChange() {
  setInputError(playerGuessInput, guessError, false);
}

function handleNameInputKeydown(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  handleHostClick();
}

function handleJoinCodeInputKeydown(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  handleConnectJoin();
}

function handleGuessInputKeydown(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  handleSendGuessClick();
}

function getValidatedPlayerName() {
  const formatted = formatPlayerName(nameInput.value);

  if (formatted === "") {
    nameError.textContent = "Please enter a name";
    setInputError(nameInput, nameError, true);
    return null;
  }

  setInputError(nameInput, nameError, false);
  nameInput.value = formatted;
  return formatted;
}

function getValidatedJoinCode() {
  const code = joinCodeInput.value.trim().toUpperCase();

  if (!/^[A-Z0-9]{4,16}$/.test(code)) {
    joinCodeError.textContent = "Please enter a valid host ID";
    setInputError(joinCodeInput, joinCodeError, true);
    return null;
  }

  setInputError(joinCodeInput, joinCodeError, false);
  joinCodeInput.value = code;
  return code;
}

function getValidatedGuessValue() {
  const rawValue = playerGuessInput.value.trim();
  if (!rawValue) {
    showGuessError("Use pounds and pence, e.g. 23.12");
    return null;
  }

  if (!/^\d+(\.\d{2})$/.test(rawValue)) {
    showGuessError("Use pounds and pence, e.g. 23.12");
    return null;
  }

  const guessValue = Number(rawValue);
  if (!Number.isFinite(guessValue) || guessValue < 0 || guessValue > 999999) {
    showGuessError("Please enter a valid price");
    return null;
  }

  setInputError(playerGuessInput, guessError, false);
  return guessValue;
}

function showGuessError(message) {
  guessError.textContent = message;
  setInputError(playerGuessInput, guessError, true);
}

function setInputError(input, errorElement, isVisible) {
  errorElement.classList.toggle("visible", isVisible);
  input.classList.toggle("input-invalid", isVisible);
  input.setAttribute("aria-invalid", String(isVisible));
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
  const card = document.querySelector(".card");
  card?.classList.toggle("is-game-screen", screenId === "screen-game");
  card?.classList.toggle(
    "is-lobby-screen",
    screenId === "screen-lobby-host" || screenId === "screen-lobby-player",
  );

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
  // Move to host settings first to choose round time and product count
  const name = getValidatedPlayerName();
  if (!name) return;

  gameState.playerName = name;
  gameState.isHost = true;
  showScreen("screen-host-settings");
}

function handleJoinClick() {
  // Move to join screen first to enter host code before connecting
  const name = getValidatedPlayerName();
  if (!name) return;

  gameState.playerName = name;
  gameState.isHost = false;
  showScreen("screen-join-as-player");
}

async function handleGenerateRoom() {
  // This is the "Start Hosting" button in the host settings screen
  gameState.roundTime = parseInt(roundTimeSelect.value, 10);
  gameState.productCount = parseInt(productCountSelect.value, 10);

  setBusyButton(generateBtn, true, "Creating room...");
  try {
    setInputError(roundTimeSelect, hostError, false);
    await startHostLobby();
  } catch (error) {
    console.error(error);
    hostError.textContent = "Could not create a room. Please try again.";
    setInputError(roundTimeSelect, hostError, true);
  } finally {
    setBusyButton(generateBtn, false);
  }
}

async function handleConnectJoin() {
  // This is the "Connect" button in the join screen after entering the host code
  const hostCode = getValidatedJoinCode();
  if (!hostCode) return;

  setBusyButton(connectJoinBtn, true, "Connecting...");
  try {
    await connectToHostLobby(hostCode);
  } catch (error) {
    console.error(error);
    joinCodeError.textContent = "Could not connect to that host ID";
    setInputError(joinCodeInput, joinCodeError, true);
  } finally {
    setBusyButton(connectJoinBtn, false);
  }
}

function handleBackToStart() {
  // For both host and join flows, the back button just returns to the start screen
  disconnectFromCurrentSession();
  showScreen("screen-start");
}

async function handleStartGameClick() {
  // Only the host can see this button, and it starts the game for everyone
  const startGameBtn = document.getElementById("btn-start-game");
  setBusyButton(startGameBtn, true, "Starting...");

  try {
    await startGameAsHost();
  } catch (error) {
    console.error(error);
    setBusyButton(startGameBtn, false);
  }
}

async function startGameAsHost() {
  await ensureProductsLoaded();

  const totalRounds = Math.min(
    // Ensure we have enough products for the selected product count and number of rounds
    gameState.productCount,
    gameState.productsCatalog.length,
  );
  if (totalRounds === 0) {
    return;
  }

  gameState.roundProducts = pickRandomProductsForGame(totalRounds); // Select products for this game session
  gameState.totalRounds = totalRounds;
  gameState.gameStarted = true;

  const payload = {
    // The host sends this payload to all players to start the game with the same settings and products
    roundTime: gameState.roundTime,
    totalRounds,
    roundProducts: gameState.roundProducts,
    players: gameState.players,
  };

  applyStartGamePayload(payload);
  broadcastToPlayers({ type: "startGame", payload });
}

function handleSendGuessClick() {
  // When a player submits their guess, we validate it and then either register it directly (if host) or send it to the host for registration
  if (playerGuessInput.disabled) return;

  const guessValue = getValidatedGuessValue();
  if (guessValue === null) return;

  lockGuessUI();

  if (gameState.isHost) {
    // If this player is the host, we can register their guess directly without sending it over the network
    const isNewGuess = registerGuessForPeer(networkState.myPeerId, guessValue);
    if (isNewGuess) {
      broadcastGuessCounter();
      finishRoundIfEveryoneGuessed();
    }
    return;
  }

  if (networkState.connectedToHost && networkState.connectedToHost.open) {
    //If this player is a guest, we need to send their guess to the host so it can be registered and included in the round results calculations
    networkState.connectedToHost.send({
      type: "submitGuess",
      payload: {
        value: guessValue,
      },
    });
    return;
  }

  showGuessError("Connection lost. Please rejoin the game.");
  setGuessControlsEnabled(false);
}

/////////////////////////////////////////////////////
// SECTION 8: AUDIO HELPERS
/////////////////////////////////////////////////////

function handleGlobalButtonClick(event) {
  // The click handler is attached to the whole document, so we need to
  // make sure the thing that got clicked was actually a button
  var button = event.target.closest("button");
  if (!button) {
    return;
  }

  // Don't play a sound if the button is disabled.
  if (button.disabled) {
    return;
  }

  playButtonClickSound();
}

function playButtonClickSound() {
  // We make a new Audio object each time I want to play the sound because if I reuse the same one, it won't play again until the first sound has finished playing
  const sound = new Audio("images/buttonClick.mp3");
  sound.play().catch(() => {});
}

function playSuccessSound() {
  const sound = new Audio("images/success.mp3");
  sound.play().catch(() => {});
}

/////////////////////////////////////////////////////
// SECTION 9: LOBBY RENDERING
/////////////////////////////////////////////////////

function renderLobbyPlayerLists() {
  // Both host and player lobbies use the same player list rendering, just in different containers
  renderPlayers("players-container");
  renderPlayers("players-container-player");
}

function renderPlayers(containerId) {
  // This renders the list of players in the lobby, showing their avatar, name, title, and points
  const container = document.getElementById(containerId);
  if (!container) return;

  container.replaceChildren();

  gameState.players.forEach((player) => {
    // For each player in the game state, we create a card element and append it to the container
    container.appendChild(createPlayerCard(player, "player"));
  });
}

function createPlayerCard(player, variant) {
  const card = document.createElement("div");
  card.className = variant === "results" ? "results-player-card" : "player-card";

  const avatar = document.createElement("img");
  avatar.className =
    variant === "results" ? "results-player-avatar" : "player-avatar";
  avatar.src = getSafeAssetPath(player.avatar, "images/profile/1.jpg");
  avatar.alt = player.name || "Player";

  const info = document.createElement("div");
  info.className = variant === "results" ? "" : "player-info";

  const name = document.createElement("div");
  name.className = variant === "results" ? "results-player-name" : "player-name";
  name.textContent = player.name || "Player";

  const title = document.createElement("div");
  title.className =
    variant === "results" ? "results-player-title" : "player-title";
  title.textContent = player.title || "";

  const points = document.createElement("div");
  points.className =
    variant === "results" ? "results-player-points" : "player-points";
  points.textContent = `${Number(player.points) || 0} points`;

  info.append(name, title, points);
  card.append(avatar, info);
  return card;
}

function getSafeAssetPath(path, fallback) {
  if (typeof path !== "string") return fallback;
  if (/^images\/[a-z0-9/_-]+\.(jpg|jpeg|png|gif|webp|mp3)$/i.test(path)) {
    return path;
  }

  return fallback;
}

/////////////////////////////////////////////////////
// SECTION 10: PRODUCTS AND ROUND SETUP
/////////////////////////////////////////////////////

async function ensureProductsLoaded() {
  // We only load the products once, when the host starts the first game. After that, the selected products for the game session are stored in gameState.roundProducts, so we don't need to load or pick products again for subsequent rounds in the same session
  if (gameState.productsCatalog.length > 0) return;

  const response = await fetch("products.json");
  if (!response.ok) {
    throw new Error("Could not load products.json");
  }

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
  // When the host starts the game, they send a payload to all players with the game settings and selected products
  gameState.roundTime = payload.roundTime;
  gameState.totalRounds = payload.totalRounds;
  gameState.roundProducts = payload.roundProducts || [];

  if (payload.players) {
    gameState.players = payload.players;
  }

  startRoundAtIndex(0);
}

function startRoundAtIndex(roundIndex) {
  // This sets up the game state and UI for the start of a round, based on the selected products and settings
  gameState.currentRoundIndex = roundIndex;
  gameState.roundFinished = false;
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
  // This updates the product image, title, and description in the UI for the current round's product
  const product = gameState.roundProducts[gameState.currentRoundIndex];
  if (!product) return;

  gameProductImage.src = getSafeAssetPath(product.image, "");
  gameProductImage.alt = product.name || "Product image";
  gameProductTitle.textContent = product.name || "{Product-name}";
  gameProductDescription.textContent =
    product.description || "{product-description}";
}

function setRoundCounter() {
  // This updates the round counter text in the UI to show the current round number and total rounds (e.g. "Round 2/5")
  roundCounterValue.textContent = `${gameState.currentRoundIndex + 1}/${gameState.totalRounds}`;
}

function updateGuessCounterText() {
  // This updates the text in the UI that shows how many players have submitted their guesses out of the total number of players (i.e. "3 out of 5 players have sent their guesses")
  guessesCounterText.textContent = `${gameState.guessedPeerIds.length} out of ${gameState.players.length} players have sent their guesses`;
}

/////////////////////////////////////////////////////
// SECTION 11: GUESS INPUT UI CONTROL
/////////////////////////////////////////////////////

function setGuessControlsEnabled(isEnabled) {
  // This enables or disables the guess input and send button, which is used to prevent players from changing their guess after they've submitted it
  playerGuessInput.disabled = !isEnabled;
  sendGuessBtn.disabled = !isEnabled;
}

function resetGuessUI() {
  // This resets the guess input UI to its default state at the start of each round, clearing any previous input and hiding the "guess locked" text
  playerGuessInput.value = "";
  playerGuessInput.placeholder = "45.37";
  sendGuessBtn.textContent = "Send your guess";
  guessLockedText.style.display = "none";
  setInputError(playerGuessInput, guessError, false);
  setGuessControlsEnabled(true);
}

function lockGuessUI() {
  // This locks the guess input UI after a player submits their guess, preventing them from changing it and showing the "guess locked" text
  sendGuessBtn.textContent = "Guess sent";
  guessLockedText.style.display = "block";
  setGuessControlsEnabled(false);
}

/////////////////////////////////////////////////////
// SECTION 12: TIMERS AND ROUND END
/////////////////////////////////////////////////////

function clearRunningTimers() {
  // This is used to clear any existing timers when a round ends or when a player leaves
  if (gameState.roundTimerId) {
    clearInterval(gameState.roundTimerId);
    gameState.roundTimerId = null;
  }
}

function startRoundTimer(seconds) {
  // This starts the countdown timer for a round
  clearRunningTimers();

  let remainingSeconds = Number(seconds); // Number constructor... new thing https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/Number
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
  // This registers a player's guess in the game state ensuring that each player can only submit one guess per round
  if (!peerId || gameState.guessedPeerIds.includes(peerId)) return false;

  gameState.guessedPeerIds.push(peerId);
  gameState.guessesByPeer[peerId] = Number(value);
  updateGuessCounterText();
  return true;
}

function haveAllActivePlayersGuessed() {
  return (
    gameState.players.length > 0 &&
    gameState.guessedPeerIds.length >= gameState.players.length
  );
}

function finishRoundIfEveryoneGuessed() {
  if (gameState.isHost && haveAllActivePlayersGuessed()) {
    finishRoundAsHost();
  }
}

function finishRoundAsHost() {
  // When the round timer runs out, the host is responsible for calculating the round results, awarding points, and then automatically moving to the next round after a short delay
  if (gameState.roundFinished) return;

  const currentProduct = gameState.roundProducts[gameState.currentRoundIndex];
  if (!currentProduct) return;

  gameState.roundFinished = true;
  clearRunningTimers();
  setGuessControlsEnabled(false);

  const actualPrice = Number(currentProduct.price); // The actual price of the product for the current round used to calculate which player's guess was closest
  const winnerIds = getRoundWinnerIds(actualPrice); // This calculates the winner(s) of the round based on whose player's guess was closest to the actual price

  awardRoundPoints(winnerIds); // This awards points to the winners of the round. In this implementation, each winner gets 100 points

  const summaryText = buildRoundSummaryText(winnerIds, actualPrice); // This builds the summary text that is shown in the round results overlay, summarising who won the round and what the actual price was
  const roundPlacements = getTopRoundPlacements(actualPrice);
  showResultsOverlay(summaryText, winnerIds, {
    canContinue: true,
    roundPlacements,
  });

  broadcastToPlayers({
    // The host sends the round results to all players so they can see the summary and updated points
    type: "roundResult",
    payload: {
      summaryText,
      winnerIds,
      players: gameState.players,
      roundPlacements,
    },
  });

}

function continueAfterRoundAsHost() {
  if (!gameState.isHost || !gameState.roundFinished) return;

  const isLastRound = gameState.currentRoundIndex >= gameState.totalRounds - 1;
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
}

function awardRoundPoints(winnerIds) {
  winnerIds.forEach((peerId) => {
    const player = getPlayerById(peerId);
    if (!player) return;
    player.points = (player.points || 0) + 100;
  });
}

function finishGameAsHost() {
  // When the last round finishes, the host calculates the overall game results and shows the final summary and winner(s) in the results overlay
  const winnerIds = getOverallWinnerIds();
  const summaryText = buildGameSummaryText(winnerIds);

  showResultsOverlay(summaryText, winnerIds, { celebrate: true, gameOver: true });

  broadcastToPlayers({
    type: "gameOver",
    payload: {
      summaryText,
      winnerIds,
      players: gameState.players,
    },
  });
}

function finishGameLocally() {
  disconnectFromCurrentSession();
  showScreen("screen-start");
}

/////////////////////////////////////////////////////
// SECTION 13: ROUND RESULT CALCULATIONS
/////////////////////////////////////////////////////

function getRoundWinnerIds(actualPrice) {
  // This calculates the winner(s) of the round based on whose player's guess was closest to the actual price
  const entries = Object.entries(gameState.guessesByPeer);
  if (entries.length === 0) return [];

  let closestDiff = Number.POSITIVE_INFINITY; // "For now, the difference is infinitely large. I haven't found anything closer yet."

  entries.forEach(([, guess]) => {
    // "For each guess, I check how close it is to the actual price. If it's closer than anything I've seen before, I update my closest difference."
    const diff = Math.abs(Number(guess) - actualPrice);
    if (diff < closestDiff) {
      closestDiff = diff;
    }
  });

  return entries
    .filter(
      // "Then, I go through all the guesses again and find all the ones that are exactly as close as the closest difference I found. Those are the winners"
      ([, guess]) => Math.abs(Number(guess) - actualPrice) === closestDiff,
    )
    .map(([peerId]) => peerId); // "Finally, I return the peer IDs of the winners so I can award them points and show their names in the round results summary"
}

function getTopRoundPlacements(actualPrice) {
  return Object.entries(gameState.guessesByPeer)
    .map(([peerId, guess]) => {
      const player = getPlayerById(peerId);
      const numericGuess = Number(guess);

      return {
        peerId,
        name: player?.name || "Player",
        avatar: player?.avatar || "images/profile/1.jpg",
        title: player?.title || "",
        points: player?.points || 0,
        guess: numericGuess,
        difference: Math.abs(numericGuess - actualPrice),
      };
    })
    .sort((a, b) => a.difference - b.difference || a.guess - b.guess)
    .slice(0, 5);
}

function getOverallWinnerIds() {
  // This calculates the overall winner(s) of the game based on who has the most points after all rounds are finished
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
  // This is a helper function to get a player's information (like their name) based on their peer id
  return gameState.players.find((player) => player.peerId === peerId);
}

function formatPrice(value) {
  // This formats a number to always show TWO DECIMAL PLACES which is used for displaying prices in the round results summary
  return Number(value).toFixed(2);
}

function buildRoundSummaryText(winnerIds, actualPrice) {
  if (winnerIds.length === 0) {
    return `No one guessed this round. The real price was £${formatPrice(actualPrice)}.`;
  }

  const winnerNames = winnerIds // This builds a string of the winner(s) names to show in the round results summary. Accounts for 2 winners witht he "and"
    .map((peerId) => getPlayerById(peerId)?.name || "Player")
    .join(", ");

  if (winnerIds.length === 1) {
    const guess = gameState.guessesByPeer[winnerIds[0]];
    return `${winnerNames} guessed £${formatPrice(guess)} and the real price was £${formatPrice(actualPrice)}.`;
  }

  return `${winnerNames} tied with the closest guesses. The real price was £${formatPrice(actualPrice)}.`;
}

function buildGameSummaryText(winnerIds) {
  // This builds the summary text for the end of the game, showing who won overall and with how many points. Accounts for ties and the case where no one wins (e.g. if no one guessed in the last round and everyone has 0 points)
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
  // This shows the round results overlay with the summary text and highlights the winner(s). If options.celebrate is true, it also starts the confetti animation and plays a sound effect
  resultsSummaryText.textContent = summaryText;
  if (options.gameOver) {
    renderFinalLeaderboard(winnerIds);
  } else if (options.roundPlacements) {
    renderRoundPlacements(options.roundPlacements, winnerIds);
  } else {
    renderResultsPlayers(winnerIds);
  }
  renderResultsActions(options);
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
  renderResultsActions({});
  stopWinnerConfetti();
}

function renderResultsPlayers(winnerIds) {
  // This renders the list of players in the round results overlay, highlighting the winner(s) and showing their guesses and points
  resultsPlayersGrid.replaceChildren();
  resultsPlayersGrid.className = "results-players-grid";

  gameState.players.forEach((player) => {
    const card = createPlayerCard(player, "results");

    if (winnerIds.includes(player.peerId)) {
      card.classList.add("winner");
    }

    resultsPlayersGrid.appendChild(card);
  });
}

function renderFinalLeaderboard(winnerIds) {
  resultsPlayersGrid.replaceChildren();
  resultsPlayersGrid.className = "results-players-grid final-leaderboard";

  const rankedPlayers = [...gameState.players].sort(
    (a, b) => (b.points || 0) - (a.points || 0) || a.name.localeCompare(b.name),
  );

  rankedPlayers.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "leaderboard-row";

    if (winnerIds.includes(player.peerId)) {
      row.classList.add("winner");
    }

    const rank = document.createElement("div");
    rank.className = "leaderboard-rank";
    rank.textContent = String(index + 1);

    const card = createPlayerCard(player, "results");

    row.append(rank, card);
    resultsPlayersGrid.appendChild(row);
  });
}

function renderRoundPlacements(roundPlacements, winnerIds) {
  resultsPlayersGrid.replaceChildren();
  resultsPlayersGrid.className = "results-players-grid round-ranking-grid";

  if (roundPlacements.length === 0) {
    const emptyText = document.createElement("p");
    emptyText.className = "results-empty-text";
    emptyText.textContent = "No guesses were sent this round.";
    resultsPlayersGrid.appendChild(emptyText);
    return;
  }

  const [closestPlayer, ...otherPlayers] = roundPlacements;
  const topRow = document.createElement("div");
  topRow.className = "results-top-row";
  topRow.appendChild(createRoundPlacementCard(closestPlayer, winnerIds, true));

  const nextRow = document.createElement("div");
  nextRow.className = "results-next-row";
  otherPlayers.forEach((placement) => {
    nextRow.appendChild(createRoundPlacementCard(placement, winnerIds, false));
  });

  resultsPlayersGrid.append(topRow, nextRow);
}

function createRoundPlacementCard(placement, winnerIds, isFeatured) {
  const card = createPlayerCard(placement, "results");
  card.classList.add("round-placement-card");

  if (isFeatured) {
    card.classList.add("featured");
  }

  if (winnerIds.includes(placement.peerId)) {
    card.classList.add("winner");
  }

  const guessText = document.createElement("div");
  guessText.className = "results-player-guess";
  guessText.textContent = `Guessed £${formatPrice(placement.guess)}`;
  card.querySelector("div")?.appendChild(guessText);

  const differenceText = document.createElement("div");
  differenceText.className = "results-player-distance";
  differenceText.textContent = `£${formatPrice(placement.difference)} away`;
  card.querySelector("div")?.appendChild(differenceText);

  return card;
}

function renderResultsActions(options = {}) {
  resultsActions.replaceChildren();
  resultsActions.classList.add("hidden");

  if (options.canContinue && gameState.isHost) {
    const button = document.createElement("button");
    button.className = "btn";
    button.type = "button";
    button.textContent = "Continue";
    button.addEventListener("click", continueAfterRoundAsHost);
    resultsActions.appendChild(button);
    resultsActions.classList.remove("hidden");
    return;
  }

  if (!options.gameOver) return;

  const backButton = document.createElement("button");
  backButton.className = "btn";
  backButton.type = "button";
  backButton.textContent = "Back to start";
  backButton.addEventListener("click", finishGameLocally);
  resultsActions.appendChild(backButton);
  resultsActions.classList.remove("hidden");
}

//This not mine though... I found this confetti code on CodePen, like i said before
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

  if (
    !ctx ||
    !roundResultsOverlay ||
    roundResultsOverlay.classList.contains("hidden")
  ) {
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
    ctx.fillRect(
      -particle.size / 2,
      -particle.size / 2,
      particle.size,
      particle.size * 0.65,
    );
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
  confettiState.burstTimeoutId = setTimeout(spawnConfettiBurst, 180);

  if (!confettiState.animationId) {
    confettiState.animationId = requestAnimationFrame(drawAndUpdateConfetti);
  }

  confettiState.stopTimeoutId = setTimeout(() => {
    stopWinnerConfetti();
  }, 3600);
}

function stopWinnerConfetti() {
  if (confettiState.burstTimeoutId) {
    clearTimeout(confettiState.burstTimeoutId);
    confettiState.burstTimeoutId = null;
  }

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
    ctx.clearRect(
      0,
      0,
      roundResultsOverlay.clientWidth,
      roundResultsOverlay.clientHeight,
    );
  }
}

/////////////////////////////////////////////////////
// SECTION 15: PEER CONNECTION CORE
/////////////////////////////////////////////////////

function createShortJoinCode() {
  if (!window.crypto?.getRandomValues) {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  const randomValues = new Uint32Array(2);
  window.crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((value) => value.toString(36).toUpperCase().padStart(7, "0"))
    .join("")
    .slice(0, 8);
}

function createPeerConnection(customPeerId, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const peer = new window.Peer(customPeerId, { debug: 1 });
    let isSettled = false;

    const timeoutId = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      peer.destroy();
      reject(new Error("Peer connection timed out"));
    }, timeoutMs);

    peer.on("open", (id) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeoutId);
      networkState.peer = peer;
      networkState.myPeerId = id;
      resolve(peer);
    });

    peer.on("error", (error) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

function waitForConnectionOpen(connection, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let isSettled = false;

    const timeoutId = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      reject(new Error("Connection timed out"));
    }, timeoutMs);

    connection.on("open", () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeoutId);
      resolve();
    });

    connection.on("error", (error) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeoutId);
      reject(error);
    });

    connection.on("close", () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeoutId);
      reject(new Error("Connection closed"));
    });
  });
}

/////////////////////////////////////////////////////
// SECTION 16: HOST FLOW
/////////////////////////////////////////////////////

async function startHostLobby() {
  // When the host clicks the "Start Hosting" button, we create a new peer connection with a generated join code as the peer ID, set up the host game state, and listen for incoming connections from players who want to join the lobby
  const peer = await createHostPeerWithRetry();
  const hostId = networkState.myPeerId;

  gameState.gameCode = hostId;

  const hostPlayer = createPlayer({
    // We also create a player object for the host themselves so that they are included in the lobby player list and can participate in the game like everyone else
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

async function createHostPeerWithRetry(maxAttempts = 3) {
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await createPeerConnection(createShortJoinCode());
    } catch (error) {
      lastError = error;
      if (networkState.peer) {
        networkState.peer.destroy();
      }
    }
  }

  throw lastError || new Error("Could not create host room");
}

function setupHostConnection(connection) {
  networkState.hostConnections[connection.peer] = connection;

  connection.on("data", (data) => {
    handleMessageForHost(connection.peer, data);
  });

  connection.on("close", () => {
    delete networkState.hostConnections[connection.peer];
    removePlayerById(connection.peer);
    removeGuessByPeerId(connection.peer);

    if (!gameState.gameStarted) {
      broadcastLobbyState();
      renderLobbyPlayerLists();
    } else {
      updateGuessCounterText();
      broadcastGuessCounter();
      finishRoundIfEveryoneGuessed();
    }
  });
}

function handleMessageForHost(peerId, data) {
  // This handles incoming messages from players in the lobby, such as when they join the lobby or submit their guesses during the game. The host needs to process these messages to update the game state and broadcast relevant updates to all players
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
    // When the host receives a guess submission from a player, they need to register that guess in the game state and then broadcast an update to all players so that the guess counter can be updated in everyone's UI
    const isNewGuess = registerGuessForPeer(peerId, data.payload.value);

    if (isNewGuess) {
      broadcastGuessCounter();
      finishRoundIfEveryoneGuessed();
    }
  }
}

function broadcastLobbyState() {
  // This broadcasts the current lobby state (host code and list of players) to all connected players in the lobby, which is used to keep everyone's lobby UI in sync when players join or leave before the game starts
  broadcastToPlayers({
    type: "lobbyState",
    payload: {
      hostCode: gameState.gameCode,
      players: gameState.players,
    },
  });
}

function broadcastGuessCounter() {
  // This broadcasts an update to all players with the current list of which players have submitted their guesses

  broadcastToPlayers({
    type: "guessCounter",
    payload: {
      guessedPeerIds: gameState.guessedPeerIds,
      players: gameState.players,
    },
  });
}

function broadcastToPlayers(message) {
  // This is a helper function to send a message to all connected players in the lobby. The host uses this to broadcast updates like the lobby state, when the game starts, round results, etc.
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

  await waitForConnectionOpen(connection);
  connection.send({
    type: "joinLobby",
    payload: { player: selfPlayer },
  });

  connection.on("close", () => {
    // If the connection to the host is closed (e.g. if the host leaves), we reset the game state and return to the start screen
    if (networkState.isDisconnecting) return;

    clearRunningTimers();
    resetSessionState({ keepName: true });
    showScreen("screen-start");
    nameError.textContent = "Host disconnected. Please join again.";
    setInputError(nameInput, nameError, true);
  });

  connection.on("data", (data) => {
    handleMessageForPlayer(data);
  });

  showScreen("screen-lobby-player");
  gameState.players = [selfPlayer];
  renderLobbyPlayerLists();
}

function handleMessageForPlayer(data) {
  // This handles incoming messages from the host in the lobby, such as when the lobby state updates or the game starts
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
    gameState.players = data.payload.players || gameState.players;
    updateGuessCounterText();
    return;
  }

  if (data.type === "roundResult") {
    clearRunningTimers();
    gameState.roundFinished = true;
    gameState.players = data.payload.players || gameState.players;
    setGuessControlsEnabled(false);
    showResultsOverlay(data.payload.summaryText, data.payload.winnerIds || [], {
      roundPlacements: data.payload.roundPlacements || [],
    });
    return;
  }

  if (data.type === "gameOver") {
    clearRunningTimers();
    gameState.roundFinished = true;
    gameState.players = data.payload.players || gameState.players;
    setGuessControlsEnabled(false);
    showResultsOverlay(data.payload.summaryText, data.payload.winnerIds || [], {
      celebrate: true,
      gameOver: true,
    });
  }
}

/////////////////////////////////////////////////////
// SECTION 18: PLAYER OBJECT UTILITIES
/////////////////////////////////////////////////////

function createPlayer({ peerId, name, avatar, title, points }) {
  return {
    peerId,
    name: formatPlayerName(name || "Player"),
    avatar: getPlayerAvatar(avatar),
    title: typeof title === "string" ? title.slice(0, 40) : getRandomTitle(),
    points: Number.isFinite(points) ? points : 0,
  };
}

function getPlayerAvatar(avatar) {
  if (typeof avatar === "string") {
    return getSafeAssetPath(avatar, "images/profile/1.jpg");
  }

  return getRandomAvatar();
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

function removeGuessByPeerId(peerId) {
  gameState.guessedPeerIds = gameState.guessedPeerIds.filter(
    (id) => id !== peerId,
  );
  delete gameState.guessesByPeer[peerId];
}

function disconnectFromCurrentSession() {
  clearRunningTimers();
  hideResultsOverlay();
  networkState.isDisconnecting = true;

  Object.values(networkState.hostConnections).forEach((connection) => {
    if (connection?.open) connection.close();
  });

  if (networkState.connectedToHost?.open) {
    networkState.connectedToHost.close();
  }

  if (networkState.peer && !networkState.peer.destroyed) {
    networkState.peer.destroy();
  }

  resetSessionState({ keepName: true });
}

function resetSessionState(options = {}) {
  const playerName = options.keepName ? gameState.playerName : "";

  Object.assign(gameState, {
    playerName,
    isHost: false,
    roundTime: 30,
    productCount: 5,
    gameCode: "",
    gameStarted: false,
    players: [],
    usedAvatars: [],
    usedTitles: [],
    roundProducts: [],
    totalRounds: 0,
    currentRoundIndex: 0,
    roundFinished: false,
    guessedPeerIds: [],
    guessesByPeer: {},
    roundTimerId: null,
  });

  Object.assign(networkState, {
    peer: null,
    myPeerId: "",
    hostConnections: {},
    connectedToHost: null,
    isDisconnecting: false,
  });
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
  try {
    const response = await fetch("titles.json");
    if (!response.ok) return;

    const data = await response.json();
    if (Array.isArray(data.titles) && data.titles.length > 0) {
      titles = data.titles;
    }
  } catch (error) {
    console.warn("Could not load titles.json", error);
  }
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

async function handleCopyClick() {
  const hostCodeInput = document.getElementById("host-code");
  if (!hostCodeInput) return;

  try {
    await navigator.clipboard.writeText(hostCodeInput.value);
    const copyBtn = document.getElementById("copy-code");
    const copyFeedback = document.getElementById("copy-feedback");
    if (!copyBtn) return;

    copyBtn.setAttribute("aria-label", "Copied host ID");
    copyBtn.title = "Copied";
    copyBtn.classList.add("copied");
    copyFeedback?.classList.add("visible");

    setTimeout(() => {
      copyBtn.setAttribute("aria-label", "Copy host ID");
      copyBtn.title = "Copy host ID";
      copyBtn.classList.remove("copied");
      copyFeedback?.classList.remove("visible");
    }, 1200);
  } catch (error) {
    console.error(error);
    hostCodeInput.select();
  }
}

/////////////////////////////////////////////////////
// SECTION 21: CONSOLE PREVIEW HELPERS
/////////////////////////////////////////////////////

const previewNames = [
  "Nelly",
  "Penny",
  "Maya",
  "Theo",
  "Luna",
  "Sam",
  "Rosa",
  "Kit",
  "Ava",
  "Milo",
  "Zoe",
  "Jules",
  "Nina",
  "Omar",
  "Iris",
  "Leo",
  "Ruby",
  "Finn",
  "Tara",
  "Noah",
];

function createPreviewPlayers(count) {
  gameState.usedAvatars = [];
  gameState.usedTitles = [];

  return Array.from({ length: count }, (_, index) =>
    createPlayer({
      peerId: `preview-player-${index + 1}`,
      name: previewNames[index] || `Player ${index + 1}`,
      points: Math.floor(Math.random() * 8) * 100,
    }),
  );
}

function showPreviewHostLobby(count = 20) {
  disconnectFromCurrentSession();
  gameState.isHost = true;
  gameState.playerName = "Nelly";
  gameState.gameCode = createShortJoinCode();
  gameState.players = createPreviewPlayers(count);
  showScreen("screen-lobby-host");
  renderLobbyPlayerLists();
}

function showPreviewRoundResults(count = 10, options = {}) {
  disconnectFromCurrentSession();
  gameState.isHost = options.isHost !== false;
  gameState.playerName = "Nelly";
  gameState.players = createPreviewPlayers(count);
  gameState.totalRounds = 5;
  gameState.currentRoundIndex = 0;
  gameState.roundFinished = true;
  gameState.guessedPeerIds = [];
  gameState.guessesByPeer = {};
  showScreen("screen-game");
  setRoundCounter();
  secondsCounterValue.textContent = "0";
  updateGuessCounterText();
  setGuessControlsEnabled(false);

  const actualPrice = 15.89;
  const previewGuesses = [15.75, 16.1, 14.95, 17.25, 13.9];

  gameState.players.forEach((player, index) => {
    const guess =
      previewGuesses[index] ||
      Math.max(0.5, actualPrice + (Math.random() * 80 - 40));
    gameState.guessedPeerIds.push(player.peerId);
    gameState.guessesByPeer[player.peerId] = Number(guess.toFixed(2));
  });

  const winnerIds = getRoundWinnerIds(actualPrice);
  const roundPlacements = getTopRoundPlacements(actualPrice);
  const summaryText = buildRoundSummaryText(winnerIds, actualPrice);

  showResultsOverlay(summaryText, winnerIds, {
    canContinue: gameState.isHost,
    roundPlacements,
  });
}

function showPreviewRoundResultsAsGuest(count = 10) {
  showPreviewRoundResults(count, { isHost: false });
}

function showPreviewGameOver(count = 10) {
  disconnectFromCurrentSession();
  gameState.isHost = true;
  gameState.playerName = "Nelly";
  gameState.players = createPreviewPlayers(count).map((player, index) => ({
    ...player,
    points: Math.max(0, (count - index) * 100),
  }));
  gameState.totalRounds = 5;
  gameState.currentRoundIndex = 4;
  showScreen("screen-game");
  setRoundCounter();
  secondsCounterValue.textContent = "0";
  updateGuessCounterText();
  setGuessControlsEnabled(false);

  const winnerIds = getOverallWinnerIds();
  showResultsOverlay(buildGameSummaryText(winnerIds), winnerIds, {
    celebrate: true,
    gameOver: true,
  });
}

window.HowMuchDev = {
  showHostLobby: showPreviewHostLobby,
  showRoundResults: showPreviewRoundResults,
  showRoundResultsAsGuest: showPreviewRoundResultsAsGuest,
  showGameOver: showPreviewGameOver,
  reset: () => {
    disconnectFromCurrentSession();
    showScreen("screen-start");
  },
};

/////////////////////////////////////////////////////
// SECTION 22: STARTUP
/////////////////////////////////////////////////////

loadTitles();
setHeaderIntro();
