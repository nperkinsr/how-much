/*  Plain JS implementation using PeerJS for realtime.
    Features:
    - Player sign-up
    - One host can create a game and invite others via host ID
    - Host manages product list (loaded from JSON) and starts rounds
    - Players send guesses; guesses are broadcast to host and all players
    - Host reveals price and awards a star to closest guess
    - Scores (stars) tracked and synced across peers
*/

fetch("products.json")
  .then((res) => res.json())
  .then((data) => {
    products = data;
    updateProductsUI();
  });

// UI refs
const $ = (id) => document.getElementById(id);
const signup = $("signup"),
  hostSection = $("host"),
  playerSection = $("player");
const playerNameInput = $("playerName");
const btnJoinHost = $("btnJoinHost"),
  btnJoinPlayer = $("btnJoinPlayer"),
  btnConnectToHost = $("btnConnectToHost");
const joinArea = $("joinArea"),
  hostIdInput = $("hostIdInput"),
  hostIdField = $("hostId"),
  btnCopyHostId = $("btnCopyHostId");
const playersList = $("playersList"),
  productsList = $("productsList");
const btnStartRound = $("btnStartRound"),
  btnRevealPrice = $("btnRevealPrice");
const currentProduct = $("currentProduct"),
  productImg = $("productImg"),
  productTitleView = $("productTitleView"),
  productDescView = $("productDescView");
// host-specific product view (optional elements)
const hostCurrentProduct = $("hostCurrentProduct"),
  productImgHost = $("productImgHost"),
  productTitleHost = $("productTitleHost"),
  productDescHost = $("productDescHost"),
  guessesUlHost = $("guessesUlHost"),
  hostRoundResult = $("hostRoundResult"),
  actualPriceHost = $("actualPriceHost"),
  winnerMsgHost = $("winnerMsgHost");
const guessInput = $("guessInput"),
  btnSendGuess = $("btnSendGuess"),
  guessesUl = $("guessesUl");
// host guess input/button
const guessInputHost = $("guessInputHost"),
  btnSendGuessHost = $("btnSendGuessHost");
// reveal price text elements (player and host views)
const revealPriceText = $("revealPriceText"),
  revealedPrice = $("revealedPrice");
const hostRevealPriceText = $("hostRevealPriceText"),
  revealedPriceHost = $("revealedPriceHost");
const guessesList = $("guessesList"),
  roundResult = $("roundResult"),
  actualPrice = $("actualPrice"),
  winnerMsg = $("winnerMsg");
const scoresList = $("scoresList"),
  status = $("status");

// Game state
let isHost = false;
let peer,
  connToHost = null;
let connMap = {};
let myId = null;
let myName = null;
let players = {};
let products = [];
let current = null;
let guesses = {};
let guessesRevealed = false;

// Helpers
function setStatus(text) {
  status.textContent = text;
}
function showSection(section) {
  signup.classList.add("hidden");
  hostSection.classList.add("hidden");
  playerSection.classList.add("hidden");
  section.classList.remove("hidden");
}
function saveLocal() {
  localStorage.setItem("pg_products", JSON.stringify(products));
  localStorage.setItem("pg_players", JSON.stringify(players));
}
function loadLocal() {
  try {
    const p = JSON.parse(localStorage.getItem("pg_products") || "[]");
    products = p;
    const pls = JSON.parse(localStorage.getItem("pg_players") || "{}");
    players = pls;
  } catch (e) {}
}

// Peer messages util
function broadcastFromHost(msg) {
  Object.values(connMap).forEach((c) => {
    if (c.open) c.send(msg);
  });
}

