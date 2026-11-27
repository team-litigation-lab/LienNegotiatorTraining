/* 🔓 Signed in until 8 hours with no activity: the LSH Training Portal's rule, on every course.
   A session token (worker.js makeToken, "<role>.<subject>.<expiry ms>.<signature>") lasts SESSION_IDLE_HOURS, 8 hours
   from when it was last renewed. While a page of this course is open and in view it is renewed every 10 minutes
   (worker.js /api/auth/refresh), and at once when the tab comes back into view, so closing the tab or the browser no
   longer signs anyone out: 8 hours with no page of the course open does. A token that has run out is never renewed
   (that takes the Portal again, or the admin password), and Log out and a revoked trainee still end the session at once.
   Loaded in <head>, before the page reads its tokens: a token that has already run out is dropped here, so the page
   opens signed out (the Portal note) instead of failing its first request. Asks nothing while the tab is in the
   background. The same file in every LSH course repo; change it in all of them. */
(function(){
  "use strict";
  var IDLE_MS = 8 * 3600e3, EVERY_MS = 10 * 60e3, LEGACY_MS = 13 * 3600e3;
  var SHAPE = /^[at]\.[^.]+\.\d{12,14}\.[A-Za-z0-9_-]{20,}$/;
  function left(t){ var p = String(t || "").split("."); return p.length === 4 ? Number(p[2]) - Date.now() : 0; }
  // a stored token that has run out: dropped before the page reads it
  [function(){ return window.localStorage; }, function(){ return window.sessionStorage; }].forEach(function(get){
    try{
      var s = get(), gone = [];
      for(var i = 0; i < s.length; i++){ var k = s.key(i), v = s.getItem(k); if(v && SHAPE.test(v) && left(v) <= 30000) gone.push(k); }
      gone.forEach(function(k){ s.removeItem(k); });
    }catch(e){}
  });
  var busy = false;
  async function renew(){
    if(busy || document.visibilityState === "hidden") return;
    var st; try{ st = window.state || (typeof state !== "undefined" ? state : null); }catch(e){ st = null; }
    if(!st) return;
    busy = true;
    try{
      var pairs = [["adminToken", typeof setAdminToken === "function" ? setAdminToken : null], ["authToken", typeof setTraineeToken === "function" ? setTraineeToken : null]];
      for(var i = 0; i < pairs.length; i++){
        var k = pairs[i][0], set = pairs[i][1], t = st[k], l = left(t);
        // run out (never renewed), renewed in the last 10 minutes, or no way to keep the new one: nothing to do.
        // A token from before the 8-hour rule (12 hours or 30 days) is renewed into an 8-hour one.
        if(!set || !SHAPE.test(String(t || "")) || l <= 30000 || (l > IDLE_MS - EVERY_MS && l < LEGACY_MS)) continue;
        try{
          var r = await fetch("/api/auth/refresh", {method: "POST", headers: {"Content-Type": "application/json", "Authorization": "Bearer " + t}, body: "{}"});
          var j = r.ok ? await r.json() : {};
          if(j && j.token && st[k] === t) set(j.token);
        }catch(e){}
      }
    }finally{ busy = false; }
  }
  setInterval(renew, 60e3);
  setTimeout(renew, 5000);
  document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "visible") renew(); });
  window.lshSessionRenew = renew;
})();
