(() => {
  const root = document.querySelector("[data-portal]");
  if (!root) return;
  const grid = document.querySelector("#portal-games");
  const search = document.querySelector("#portal-search");
  const count = document.querySelector("#portal-count");
  const filters = document.querySelector("#portal-filters");
  const player = document.querySelector("#portal-player");
  const frame = document.querySelector("#portal-frame");
  const title = document.querySelector("#portal-playing-title");
  let games = [], category = "all";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const guess = name => {
    const s = name.toLowerCase();
    if (/car|racing|drift|moto|bike|drive|race|kart|truck/.test(s)) return "racing";
    if (/football|soccer|basket|baseball|golf|tennis|sports|boxing|wrestl|bowling/.test(s)) return "sports";
    if (/chess|sudoku|2048|word|puzzle|brain|sort|match|block|mahjong|memory|logic/.test(s)) return "puzzle";
    if (/shooter|gun|war|battle|fight|zombie|surviv|strike|sniper|combat/.test(s)) return "action";
    if (/clicker|idle|tycoon|simulator|craft|minecraft|obby|platform|run|jump|vex|geometry|flappy/.test(s)) return "arcade";
    return "other";
  };
  const categories = [["all","All"],["arcade","Arcade"],["action","Action"],["sports","Sports"],["racing","Racing"],["puzzle","Puzzle"],["other","Other"]];
  function drawFilters() {
    filters.innerHTML = categories.map(([id,label]) => '<button class="filter'+(id===category?' active':'')+'" data-cat="'+id+'">'+label+'</button>').join("");
    filters.querySelectorAll("[data-cat]").forEach(b => b.addEventListener("click", () => { category=b.dataset.cat; drawFilters(); draw(); }));
  }
  function draw() {
    const q = search.value.trim().toLowerCase();
    const shown = games.filter(g => (category==="all" || (g.category||"other")===category) &&
      (g.title+" "+(g.description||"")+" "+(g.category||"")).toLowerCase().includes(q));
    count.textContent = shown.length+" games · "+games.length+" total";
    grid.innerHTML = shown.map(g => '<article class="game"><div class="cover">'+(g.image?'<img loading="lazy" src="'+esc(g.image)+'" alt="" onerror="this.remove()">':'')+'<span>'+esc(g.icon||"🎮")+'</span></div><div class="game-info"><small>'+esc(g.category||"game")+'</small><h3>'+esc(g.title)+'</h3><p>'+esc(g.description||"")+'</p><button data-play="'+esc(g.id)+'">PLAY ↗</button></div></article>').join("") || '<p class="empty">No games match that search.</p>';
    grid.querySelectorAll("[data-play]").forEach(b => b.addEventListener("click", () => launch(games.find(g=>g.id===b.dataset.play))));
  }
  function launch(g) {
    if (!g) return;
    title.textContent = g.title;
    frame.src = g.iframe;
    frame.title = g.title;
    document.querySelector("#portal-new-tab").href = g.iframe;
    player.hidden = false;
    player.scrollIntoView({behavior:"smooth",block:"start"});
  }
  document.querySelector("#portal-close").addEventListener("click", () => { frame.src="about:blank"; player.hidden=true; });
  document.querySelector("#portal-fullscreen").addEventListener("click", async () => { try { await frame.requestFullscreen(); } catch(e) { document.querySelector("#portal-message").textContent="Fullscreen unavailable here. Try New tab."; } });
  search.addEventListener("input",draw);
  async function init() {
    count.textContent="Loading game library…";
    const [local,gn] = await Promise.allSettled([
      fetch("/data/games.json").then(r=>{if(!r.ok)throw Error();return r.json();}),
      fetch("https://cdn.jsdelivr.net/gh/freebuisness/assets@latest/zones.json").then(r=>{if(!r.ok)throw Error();return r.json();})
    ]);
    const list = local.status==="fulfilled" && Array.isArray(local.value) ? local.value.slice() : [];
    if (gn.status==="fulfilled" && Array.isArray(gn.value)) {
      const base="https://cdn.jsdelivr.net/gh/freebuisness/html@main/";
      const covers="https://cdn.jsdelivr.net/gh/freebuisness/covers@main/";
      gn.value.forEach(z=>{
        if (!z || Number(z.id)<0 || !z.name || typeof z.url!=="string" || !z.url.includes("{HTML_URL}")) return;
        const slug=z.url.replace("{HTML_URL}/","");
        if (!slug || slug.includes("..")) return;
        list.push({id:"gn-"+z.id,title:z.name,category:guess(z.name),icon:"🎮",description:z.author?"By "+z.author+" · GN-Math catalog":"From the GN-Math catalog",iframe:base+slug,image:typeof z.cover==="string"?z.cover.replace("{COVER_URL}/",covers):""});
      });
    }
    const seen=new Set();
    games=list.filter(g=>{const k=String(g.title||"").trim().toLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true;});
    drawFilters(); draw();
    if (!games.length) count.textContent="The game library could not load. Refresh to try again.";
  }
  init();
})();