// Basic message types: join, state, startRound, guess, revealPrice, awardStar, syncScore
function handleMessageFromPeer(peerId, data) {
  if (!data || typeof data !== "object") return;
  const { type, payload } = data;
  if (type === "join" && isHost) {
    players[peerId] = { name: payload.name, stars: 0 };
    updatePlayersUI();
    const state = { players, products, current };
    connMap[peerId].send({ type: "state", payload: state });
    broadcastFromHost({
      type: "newPlayer",
      payload: { peerId, player: players[peerId] },
    });
  } else if (type === "state" && !isHost) {
    players = payload.players || {};
    products = payload.products || [];
    current = payload.current || null;
    updatePlayersUI();
    updateProductsUI();
    updateScoresUI();
    if (current) showCurrentProduct();
  } else if (type === "startRound") {
    try {
      if (!isHost && payload && payload.product) {
        const existing = products.find((p) => p.id === payload.product.id);
        if (!existing) {
          products.push(payload.product);
          updateProductsUI();
        }
      }
    } catch (e) {}
    current = payload.productId;
    guesses = {};
    updatePlayersUI();
    showCurrentProduct();
  } else if (type === "guess") {
    guesses[payload.peerId] = {
      peerId: payload.peerId,
      name: payload.name,
      value: payload.value,
    };
    updateGuessesUI();
    if (isHost) {
      broadcastFromHost({ type: "guess", payload: guesses[payload.peerId] });
      checkAllGuessed();
    }
  } else if (type === "highlight") {
    const pid = payload.peerId;
    if (players[pid]) players[pid].highlight = true;
    updateScoresUI();
    setTimeout(() => {
      if (players[pid]) delete players[pid].highlight;
      updateScoresUI();
    }, 5000);
  } else if (type === "revealPrice") {
    const actual = payload.actual;
    guessesRevealed = true;
    updateGuessesUI();
    if (revealedPrice) revealedPrice.textContent = actual;
    if (revealPriceText) revealPriceText.classList.remove("hidden");
    if (revealedPriceHost) revealedPriceHost.textContent = actual;
    if (hostRevealPriceText) hostRevealPriceText.classList.remove("hidden");
    actualPrice.textContent = "Actual price: £" + actual;
    if (actualPriceHost)
      actualPriceHost.textContent = "Actual price: £" + actual;
    if (isHost) {
      let best = null,
        bestDiff = Infinity;
      Object.values(guesses).forEach((g) => {
        const diff = Math.abs(Number(g.value) - Number(actual));
        if (diff < bestDiff) {
          bestDiff = diff;
          best = g;
        }
      });
      const winnerId = best ? best.peerId : null;
      broadcastFromHost({ type: "revealPrice", payload: { actual } });
      setTimeout(() => {
        broadcastFromHost({
          type: "playSound",
          payload: { src: "images/reveal.mp3" },
        });
        if (winnerId) {
          players[winnerId].stars = (players[winnerId].stars || 0) + 1;
          saveLocal();
          broadcastFromHost({
            type: "awardStar",
            payload: { peerId: winnerId },
          });
          broadcastFromHost({ type: "syncScore", payload: { players } });
          broadcastFromHost({
            type: "highlight",
            payload: { peerId: winnerId },
          });
          players[winnerId].highlight = true;
          updateScoresUI();
          setTimeout(() => {
            if (players[winnerId]) delete players[winnerId].highlight;
            updateScoresUI();
          }, 5000);
        }
      }, 1000);
    }
  } else if (type === "awardStar") {
    const pid = payload.peerId;
    if (players[pid]) players[pid].stars = (players[pid].stars || 0) + 1;
    updateScoresUI();
  } else if (type === "playSound") {
    try {
      const src = payload && payload.src ? payload.src : "images/reveal.mp3";
      const a = new Audio(src);
      a.play().catch(() => {});
    } catch (e) {}
  } else if (type === "syncScore") {
    players = payload.players || players;
    updateScoresUI();
  } else if (type === "newPlayer") {
    players[payload.peerId] = payload.player;
    updatePlayersUI();
  }
}

