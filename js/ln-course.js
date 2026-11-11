/* ============================================================
   📚 The Lien Negotiator course: its modules, in order.
   Each module is a Canva deck and its recorded session (a Google Drive
   video). This is the one place the course content is written down:
   add a module by adding an entry here (keep the ids stable: progress is
   saved against them, and the Portal reads dayProgress[<day>]).

   deck  — the Canva share link (canva.link/… or canva.com/design/…). The page
           embeds it as …/view?embed, so trainees see the slides, never the
           editor.
   video — the Google Drive share link (drive.google.com/file/d/<id>/…). The
           page embeds it as …/preview. The file must be shared with whoever
           takes the course (the legalsupporthelp.com Workspace, or anyone
           with the link), or the player asks them to sign in.

   An admin can replace either address without a deploy: Admin → Course
   links (stored in settings:course; an empty box goes back to this file).
   ============================================================ */
window.LN_COURSE = {
  title: "Lien Negotiator Training",
  modules: [
    {
      id: "ln1",
      day: 1,
      part: "Part 1",
      title: "The Lien Negotiator Role, Pt. 1",
      icon: "⚖️",
      summary: "What a Lien Negotiator does, where the role sits in the case, and the groundwork for every negotiation.",
      deck: "https://www.canva.com/design/DAGthtOQUg4/8AoCnBiC8yWJGOM_zLUXjg/view",
      deckSlides: 34,
      video: "https://drive.google.com/file/d/1rmdqifC5m_3c9FYDZkrzsUampVKmUMaY/view"
    },
    {
      id: "ln2",
      day: 2,
      part: "Part 2",
      title: "The Lien Negotiator Role, Pt. 2",
      icon: "🤝",
      summary: "Lien types in depth, starting with ERISA liens: the basics, the process and the key risks.",
      deck: "https://www.canva.com/design/DAHabx7BhKE/BPidIfAISKJuol56ntSmZg/view",
      deckSlides: 72,
      video: "https://drive.google.com/file/d/1sUjQCpEqkrvf802Ck23aajx4Z2ox8zgE/view"
    }
  ]
};

/* The embeddable address for a share link. Returns "" for anything that isn't
   a Canva design or a Drive file, so a typo never puts a stranger's page in the frame. */
window.lnEmbed = {
  deck: function(link){
    var m = /^https:\/\/(?:www\.)?canva\.com\/design\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)/.exec(String(link || "").trim());
    return m ? "https://www.canva.com/design/" + m[1] + "/" + m[2] + "/view?embed" : "";
  },
  video: function(link){
    var s = String(link || "").trim();
    var m = /^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/.exec(s) || /^https:\/\/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/.exec(s);
    return m ? "https://drive.google.com/file/d/" + m[1] + "/preview" : "";
  },
  // Where "Open in a new tab" goes: the viewer, never the Canva editor.
  deckPage: function(link){ var e = this.deck(link); return e ? e.replace(/\?embed$/, "") : ""; },
  videoPage: function(link){ var e = this.video(link); return e ? e.replace(/\/preview$/, "/view") : ""; }
};
