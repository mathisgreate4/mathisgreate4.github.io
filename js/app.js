const container = document.querySelector("#game-slideshows");
const searchInput = document.querySelector("#game-search");
const countLabel = document.querySelector("#game-count");
const player = document.querySelector("#player");
const frame = document.querySelector("#game-frame");
const playerTitle = document.querySelector("#player-title");
const newTabButton = document.querySelector("#new-tab-button");
let games = [];

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
  const visible = games.filter(game =>
    (game.title + " " + (game.description || "")).toLowerCase().includes(query)
  );
  countLabel.textContent = visible.length + (visible.length === 1 ? " game" : " games");
  if (!visible.length) {
    container.innerHTML = '<div class="empty-state">No games found. Try another search.</div>';
    return;
  }

  container.innerHTML = visible.map(game => `
    <article class="game-card">
      <div class="game-card-art">
        <span class="game-card-fallback">${escapeHtml(game.icon || "🎮")}</span>
        ${game.image ? '<img src="' + escapeHtml(game.image) + '" alt="' + escapeHtml(game.title) + ' screenshot" loading="lazy" onerror="this.remove()">' : ''}
      </div>
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

function openGame(game) {
  playerTitle.textContent = game.title;
  frame.src = game.iframe;
  frame.title = game.title;
  newTabButton.href = game.iframe;
  player.hidden = false;
  player.scrollIntoView({ behavior: "smooth", block: "start" });
}

searchInput.addEventListener("input", renderGames);
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