// UI updates
function updatePlayersUI() {
  playersList.innerHTML = "";
  Object.entries(players).forEach(([id, p]) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${escapeHtml(
      p.name || "anon"
    )}</strong> <span style="float:right">⭐ ${p.stars || 0}</span>`;
    playersList.appendChild(li);
  });
  updateScoresUI();
}

function updateProductsUI() {
  productsList.innerHTML = "";
  products.forEach((prod) => {
    const li = document.createElement("li");
    li.innerHTML = `<img src="${escapeHtml(
      prod.image || ""
    )}" alt=""><div><strong>${escapeHtml(
      prod.title || prod.name || "Untitled"
    )}</strong><div class="small">${escapeHtml(
      prod.desc || prod.description || ""
    )}</div><div class="small">Price (host only): ${
      prod.price || "—"
    }</div></div>`;
    productsList.appendChild(li);
  });
}

function updateScoresUI() {
  scoresList.innerHTML = "";
  Object.entries(players).forEach(([id, p]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(p.name || "anon")}</span><strong>⭐ ${
      p.stars || 0
    }</strong>`;
    if (p.highlight) {
      li.classList.add("winner");
    } else {
      li.classList.remove("winner");
    }
    scoresList.appendChild(li);
  });
}

function updateGuessesUI() {
  guessesUl.innerHTML = "";
  Object.values(guesses).forEach((g) => {
    const li = document.createElement("li");
    if (guessesRevealed) {
      li.textContent = `${g.name}: £${g.value}`;
    } else {
      li.textContent =
        g.peerId === myId
          ? `${g.name}: £${g.value}`
          : `${g.name} has sent their guess`;
    }
    guessesUl.appendChild(li);
  });
  if (guessesUlHost) {
    guessesUlHost.innerHTML = "";
    Object.values(guesses).forEach((g) => {
      const li = document.createElement("li");
      li.textContent = guessesRevealed
        ? `${g.name}: £${g.value}`
        : g.peerId === myId
        ? `${g.name}: £${g.value}`
        : `${g.name} has sent their guess`;
      guessesUlHost.appendChild(li);
    });
  }
}

// helper: if host, check whether all players have submitted guesses and enable Reveal
function checkAllGuessed() {
  if (!isHost) return false;
  const totalPlayers = Object.keys(players).length;
  const totalGuesses = Object.keys(guesses).length;
  if (totalPlayers > 0 && totalGuesses >= totalPlayers) {
    if (btnRevealPrice) btnRevealPrice.disabled = false;
    return true;
  }
  if (btnRevealPrice) btnRevealPrice.disabled = true;
  return false;
}

function showCurrentProduct() {
  const prod = products.find((x) => x.id === current);
  if (!prod) return;
  productImg.src = prod.image || "";
  productTitleView.textContent = prod.title || prod.name || "";
  productDescView.textContent = prod.desc || prod.description || "";
  currentProduct.classList.remove("hidden");
  if (productImgHost) productImgHost.src = prod.image || "";
  if (productTitleHost)
    productTitleHost.textContent = prod.title || prod.name || "";
  if (productDescHost)
    productDescHost.textContent = prod.desc || prod.description || "";
  if (hostCurrentProduct) hostCurrentProduct.classList.remove("hidden");
  try {
    const hostGuessesEl = $("hostGuessesList");
    if (hostGuessesEl) hostGuessesEl.classList.remove("hidden");
    const playerGuessesEl = $("guessesList");
    if (playerGuessesEl) playerGuessesEl.classList.remove("hidden");
  } catch (e) {}
  guessesUl.innerHTML = "";
  if (guessesUlHost) guessesUlHost.innerHTML = "";
  guesses = {};
  if (revealPriceText) revealPriceText.classList.add("hidden");
  if (hostRevealPriceText) hostRevealPriceText.classList.add("hidden");
  if (revealedPrice) revealedPrice.textContent = "";
  if (revealedPriceHost) revealedPriceHost.textContent = "";
  guessesRevealed = false;
  roundResult.classList.add("hidden");
  if (hostRoundResult) hostRoundResult.classList.add("hidden");
  if (btnRevealPrice) btnRevealPrice.disabled = true;
}

