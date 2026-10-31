const grid = document.querySelector("#game-grid");
const searchInput = document.querySelector("#game-search");
const filters = document.querySelector("#category-filters");
const countLabel = document.querySelector("#game-count");
const player = document.querySelector("#player");
const frame = document.querySelector("#game-frame");
const playerTitle = document.querySelector("#player-title");
const newTabButton = document.querySelector("#new-tab-button");
let games = [];
let activeCategory = "all";

async function loadGames() {
  try {
    const response = await fetch("data/games.json");
    if (!response.ok) throw new Error("Could not load games.json");
    games = await response.json();
    renderGames();
  } catch (error) {
    grid.innerHTML = '<div class="empty-state">Could not load the game list. Check that <code>data/games.json</code> exists and contains valid JSON.</div>';
    countLabel.textContent = "Library unavailable";
    console.error(error);
  }
}

function renderGames() {
  const query = searchInput.value.trim().toLowerCase();
  const visibleGames = games.filter(game => {
    const matchesCategory = activeCategory === "all" || game.category === activeCategory;
    const searchable = (game.title + " " + game.description + " " + game.category).toLowerCase();
    return matchesCategory && searchable.includes(query);
  });

  countLabel.textContent = visibleGames.length + (visibleGames.length === 1 ? " game" : " games");
  if (!visibleGames.length) {
    grid.innerHTML = '<div class="empty-state">No games found. Try another search.</div>';
    return;
  }

  grid.innerHTML = visibleGames.map(game => `
    <article class="game-card">
      <div class="game-icon" aria-hidden="true">${escapeHtml(game.icon || "🎮")}</div>
      <div class="game-category">${escapeHtml(game.category)}</div>
      <h3>${escapeHtml(game.title)}</h3>
      <p>${escapeHtml(game.description || "")}</p>
      <button class="play-button" type="button" data-game-id="${escapeHtml(game.id)}">Play game ↗</button>
    </article>
  `).join("");

  grid.querySelectorAll("[data-game-id]").forEach(button => {
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

function openGame(game) {
  playerTitle.textContent = game.title;
  frame.src = game.iframe;
  frame.title = game.title;
  newTabButton.href = game.iframe;
  player.hidden = false;
  player.scrollIntoView({ behavior: "smooth", block: "start" });
}

searchInput.addEventListener("input", renderGames);
filters.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  filters.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
  renderGames();
});

document.querySelector("#close-button").addEventListener("click", () => {
  frame.src = "about:blank";
  player.hidden = true;
});

document.querySelector("#fullscreen-button").addEventListener("click", async () => {
  try {
    if (frame.requestFullscreen) await frame.requestFullscreen();
    else await document.querySelector(".frame-wrap").requestFullscreen();
  } catch (error) {
    document.querySelector("#player-message").textContent =
      "Fullscreen was blocked by the browser. Try again or use New tab.";
  }
});

loadGames();
