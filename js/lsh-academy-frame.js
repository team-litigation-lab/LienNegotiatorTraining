/* ============================================================
   🟨 LSH lesson cards framed as on the LSH Academy Index: the same file in every LSH course repo (Case-Management-Training,
   EA-PA-TRAINING, propertydamageclaimstraining, medsumanddemandtraining, LienNegotiatorTraining; the Foundational
   Training draws the same frame in its js/lsh-dashboard.js). Change it in all of them.
   The Academy Index's card (Training-Portal programs.html #idx-topics .topic-card) is the standard: a thick rounded frame,
   navy along the top fading to gold at the bottom (#1E2340 → #2c3360 → #a8692f → #DB8437), on a white card. Each lesson
   card on the dashboard takes it: the gradient painted under the card's frame (border-box), the white face over it
   (padding-box). Only the frame and the face: the card's header, its buttons and their rows stay as each course has them.
   Loaded after js/lsh-card-frame.js and the course's own card files.
   ============================================================ */
(function(){
  if(document.getElementById("lsh-academy-frame")) return;
  const GOLD = "linear-gradient(180deg, #1E2340 0%, #2c3360 30%, #a8692f 78%, #DB8437 100%)";
  const st = document.createElement("style"); st.id = "lsh-academy-frame"; st.textContent = `
body .dash-main .module-card.module-card.module-card,
body .module-card.day-card.day-card{border-style:solid !important;border-width:6px !important;border-color:transparent !important;border-radius:22px !important;
  background:linear-gradient(#fff, #fff) padding-box, ${GOLD} border-box !important;background-color:#fff !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important;
  box-shadow:0 16px 30px -16px rgba(30,35,64,.45), 0 4px 10px -6px rgba(30,35,64,.2) !important;}
body .dash-main .module-card.module-card.module-card:hover,
body .module-card.day-card.day-card:hover{filter:saturate(1.08);}
`; document.head.appendChild(st);
})();