function escapeHtml(s) {
  return String(s || "").replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
}

// Event handlers
btnJoinHost.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  if (!name) return alert("Please enter your name");
  myName = name;
  isHost = true;
  if (signup) signup.classList.add("hidden");
  startPeer(true);
});
btnJoinPlayer.addEventListener("click", () => {
  joinArea.classList.remove("hidden");
  if (hostIdInput) hostIdInput.focus();
});
btnConnectToHost.addEventListener("click", () => {
  const hostId = hostIdInput.value.trim();
  const name = playerNameInput.value.trim();
  if (!hostId || !name) return alert("Enter host ID and your name");
  myName = name;
  isHost = false;
  if (signup) signup.classList.add("hidden");
  startPeer(false, hostId);
});
btnCopyHostId.addEventListener("click", () => {
  hostIdField.select();
  document.execCommand("copy");
  alert("Host ID copied to clipboard");
});

btnStartRound.addEventListener("click", () => {
  if (products.length === 0) return alert("No products available");
  if (btnStartRound) btnStartRound.disabled = true;
  if (btnRevealPrice) btnRevealPrice.disabled = true;
  let nextIndex = 0;
  if (current) {
    const idx = products.findIndex((x) => x.id === current);
    nextIndex = (idx + 1) % products.length;
  }
  current = products[nextIndex].id;
  const prod = products[nextIndex];
  guesses = {};
  updatePlayersUI();
  showCurrentProduct();
  if (isHost) {
    broadcastFromHost({
      type: "startRound",
      payload: { productId: current, product: prod },
    });
  }
});

const btnShowNext = $("btnShowNext");
if (btnShowNext) {
  btnShowNext.addEventListener("click", () => {
    if (!isHost) return;
    if (products.length === 0) return alert("No products available");
    let nextIndex = 0;
    if (current) {
      const idx = products.findIndex((x) => x.id === current);
      nextIndex = (idx + 1) % products.length;
    }
    current = products[nextIndex].id;
    const prod = products[nextIndex];
    guesses = {};
    updatePlayersUI();
    showCurrentProduct();
    broadcastFromHost({
      type: "startRound",
      payload: { productId: current, product: prod },
    });
  });
}

btnRevealPrice.addEventListener("click", () => {
  if (!isHost) return;
  const prod = products.find((x) => x.id === current);
  if (!prod) return alert("No current product");
  const actual = prod.price;
  handleMessageFromPeer(myId, { type: "revealPrice", payload: { actual } });
  if (btnShowNext) btnShowNext.disabled = false;
  if (btnRevealPrice) btnRevealPrice.disabled = true;
});

btnSendGuess.addEventListener("click", () => {
  const val = Number(guessInput.value);
  if (!val && val !== 0) return alert("Enter a guess");
  const msg = {
    type: "guess",
    payload: { peerId: myId, name: myName, value: val },
  };
  if (isHost) {
    guesses[myId] = { peerId: myId, name: myName, value: val };
    broadcastFromHost(msg);
    updateGuessesUI();
    checkAllGuessed();
  } else {
    if (connToHost && connToHost.open) connToHost.send(msg);
    else alert("Not connected to host");
  }
});

if (btnSendGuessHost) {
  btnSendGuessHost.addEventListener("click", () => {
    const val = Number(guessInputHost.value);
    if (!val && val !== 0) return alert("Enter a guess");
    const msg = {
      type: "guess",
      payload: { peerId: myId, name: myName, value: val },
    };
    guesses[myId] = { peerId: myId, name: myName, value: val };
    broadcastFromHost(msg);
    updateGuessesUI();
    checkAllGuessed();
    guessInputHost.value = "";
  });
}

