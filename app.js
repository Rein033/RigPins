const grid = document.getElementById("grid");
const q = document.getElementById("q");
const filter = document.getElementById("filter");
const installBtn = document.getElementById("installBtn");

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
  list.forEach(p => {
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
  });
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
    await navigator.serviceWorker.register("/sw.js");
  }catch(e){
    // geen paniek
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
}

init();