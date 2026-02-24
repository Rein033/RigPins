const grid = document.getElementById("grid");
const q = document.getElementById("q");
const filter = document.getElementById("filter");
const installBtn = document.getElementById("installBtn");
const fab = document.getElementById("fab");
const menuBtn = document.getElementById("menuBtn");
const bottomNav = document.querySelectorAll(".bottom-nav .nav-item");

const modal = document.getElementById("modal");
const mImg = document.getElementById("mImg");
const mTitle = document.getElementById("mTitle");
const mDesc = document.getElementById("mDesc");
const mTags = document.getElementById("mTags");
const mGear = document.getElementById("mGear");
const mSource = document.getElementById("mSource");
const mCopy = document.getElementById("mCopy");
const mCat = document.getElementById("mCat");

let posts = [];
let shown = [];
let deferredPrompt = null;

function esc(s=""){ return String(s).replace(/[&<>"']/g, m => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[m]));}

function niceCat(c){
  return ({
    desk: "Desk setup",
    "3d": "3D printing",
    gaming: "Gaming",
    homelab: "Homelab",
    dashboard: "Dashboard"
  })[c] || c || "";
}

function renderPins(list){
  grid.innerHTML = "";
  list.forEach((p, idx) => {
    const el = document.createElement("article");
    el.className = "pin";
    el.dataset.id = p.id;

    const tags = (p.tags || []).slice(0,4).map(t => `<span class="tag">${esc(t)}</span>`).join("");
    el.innerHTML = `
      <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" />
      <div class="meta">
        <div class="kicker">${esc(niceCat(p.category))}</div>
        <p class="title">${esc(p.title)}</p>
        <p class="sub">${esc(p.description || "")}</p>
        <div class="tags">${tags}</div>
      </div>
    `;
    el.addEventListener("click", () => openModal(p));
    grid.appendChild(el);

    // Insert an in-grid ad placeholder every 8 items (non-intrusive)
    if ((idx + 1) % 8 === 0) {
      const adEl = document.createElement("article");
      adEl.className = "pin ad-pin";
      adEl.setAttribute('aria-hidden', 'false');
      adEl.innerHTML = `
        <div class="ad-card" data-ad-inline>
          <div class="ad-label">Promoted</div>
          <div class="ad-art" aria-hidden="true"></div>
          <div class="ad-body" style="display:flex;align-items:center;justify-content:space-between;width:100%">
            <div class="ad-text" style="color:var(--muted);font-size:13px">Advertentie — niet-opdringerig</div>
            <a class="ad-cta" href="#" role="link" aria-label="Sponsor link">Meer</a>
          </div>
        </div>
      `;
      grid.appendChild(adEl);
    }
  });
}

// Lazy-load ad placeholders when visible to avoid layout jank and unnecessary requests
function initAds(){
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.dataset.adLoaded) return;
      // mark loaded to avoid re-inserting
      el.dataset.adLoaded = '1';

      // For slot ads (.ad-inner) insert lightweight content; real ad networks insert scripts/iframes here.
      if (el.matches('.ad-inner') || el.querySelector('[data-ad-placeholder]')){
        const inner = el.querySelector('[data-ad-placeholder]') || el;
        if (inner) inner.innerHTML = `<div class="ad-meta"><span class="ad-chip">Promoted</span></div><div class="ad-content">Advertentie voorbeeld — plaats jouw advertentie hier.</div>`;
      }

      // For inline ad cards, we could swap in a real creative (image/iframe). For now, simply reveal the art area.
      if (el.classList && el.classList.contains('ad-pin')){
        const art = el.querySelector('.ad-art');
        if (art) art.style.background = 'linear-gradient(90deg, rgba(125,211,252,.15), rgba(167,139,250,.08))';
      }

      obs.unobserve(el);
    });
  }, { rootMargin: '200px 0px' });

  // Observe static ad slots and any inline ad cards
  document.querySelectorAll('.ad-inner, .ad-pin').forEach(node => observer.observe(node));
}

function applyFilters(){
  const term = (q.value || "").trim().toLowerCase();
  const cat = filter.value;

  shown = posts.filter(p => {
    const hay = [
      p.title, p.description, p.category,
      ...(p.tags || []),
      ...((p.gear || []).map(g => g.name))
    ].join(" ").toLowerCase();

    const termOk = !term || hay.includes(term);
    const catOk = cat === "all" || p.category === cat;
    return termOk && catOk;
  });

  renderPins(shown);
}