// Core Peer setup
function startPeer(asHost, connectTo) {
  setStatus("Connecting to PeerJS...");
  peer = new Peer(undefined, { debug: 2 });
  peer.on("open", (id) => {
    myId = id;
    setStatus("Connected as " + id);
    if (asHost) {
      isHost = true;
      players = {};
      players[id] = { name: myName, stars: 0 };
      showSection(hostSection);
      hostIdField.value = id;
      hostIdField.select();
      // ensure no product or guesses are visible until a round starts
      try {
        const hostCur = $("hostCurrentProduct");
        if (hostCur) hostCur.classList.add("hidden");
        const hostGuesses = $("hostGuessesList");
        if (hostGuesses) hostGuesses.classList.add("hidden");
        if (productImgHost) productImgHost.src = "";
      } catch (e) {}
      // Hide product management UI for hosts: products come from products.json
      try {
        const productsPanel = $("productsPanel");
        if (productsPanel) productsPanel.classList.add("hidden");
        const productFormEl = $("productForm");
        if (productFormEl) productFormEl.classList.add("hidden");
        if (btnAddProduct) btnAddProduct.disabled = true;
      } catch (e) {
        // ignore if elements missing
      }
      // initialize host button states: Start active, ShowNext & Reveal disabled
      try {
        if (btnStartRound) btnStartRound.disabled = false;
        const btnShowNext = $("btnShowNext");
        if (btnShowNext) btnShowNext.disabled = true;
        if (btnRevealPrice) btnRevealPrice.disabled = true;
      } catch (e) {}
      // host listens for connections
      peer.on("connection", (c) => {
        const peerId = c.peer;
        connMap[peerId] = c;
        c.on("open", () => {
          setStatus("Player connected: " + peerId);
        });
        c.on("data", (data) => {
          handleMessageFromPeer(peerId, data);
        });
        c.on("close", () => {
          delete connMap[peerId];
          delete players[peerId];
          updatePlayersUI();
        });
      });
      updatePlayersUI();
      updateProductsUI();
      saveLocal();
    } else {
      // as player, connect to host
      showSection(playerSection);
      // ensure no current product or guesses visible until host starts a round
      try {
        const cur = $("currentProduct");
        if (cur) cur.classList.add("hidden");
        const pGuesses = $("guessesList");
        if (pGuesses) pGuesses.classList.add("hidden");
        if (productImg) productImg.src = "";
      } catch (e) {}
      // ensure products panel visible for non-host (if present)
      try {
        const productsPanel = $("productsPanel");
        if (productsPanel) productsPanel.classList.remove("hidden");
      } catch (e) {}
      setStatus("Connecting to host " + connectTo);
      connToHost = peer.connect(connectTo);
      connToHost.on("open", () => {
        setStatus("Connected to host");
        // send join message
        connToHost.send({ type: "join", payload: { name: myName } });
      });
      connToHost.on("data", (data) => {
        handleMessageFromPeer(connectTo, data);
      });
      connToHost.on("close", () => {
        setStatus("Disconnected from host");
      });
    }
  });
  peer.on("error", (err) => {
    console.error(err);
    alert("PeerJS error: " + err);
  });
}

// Show round result locally for host
function showRoundResult(winnerId) {
  const winnerName =
    winnerId && players[winnerId] ? players[winnerId].name : null;
  if (!winnerName) {
    if (winnerMsg) winnerMsg.textContent = "No winner";
    if (winnerMsgHost) winnerMsgHost.textContent = "No winner";
  } else {
    if (winnerMsg) winnerMsg.textContent = `${winnerName} wins a star!`;
    if (winnerMsgHost) winnerMsgHost.textContent = `${winnerName} wins a star!`;
  }
  // show player and host round result panels
  if (roundResult) roundResult.classList.remove("hidden");
  if (hostRoundResult) hostRoundResult.classList.remove("hidden");
  updateScoresUI();
}

// Load saved
loadLocal();
updateProductsUI();
updatePlayersUI();
updateScoresUI();
