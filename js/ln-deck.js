/* ============================================================
   🎞 The lesson deck's progress track (css/ln-deck.css draws it along the foot of the Previous / Next bar).
   Design only: it reads "Step n of N" from the bar after each render and sets --deck-progress (n / N) on the
   bar. It adds no text and changes nothing the page saves or shows.
   ============================================================ */
(function(){
"use strict";
function mark(){
  const bar = document.querySelector(".player-bar"), count = bar && bar.querySelector(".step-count");
  if(!count) return;
  const m = (count.textContent || "").match(/(\d+)\s+of\s+(\d+)/);
  if(m && +m[2] > 0) bar.style.setProperty("--deck-progress", String(Math.min(1, +m[1] / +m[2])));
}
function start(){
  const app = document.getElementById("app");
  if(!app) return;
  mark();
  new MutationObserver(mark).observe(app, { childList: true, subtree: true });
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
