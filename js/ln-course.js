/* ============================================================
   📚 The Lien Negotiator course, in the CM course's format:
   the dashboard's Day cards → a day's Objectives page (what the trainee
   will be able to do, and the day's outline) → the day's steps, one at a
   time: the Training Agenda, then each module, then Day complete.
   This is the one place the course content is written down.

   day        — the day's number. Progress is saved against it (the trainee
                record's dayProgress[<day>], which the Portal reads), so never
                renumber a day.
   title      — the day's title (the Day card's head, the day's pages).
   theme      — the short theme on the Day card's pill and the agenda.
   objectives — "By the end of today you'll be able to …".
   topics     — the day's outline, in deck order, with the slides each covers.
   modules    — the day's modules, in order. Each has a stable id (progress is
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
   A module is complete when the trainee moves on from it (Next), and the day
   when they finish its last step.

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
      theme: "Liens, Lien Holders & Reductions",
      icon: "⚖️",
      objectives: [
        "Explain what a lien is and why it is paid from the settlement before the client",
        "Name every possible lien holder and what each wants reimbursed",
        "Identify liens from intake: health insurance, Medicare, Medicaid, VA, Workers' Compensation and Child Support",
        "Spot pre-settlement funding, third-party funding and prior attorney liens",
        "Know when lien negotiation starts and what it does for the client's net recovery",
        "Tell subrogation from a reduction",
        "Work the eight steps from identifying third-party payors to closing out the file",
        "Request a medical bill reduction, with the price comparison and a sample request"
      ],
      topics: [
        { h: "What Are Liens?", slides: "2–3" },
        { h: "Possible Lien Holders", slides: "4" },
        { h: "How to Identify Liens: Health Insurance, Medicare, Medicaid & VA", slides: "5–7" },
        { h: "How to Identify Liens: Workers' Compensation & Child Support", slides: "8–9" },
        { h: "How to Identify Liens: Funding Companies & Prior Attorneys", slides: "10–12" },
        { h: "Lien Negotiation", slides: "13–17" },
        { h: "Subrogation and Reduction", slides: "18–19" },
        { h: "The Eight Steps: Third-Party Payors to Close-Out", slides: "20–27" },
        { h: "Medical Bill Reductions", slides: "28–32" }
      ],
      modules: [
        { id: "d1-deck", kind: "deck", title: "The Lien Negotiator Role, Pt. 1", slides: 34,
          link: "https://www.canva.com/design/DAGthtOQUg4/8AoCnBiC8yWJGOM_zLUXjg/view" },
        { id: "d1-video", kind: "video", title: "The Lien Negotiator Role, Pt. 1",
          link: "https://drive.google.com/file/d/1rmdqifC5m_3c9FYDZkrzsUampVKmUMaY/view" }
      ]
    },
    {
      day: 2,
      title: "The Lien Negotiator Role, Pt. 2",
      theme: "ERISA & Government Plan Liens",
      icon: "🤝",
      objectives: [
        "Explain why ERISA liens are different, and where the Made Whole and Common Fund doctrines stop",
        "Tell a self-funded ERISA plan from a fully insured one",
        "Confirm an ERISA lien with the spotting checklist and the six-step verification flowchart",
        "Recognize TPAs, ASO carriers and recovery vendors on EOBs, liens and subrogation letters",
        "Negotiate an ERISA reduction, and escalate a denial step by step",
        "Follow the ERISA do's and don'ts and each role's part in the workflow",
        "Work Medicare, Medicaid, VA and TRICARE liens step by step"
      ],
      topics: [
        { h: "ERISA Liens: the Basics", slides: "1–6" },
        { h: "Identifying and Confirming ERISA Liens", slides: "7–10" },
        { h: "The ERISA Verification Flowchart", slides: "11–20" },
        { h: "How Plans and Vendors Appear on EOBs, Liens & Letters", slides: "21–30" },
        { h: "ERISA Negotiation Strategy & Escalating a Denial", slides: "31–39" },
        { h: "The ERISA Workflow, Do's and Don'ts, and Roles", slides: "40–43" },
        { h: "Cheat Sheets & Key Takeaways", slides: "44–52" },
        { h: "Samples: Reduction Form, Final Lien & Medical Benefit", slides: "53–56" },
        { h: "Medicare, Medicaid, VA & TRICARE Lien Workflows", slides: "57–66" },
        { h: "Samples: TRICARE, VA Lien Discovery & the Subrogation Lien Packet", slides: "67–72" }
      ],
      modules: [
        { id: "d2-deck", kind: "deck", title: "The Lien Negotiator Role, Pt. 2", slides: 72,
          link: "https://www.canva.com/design/DAHabx7BhKE/BPidIfAISKJuol56ntSmZg/view" },
        { id: "d2-video", kind: "video", title: "The Lien Negotiator Role, Pt. 2",
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
