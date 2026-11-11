/* ============================================================
   📚 The Lien Negotiator course: its days, and each day's modules, in order.
   The same shape as the CM course: the dashboard shows one Day card per day,
   and a day opens onto its modules. This is the one place the course content
   is written down.

   day      — the day's number. Progress is saved against it (the trainee
              record's dayProgress[<day>], which the Portal reads), so never
              renumber a day.
   modules  — the day's modules, in order. Each has a stable id (progress is
              saved against it too) and is one of:
                kind "deck"  — a Canva deck. link: the Canva view link
                               (canva.com/design/<id>/<token>/view); the page
                               embeds it as …/view?embed, so trainees see the
                               slides, never the editor.
                kind "video" — a recorded session on Google Drive. link: the
                               file link (drive.google.com/file/d/<id>/view);
                               the page embeds it as …/preview. The file must
                               be shared with whoever takes the course (the
                               legalsupporthelp.com Workspace, or anyone with
                               the link), or the player asks them to sign in.
   A day is complete when every one of its modules is.

   An admin can replace a module's address without a deploy: Admin → Course
   links (stored in settings:course by module id; an empty box goes back to
   this file).
   ============================================================ */
window.LN_COURSE = {
  title: "Lien Negotiator Training",
  days: [
    {
      day: 1,
      title: "The Lien Negotiator Role, Pt. 1",
      icon: "⚖️",
      theme: "What a Lien Negotiator does, where the role sits in the case, and the groundwork for every negotiation.",
      modules: [
        { id: "d1-deck", kind: "deck", title: "The Lien Negotiator Role, Pt. 1: Slides", slides: 34,
          link: "https://www.canva.com/design/DAGthtOQUg4/8AoCnBiC8yWJGOM_zLUXjg/view" },
        { id: "d1-video", kind: "video", title: "The Lien Negotiator Role, Pt. 1: Recorded Session",
          link: "https://drive.google.com/file/d/1rmdqifC5m_3c9FYDZkrzsUampVKmUMaY/view" }
      ]
    },
    {
      day: 2,
      title: "The Lien Negotiator Role, Pt. 2",
      icon: "🤝",
      theme: "Lien types in depth, starting with ERISA liens: the basics, the process and the key risks.",
      modules: [
        { id: "d2-deck", kind: "deck", title: "The Lien Negotiator Role, Pt. 2: Slides", slides: 72,
          link: "https://www.canva.com/design/DAHabx7BhKE/BPidIfAISKJuol56ntSmZg/view" },
        { id: "d2-video", kind: "video", title: "The Lien Negotiator Role, Pt. 2: Recorded Session",
          link: "https://drive.google.com/file/d/1sUjQCpEqkrvf802Ck23aajx4Z2ox8zgE/view" }
      ]
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
  // The embed address for a module of either kind, and the page "Open in a new tab" goes to (the viewer, never the Canva editor).
  embed: function(kind, link){ return kind === "video" ? this.video(link) : this.deck(link); },
  page: function(kind, link){ var e = this.embed(kind, link); return kind === "video" ? e.replace(/\/preview$/, "/view") : e.replace(/\?embed$/, ""); }
};
