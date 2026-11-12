const container = document.querySelector("#game-slideshows");
const searchInput = document.querySelector("#game-search");
const countLabel = document.querySelector("#game-count");
const player = document.querySelector("#player");
const frame = document.querySelector("#game-frame");
const playerTitle = document.querySelector("#player-title");
const newTabButton = document.querySelector("#new-tab-button");

const GN_CATALOG_URL = "https://cdn.jsdelivr.net/gh/freebuisness/assets@latest/zones.json";
const GN_GAME_BASE = "https://raw.githack.com/freebuisness/html/main/";
const GN_COVER_BASE = "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/";

let games = [];
let activeCategory = "all";

function guessCategory(name) {
  const title = name.toLowerCase();
  if (/car|racing|drift| moto|bike|drive|race|kart|truck/.test(title)) return "racing";
  if (/football|soccer|basket|baseball|golf|tennis|cricket|sports|boxing|wrestl|bowling/.test(title)) return "sports";
  if (/chess|sudoku|2048|word|puzzle|brain|sort|match|block|mahjong|memory|logic/.test(title)) return "puzzle";
  if (/shooter|gun|war|battle|fight|zombie|surviv|strike|sniper|combat/.test(title)) return "action";
  if (/clicker|idle|tycoon|simulator|craft|minecraft|obby|platform|run|jump|vex|geometry|flappy/.test(title)) return "arcade";
  return "other";
}

function normalizeGnGame(zone) {
  if (!zone || Number(zone.id) < 0 || !zone.name || typeof zone.url !== "string") return null;
  if (!zone.url.includes("{HTML_URL}")) return null;
  const slug = zone.url.replace("{HTML_URL}/", "");
  if (!slug || slug.includes("..")) return null;
  return {
    id: "gn-" + zone.id,
    title: zone.name,
    category: guessCategory(zone.name),
    icon: "🎮",
    description: zone.author ? "By " + zone.author + " · GN-Math catalog" : "From the GN-Math game catalog.",
    iframe: GN_GAME_BASE + slug,
    image: typeof zone.cover === "string" ? zone.cover.replace("{COVER_URL}/", GN_COVER_BASE) : "",
    source: "GN-Math catalog"
  };
}

async function loadGames() {
  countLabel.textContent = "Loading game libraries…";
  const [localResult, gnResult] = await Promise.allSettled([
    fetch("data/games.json").then(response => {
      if (!response.ok) throw new Error("Could not load local games");
      return response.json();
    }),
    fetch(GN_CATALOG_URL).then(response => {
      if (!response.ok) throw new Error("GN-Math catalog unavailable");
      return response.json();
    })
  ]);

  const localGames = localResult.status === "fulfilled" && Array.isArray(localResult.value)
    ? localResult.value.map(game => ({ ...game, source: "MathisGreate4" }))
    : [];
  const gnGames = gnResult.status === "fulfilled" && Array.isArray(gnResult.value)
    ? gnResult.value.map(normalizeGnGame).filter(Boolean)
    : [];

  const seen = new Set();
  games = [...localGames, ...gnGames].filter(game => {
    const key = String(game.title || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  buildCategoryFilters();
  renderGames();

  if (gnResult.status !== "fulfilled") {
    countLabel.textContent += " · GN-Math catalog could not load";
  }
}

function buildCategoryFilters() {
  let filters = document.querySelector("#game-categories");
  if (!filters) {
    filters = document.createElement("div");
    filters.id = "game-categories";
    filters.className = "category-filters";
    const toolbar = document.querySelector(".toolbar");
    toolbar.appendChild(filters);
  }
  const categories = [
    ["all", "All games"], ["action", "Action"], ["arcade", "Arcade"],
    ["sports", "Sports"], ["racing", "Racing"], ["puzzle", "Puzzle"], ["other", "Other"]
  ];
  filters.innerHTML = categories.map(([id, label]) =>
    '<button type="button" class="category-chip' + (activeCategory === id ? ' active' : '') +
    '" data-category="' + id + '">' + label + '</button>'
  ).join("");
  filters.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      buildCategoryFilters();
      renderGames();
    });
  });
}

