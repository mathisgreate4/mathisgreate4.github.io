const slideshows = [
  { name: "Sports", category: "sports" },
  { name: "Racing", category: "racing" },
  { name: "Worlds", category: "worlds" },
  { name: "Arcade", category: "arcade" },
  { name: "Puzzle", category: "puzzle" }
];
const container = document.querySelector("#game-slideshows");
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
    container.innerHTML = '<div class="empty-state">Could not load the game list. Check data/games.json.</div>';
    countLabel.textContent = "Library unavailable";
    console.error(error);
  }
}

function renderGames() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = games.filter(game => {
    const matchesCategory = activeCategory === "all" || game.category === activeCategory;
    const searchable = (game.title + " " + game.description + " " + game.category).toLowerCase();
    return matchesCategory && searchable.includes(query);
  });
  countLabel.textContent = visible.length + (visible.length === 1 ? " game" : " games");
  if (!visible.length) {
    container.innerHTML = '<div class="empty-state">No games found. Try another search.</div>';
    return;
  }

  const groups = activeCategory === "all"
    ? slideshows.map(row => ({...row, games: visible.filter(game => game.category === row.category)})).filter(row => row.games.length)
    : [{name: activeCategory[0].toUpperCase() + activeCategory.slice(1), category: activeCategory, games: visible}];

  container.innerHTML = groups.map(row => `
    <section class="game-row">
      <div class="game-row-heading"><h3>${escapeHtml(row.name)} Games</h3><span>${row.games.length} available</span></div>
      <div class="game-row-track-wrap">
        <button class="slide-arrow prev" type="button" aria-label="Scroll ${escapeHtml(row.name)} left">‹</button>
        <div class="game-row-track">
          ${row.games.map(game => `
            <article class="game-card">
              <div class="game-card-art"><span>${escapeHtml(game.icon || "🎮")}</span><small>${escapeHtml(row.name.toUpperCase())}</small></div>
              <div class="game-category">${escapeHtml(game.category)}</div>
              <h4>${escapeHtml(game.title)}</h4>
              <p>${escapeHtml(game.description || "")}</p>
              <button class="play-button" type="button" data-game-id="${escapeHtml(game.id)}">Play game ↗</button>
            </article>
          `).join("")}
        </div>
        <button class="slide-arrow next" type="button" aria-label="Scroll ${escapeHtml(row.name)} right">›</button>
      </div>
    </section>
  `).join("");

  container.querySelectorAll("[data-game-id]").forEach(button => {
    button.addEventListener("click", () => {
      const selected = games.find(game => game.id === button.dataset.gameId);
      if (selected) openGame(selected);
    });
  });
  container.querySelectorAll(".slide-arrow").forEach(button => {
    button.addEventListener("click", () => {
      const track = button.parentElement.querySelector(".game-row-track");
      track.scrollBy({left: button.classList.contains("prev") ? -330 : 330, behavior:"smooth"});
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
    document.querySelector("#player-message").textContent = "Fullscreen was blocked. Try again or use New tab.";
  }
});
loadGames();
