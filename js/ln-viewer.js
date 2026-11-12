/* ============================================================
   🎬 The pop-out viewer, as the Standard Foundational Training has it (Foundational-Training,
   js/ft-updates.js: "Drive files open in the pop-out viewer", itself the LSH Training Portal's
   Recorded Lectures viewer). A video card, or ⛶ Pop out under a video, plays the video here:
   wide and centred, draggable by its header, ⛶ Full Screen (the browser's own full screen, so
   sharing the screen in Google Meet shows only the video), ↗ opens the original in a new tab,
   ✕ closes it. The player is the largest 16:9 the pane allows.
   Any <a class="viewer-link" data-kind="video" data-title="…" href="…"> opens in it.
   ============================================================ */
(function(){
"use strict";
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const css = document.createElement("style");
css.textContent = `#lecture-viewer-pane{position:fixed;right:24px;bottom:24px;width:380px;max-width:calc(100vw - 48px);height:250px;max-height:calc(100vh - 48px);background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 20px 50px rgba(0,0,0,.35);display:none;flex-direction:column;z-index:3000;overflow:hidden;}
#lecture-viewer-pane.open{display:flex;}
body.lv-dragging iframe{pointer-events:none;}
body.lv-dragging{user-select:none;}
#lecture-viewer-header{background:#161829;color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:move;user-select:none;flex-shrink:0;border-bottom:2px solid #dc2626;}
#lecture-viewer-title{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:12px;}
#lecture-viewer-actions{display:flex;gap:6px;flex-shrink:0;align-items:center;}
#lecture-viewer-open-link,#lecture-viewer-fullscreen,#lecture-viewer-close{background:transparent;border:1px solid rgba(255,255,255,.4);color:#fff;font-size:12px;font-weight:700;font-family:inherit;border-radius:5px;padding:4px 8px;cursor:pointer;text-decoration:none;line-height:1.4;display:inline-block;}
#lecture-viewer-open-link:hover,#lecture-viewer-fullscreen:hover{background:rgba(255,255,255,.15);}
#lecture-viewer-close:hover{background:#dc2626;border-color:#dc2626;}
#lecture-viewer-body{flex:1;position:relative;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;}
#lecture-viewer-body iframe{width:100%;height:100%;border:none;background:#000;}
#lecture-viewer-pane.maximized{border-radius:0;}`;
document.head.appendChild(css);

const pane = document.createElement("div");
pane.id = "lecture-viewer-pane";
pane.setAttribute("role", "dialog"); pane.setAttribute("aria-label", "Video viewer");
pane.innerHTML = `<div id="lecture-viewer-header"><span id="lecture-viewer-title">Recorded Lecture</span><div id="lecture-viewer-actions">
    <a id="lecture-viewer-open-link" href="#" target="_blank" rel="noopener noreferrer" title="Open the original link in a new tab">↗</a>
    <button id="lecture-viewer-fullscreen" type="button" title="Full Screen">⛶</button>
    <button id="lecture-viewer-close" type="button" title="Close">✕</button></div></div>
  <div id="lecture-viewer-body"></div>`;
document.body.appendChild(pane);
const $ = (id) => document.getElementById(id);

function embedUrl(url){
  const u = String(url || "").trim();
  let m = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i); if(m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  m = u.match(/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([a-zA-Z0-9_-]+)/i); if(m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  m = u.match(/canva\.com\/design\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/i); if(m) return `https://www.canva.com/design/${m[1]}/${m[2]}/view?embed`;
  return null;
}
function fit(){
  const body = $("lecture-viewer-body"), f = body.querySelector("iframe"); if(!f) return;
  let w = body.clientWidth, h = body.clientHeight; if(w <= 0 || h <= 0) return;
  const hh = w / (16 / 9); if(hh > h) w = h * (16 / 9); else h = hh;
  f.style.width = Math.round(w) + "px"; f.style.height = Math.round(h) + "px";
}
if(window.ResizeObserver) new ResizeObserver(fit).observe($("lecture-viewer-body"));
// a video opens wide: centred, most of the window
function reset(){ Object.assign(pane.style, { right: "", bottom: "", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "min(1240px, calc(100vw - 48px))", height: "min(72vh, 760px)", maxWidth: "", maxHeight: "" }); }
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function exitFs(){ if(fsEl() === pane){ const ex = document.exitFullscreen || document.webkitExitFullscreen; if(ex) try{ const r = ex.call(document); if(r && r.catch) r.catch(() => {}); }catch(_){} } }
function setMax(on){
  const b = $("lecture-viewer-fullscreen");
  if(on){ pane.classList.add("maximized"); Object.assign(pane.style, { top: "0", left: "0", right: "0", bottom: "0", width: "auto", height: "auto", maxWidth: "none", maxHeight: "none", transform: "none" }); b.textContent = "⤢"; b.title = "Exit Full Screen (Esc)"; }
  else { pane.classList.remove("maximized"); reset(); b.textContent = "⛶"; b.title = "Full Screen"; }
  fit();
}
function toggleMax(){
  if(!pane.classList.contains("maximized")){
    setMax(true);
    const req = pane.requestFullscreen || pane.webkitRequestFullscreen;
    if(req && !fsEl()){ try{ const r = req.call(pane); if(r && r.catch) r.catch(() => {}); }catch(_){} }
  } else { exitFs(); setMax(false); }
}
document.addEventListener("fullscreenchange", () => { if(!fsEl() && pane.classList.contains("maximized")) setMax(false); });
function open(item){
  const src = embedUrl(item.url);
  $("lecture-viewer-title").textContent = item.title || "Recorded Lecture";
  const link = $("lecture-viewer-open-link");
  if(item.url){ link.href = String(item.url).replace(/\/preview$/, "/view"); link.style.display = "inline-block"; } else link.style.display = "none";
  $("lecture-viewer-body").innerHTML = src ? `<iframe src="${esc(src)}" title="${esc(item.title || "Video")}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
    : `<div style="color:#94a3b8;font-size:12px;padding:40px">This link can't be previewed inline. <a href="${esc(item.url || "")}" target="_blank" rel="noopener" style="color:#dc2626">Open it in a new tab →</a></div>`;
  pane.classList.remove("maximized"); $("lecture-viewer-fullscreen").textContent = "⛶";
  reset(); pane.classList.add("open"); fit();
}
function close(){ exitFs(); pane.classList.remove("open", "maximized"); $("lecture-viewer-body").innerHTML = ""; }
$("lecture-viewer-fullscreen").addEventListener("click", toggleMax);
$("lecture-viewer-close").addEventListener("click", close);
document.addEventListener("keydown", (e) => { if(e.key === "Escape" && pane.classList.contains("open") && !fsEl()) close(); });
// dragging by the header (not while it fills the screen)
(function(){
  const h = $("lecture-viewer-header"), skip = ["lecture-viewer-close", "lecture-viewer-fullscreen", "lecture-viewer-open-link"];
  let drag = false, ox = 0, oy = 0;
  const can = (t) => skip.indexOf(t.id) === -1 && !pane.classList.contains("maximized");
  const start = (x, y) => { const r = pane.getBoundingClientRect(); Object.assign(pane.style, { transform: "none", right: "", bottom: "", left: r.left + "px", top: r.top + "px" }); ox = x - r.left; oy = y - r.top; drag = true; document.body.classList.add("lv-dragging"); };
  const move = (x, y) => { if(!drag) return; pane.style.left = Math.max(-pane.offsetWidth + 120, Math.min(x - ox, innerWidth - 60)) + "px"; pane.style.top = Math.max(0, Math.min(y - oy, innerHeight - 40)) + "px"; };
  const end = () => { drag = false; document.body.classList.remove("lv-dragging"); };
  h.addEventListener("mousedown", (e) => { if(!can(e.target)) return; start(e.clientX, e.clientY); e.preventDefault(); });
  document.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
  document.addEventListener("mouseup", end);
  h.addEventListener("touchstart", (e) => { if(!can(e.target)) return; start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  document.addEventListener("touchmove", (e) => { if(drag) move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  document.addEventListener("touchend", end);
})();
// a.viewer-link (a video card, ⛶ Pop out) opens here; Ctrl/Cmd-click still opens the link in a tab
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a.viewer-link");
  if(a && !(e.ctrlKey || e.metaKey || e.shiftKey)){ e.preventDefault(); open({ title: a.getAttribute("data-title"), url: a.getAttribute("href") }); }
});
window.lvOpen = open; window.lvClose = close; window.lvEmbedUrl = embedUrl;
})();