function openModal(p){
  mImg.src = p.image;
  mImg.alt = p.title;
  mCat.textContent = niceCat(p.category);
  mTitle.textContent = p.title;
  mDesc.textContent = p.description || "";

  mTags.innerHTML = "";
  (p.tags || []).forEach(t => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = t;
    mTags.appendChild(span);
  });

  mGear.innerHTML = "";
  (p.gear || []).forEach(g => {
    const li = document.createElement("li");
    if (g.url) {
      li.innerHTML = `<a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.name)}</a>`;
    } else {
      li.textContent = g.name;
    }
    mGear.appendChild(li);
  });

  mSource.href = p.sourceUrl || "#";
  mSource.style.display = p.sourceUrl ? "inline-flex" : "none";

  history.replaceState(null, "", `#${encodeURIComponent(p.id)}`);
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(){
  modal.setAttribute("aria-hidden", "true");
  if (location.hash) history.replaceState(null, "", location.pathname);
}

modal.addEventListener("click", (e) => {
  if (e.target?.dataset?.close) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") closeModal();
});

mCopy.addEventListener("click", async () => {
  try{
    await navigator.clipboard.writeText(location.href);
    mCopy.textContent = "Copied!";
    setTimeout(() => (mCopy.textContent = "Copy link"), 900);
  }catch{
    alert("Copy failed (permission).");
  }
});

q.addEventListener("input", applyFilters);
filter.addEventListener("change", applyFilters);

// ---- PWA install flow ----
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "inline-flex";
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.style.display = "none";
});

// iOS hint: iOS heeft geen beforeinstallprompt
(function iosHint(){
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  if (isIOS && !isStandalone) {
    installBtn.style.display = "inline-flex";
    installBtn.textContent = "Add to Home Screen";
    installBtn.addEventListener("click", () => {
      alert("iPhone/iPad: open Share → ‘Add to Home Screen’ om RigPins te installeren.");
    }, { once:true });
  }
})();

// ---- Service worker ----
async function registerSW(){
  if (!("serviceWorker" in navigator)) return;
  try{
    const reg = await navigator.serviceWorker.register("/sw.js");

    // If there's an updated service worker waiting, prompt the user
    if (reg.waiting) {
      promptUserToRefresh(reg);
    }

    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          promptUserToRefresh(reg);
        }
      });
    });
    // Listen for controllerchange to reload page after skipWaiting
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }catch(e){
    // geen paniek
  }
}

function promptUserToRefresh(reg){
  // Simple confirm UX; replace with nicer banner in the future
  const shouldRefresh = confirm('Er is een update beschikbaar. Pagina verversen om te updaten?');
  if (!shouldRefresh) return;
  if (reg.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

async function init(){
  await registerSW();

  const res = await fetch("/data/posts.json", { cache: "no-store" });
  posts = await res.json();
  shown = posts;
  applyFilters();

  if (location.hash?.length > 1){
    const id = decodeURIComponent(location.hash.slice(1));
    const p = posts.find(x => x.id === id);
    if (p) openModal(p);
  }

  // FAB opens upload or account (placeholder)
  if (fab){
    fab.addEventListener("click", () => {
      // In the future this will open the upload flow. For now, forward to login.
      location.href = "/login.html";
    });
  }

  // simple hamburger hint (toggle minimal menu state)
  if (menuBtn){
    menuBtn.addEventListener("click", () => {
      alert("Menu: future navigation (saved, uploads, settings)");
    });
  }

  // bottom nav behavior
  if (bottomNav && bottomNav.length){
    bottomNav.forEach(btn => btn.addEventListener("click", (e)=>{
      bottomNav.forEach(x=>x.classList.remove("active"));
      e.currentTarget.classList.add("active");
      const t = e.currentTarget.dataset.target;
      // simple actions: scroll to top for home, focus search for explore, open saved placeholder
      if (t === "home") window.scrollTo({top:0, behavior:"smooth"});
      if (t === "explore") q.focus();
      if (t === "saved") alert("Saved: feature coming soon.");
      if (t === "profile") location.href = "/login.html";
    }));
  }
}

init();