function renderGames() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = games.filter(game => {
    const matchesSearch = (game.title + " " + (game.description || "") + " " + (game.category || "")).toLowerCase().includes(query);
    const matchesCategory = activeCategory === "all" || (game.category || "other") === activeCategory;
    return matchesSearch && matchesCategory;
  });

  countLabel.textContent = visible.length + (visible.length === 1 ? " game" : " games") +
    " · " + games.length + " in library";

  if (!visible.length) {
    container.innerHTML = '<div class="empty-state">No games found. Try another search or category.</div>';
    return;
  }

  container.innerHTML = visible.map(game => `
    <article class="game-card">
      <div class="game-card-art">
        <span class="game-card-fallback">${escapeHtml(game.icon || "🎮")}</span>
        ${game.image ? '<img src="' + escapeHtml(game.image) + '" alt="' + escapeHtml(game.title) + ' cover" loading="lazy" onerror="this.remove()">' : ''}
      </div>
      <span class="game-category">${escapeHtml(game.category || "game")}</span>
      <h3>${escapeHtml(game.title)}</h3>
      <p>${escapeHtml(game.description || "")}</p>
      <button class="play-button" type="button" data-game-id="${escapeHtml(game.id)}">Play game ↗</button>
    </article>
  `).join("");

  container.querySelectorAll("[data-game-id]").forEach(button => {
    button.addEventListener("click", () => {
      const selected = games.find(game => game.id === button.dataset.gameId);
      if (selected) openGame(selected);
    });
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

// Local playtime rewards: 10 coins for every full active minute.
const REWARD_STORAGE_KEY = "m4-arena-rewards-v1";
const REWARD_CATALOG = {
  rising: { cost: 100, name: "RISING STAR" },
  elite: { cost: 250, name: "REDLINE ELITE" },
  legend: { cost: 500, name: "LEGEND MODE" }
};
let rewardData = loadRewardData();
let activePlaySeconds = 0;
let rewardTimer = null;

function loadRewardData() {
  try {
    const saved = JSON.parse(localStorage.getItem(REWARD_STORAGE_KEY) || "{}");
    return {
      coins: Math.max(0, Number(saved.coins) || 0),
      totalSeconds: Math.max(0, Number(saved.totalSeconds) || 0),
      progressSeconds: Math.max(0, Number(saved.progressSeconds) || 0) % 60,
      owned: Array.isArray(saved.owned) ? saved.owned : []
    };
  } catch (error) {
    return { coins: 0, totalSeconds: 0, progressSeconds: 0, owned: [] };
  }
}

function saveRewardData() {
  try { localStorage.setItem(REWARD_STORAGE_KEY, JSON.stringify(rewardData)); } catch (error) {}
}

function formatPlaytime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? hours + "h " + minutes + "m" : minutes + "m";
}

function renderRewards() {
  const coins = document.querySelector("#reward-coins");
  if (!coins) return;
  coins.textContent = rewardData.coins.toLocaleString();
  document.querySelector("#reward-time").textContent = formatPlaytime(rewardData.totalSeconds);
  document.querySelector("#reward-minutes").textContent = Math.floor(rewardData.totalSeconds / 60).toLocaleString();
  document.querySelector("#reward-progress").style.width = (rewardData.progressSeconds / 60 * 100) + "%";
  document.querySelector("#reward-progress-text").textContent =
    Math.floor(rewardData.progressSeconds / 60) + ":" + String(rewardData.progressSeconds % 60).padStart(2, "0") + " / 1:00";
  const status = document.querySelector("#reward-status");
  status.textContent = !player.hidden && document.visibilityState === "visible" && document.hasFocus()
    ? "EARNING COINS" : "WAITING FOR GAME";
  document.querySelectorAll("[data-reward]").forEach(button => {
    const reward = REWARD_CATALOG[button.dataset.reward];
    const owned = rewardData.owned.includes(button.dataset.reward);
    button.disabled = owned || rewardData.coins < reward.cost;
    button.textContent = owned ? "UNLOCKED ✓" : rewardData.coins >= reward.cost ? "UNLOCK NOW" : reward.cost + " COINS";
    button.classList.toggle("owned", owned);
  });
}

function rewardTick() {
  if (player.hidden || document.visibilityState !== "visible" || !document.hasFocus()) {
    renderRewards();
    return;
  }
  rewardData.totalSeconds += 1;
  rewardData.progressSeconds += 1;
  if (rewardData.progressSeconds >= 60) {
    rewardData.progressSeconds = 0;
    rewardData.coins += 10;
    document.querySelector("#reward-notice").textContent = "✦ +10 COINS ADDED! Keep that streak going.";
  }
  saveRewardData();
  renderRewards();
}

function startRewardTimer() {
  if (rewardTimer) clearInterval(rewardTimer);
  rewardTimer = setInterval(rewardTick, 1000);
  renderRewards();
}

document.querySelectorAll("[data-reward]").forEach(button => {
  button.addEventListener("click", () => {
    const id = button.dataset.reward;
    const reward = REWARD_CATALOG[id];
    if (!reward || rewardData.owned.includes(id) || rewardData.coins < reward.cost) return;
    rewardData.coins -= reward.cost;
    rewardData.owned.push(id);
    saveRewardData();
    document.querySelector("#reward-notice").textContent = "✦ UNLOCKED: " + reward.name + "!";
    renderRewards();
  });
});
document.addEventListener("visibilitychange", renderRewards);
window.addEventListener("focus", renderRewards);
window.addEventListener("blur", renderRewards);
startRewardTimer();

function openGame(game) {
  playerTitle.textContent = game.title;
  frame.src = game.iframe;
  frame.title = game.title;
  newTabButton.href = game.iframe;
  player.hidden = false;
  document.querySelector("#reward-notice").textContent = "Game launched. Your active playtime is counting.";
  renderRewards();
  player.scrollIntoView({ behavior: "smooth", block: "start" });
  const message = document.querySelector("#player-message");
  message.textContent = "Game hosted by its source provider. If the provider blocks embedding, choose New tab.";
}

searchInput.addEventListener("input", renderGames);

document.querySelector("#close-button").addEventListener("click", () => {
  frame.src = "about:blank";
  player.hidden = true;
  document.querySelector("#reward-notice").textContent = "Game closed. Your earned coins are saved.";
  renderRewards();
});

document.querySelector("#fullscreen-button").addEventListener("click", async () => {
  try {
    if (frame.requestFullscreen) await frame.requestFullscreen();
    else await document.querySelector(".frame-wrap").requestFullscreen();
  } catch (error) {
    document.querySelector("#player-message").textContent = "Fullscreen was blocked. Try again or use New tab.";
  }
});

loadGames();
