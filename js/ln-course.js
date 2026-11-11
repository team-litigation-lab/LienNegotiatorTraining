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
          link: "https://drive.google.com/file/d/1sUjQCpEqkrvf802Ck23aajx4Z2ox8zgE/view" },
        { id: "d2-lab", kind: "lab", stage: "day2", title: "Your Case: the Release, the Initial Net Sheet and the Reduction Request", label: "Case Activity",
          note: "You're assigned a settled case. Download the Settlement Release(s) and handle the process from there: email the release(s) to your trainer, who sends back the fully executed release. Once it's in, draft the initial Net Sheet, up to the point where you'll send the Reduction Request." }
      ]
    },
    {
      day: 3,
      title: "Process Questions, Live Demo & Shadowing",
      theme: "Releases, Net Sheets & Closing Statements",
      icon: "🧾",
      objectives: [
        "Explain the Lien Negotiator's part in the post-settlement process, and how they work with attorneys, clients and providers",
        "Tell statutory, contractual and medical provider liens apart, and what each means legally",
        "Know the documents a case needs, from a simple case to one with third-party liens, child support and extensive treatment",
        "Build a persuasive medical bill reduction request: what providers weigh, and the documentation that moves them",
        "Explain a settlement release, what the client waives, and why the terms are reviewed with the client",
        "Draft the net sheet and the closing statement, and make them match exactly",
        "Draft and send a reduction request, the closing statement and the settlement release, under the firm's naming conventions",
        "Hold the ethical line on pressuring a client to accept a settlement"
      ],
      topics: [
        { h: "Digital Handouts: Required Documents, Settlement Resistance, Settlement Release, Net Sheet, Closing Statement" },
        { h: "Answering Process Questions (individual activity)" },
        { h: "Exercise" },
        { h: "Live Demo: Drafting and Sending the Reduction Request and the Closing Statement" },
        { h: "Demo Guide: Naming Conventions, Subject Lines and Letter Templates" },
        { h: "Shadowing and Training Video Viewing" },
        { h: "Materials for Additional Reference" }
      ],
      // Shown only to a trainer (in the side panel of the step it belongs to, by module id, or "agenda").
      trainerNotes: {
        "agenda": ["AM: Answering Process Questions, then the Live Demo after the discussion. PM: Shadowing and Training Video Viewing, then Free Communication Upskill for 1 to 1½ hours."],
        "d3-questions": [
          "If time is limited, use only the five ★ Core questions.",
          "After the discussion, send these materials in the training GC: https://drive.google.com/drive/folders/16YmI2zIJYxqbAeyYIaTxzYSapTv7ukz-",
          "Discussion folder: https://drive.google.com/drive/folders/1sQRjiWureRoEK1eyS2t6rG5SCb91QL2w"
        ],
        "d3-demo": ["Send the Demo Guide's reminders and instructions in the training GC, with the two folders (reference materials, and the completed sample outputs)."],
        "d3-v-reduction": ["Communicate with the shadow buddy and give them the list of attendees, with the number of Filipino and Latin American trainees. Remind trainees in the training GC of their shadowing time and to set To-Do: Shadowing Lien Negotiator Role (Mario). If no shadowing buddy is available, these recorded shadowing videos stand in for it."],
        "done": [
          "Facilitator's Reference for the Demo (Reduction Request, Settlement Release Forms and Closing Statement). Activity 1.1, Francesse: https://drive.google.com/file/d/1Mtwe--GLG9DbvXzVCMFICvC5mzEVmm6d/view · Activity 1.2, La'norris: https://drive.google.com/file/d/1Vnlead_ANzvmm2XjF0H-cIR6-oBqsBv7/view",
          "Materials for the demo: https://drive.google.com/drive/folders/1sljuF-iV-HRf_i7hLcck8iNBq6TnfHES",
          "The demo answer keys are not on this page (it is public). Keep them with the trainers."
        ]
      },
      modules: [
        { id: "d3-handouts", kind: "files", title: "Digital Handouts", label: "Digital Handouts", group: "AM · Answering Process Questions",
          note: "Individual activity: read these before you answer the process questions.",
          items: [
            { title: "Required Documents", link: "https://drive.google.com/file/d/1StatfcTr35aMbYdM6_rSTLlSa-spKuz5/view" },
            { title: "Settlement Resistance", link: "https://drive.google.com/file/d/1jBDzp-duJfdKEaCwN8FLQbXGI63cHpk5/view" },
            { title: "Settlement Release", link: "https://drive.google.com/file/d/1jGDi755qwt8voha7AQbcPHjDFiuAC8Du/view" },
            { title: "Net Sheet", link: "https://drive.google.com/file/d/1DoNix0hVil6jPpcPQoiuOd8D4ZhGZ4fC/view" },
            { title: "Closing Statement", link: "https://drive.google.com/file/d/1Mj926nXo1mZoRFFuhfeGdD8xROHX0j4H/view" }
          ] },
        { id: "d3-questions", kind: "questions", title: "Process Questions", label: "Process Questions", group: "AM · Answering Process Questions",
          naming: "Lien_Negotiator_Process_Questions_Answers (your name)",
          // core: the five the facilitator uses when time is limited.
          questions: [
            { q: "Analyze the specific responsibilities of a lien negotiator in relation to the post-settlement process. How do they interact with attorneys, clients, and providers?", core: true },
            { q: "Analyze the difference between statutory, contractual, and medical provider liens. What are the legal implications of each?" },
            { q: "Compare the documentation required for a simple case with one that includes third-party liens, child support obligations, and extensive treatment." },
            { q: "Analyze the typical factors providers consider when agreeing to a medical bill reduction (e.g., settlement amount, client hardship).", core: true },
            { q: "Assess how persuasive documentation (e.g., settlement amount, lien summary, client hardship letter) influences negotiation outcomes.", core: true },
            { q: "Analyze the purpose of a settlement release and its binding nature once signed. What rights does the client waive?" },
            { q: "Evaluate the importance of reviewing the release terms with the client. What issues could arise if the client signs without understanding?" },
            { q: "Analyze how the closing statement reflects the full financial breakdown of a personal injury case.", core: true },
            { q: "Evaluate the role of transparency in the closing statement. How does it support trust and prevent disputes?" },
            { q: "Analyze the net sheet's function in summarizing what the client will receive after deductions. Why must it match the closing statement exactly?", core: true },
            { q: "Judge whether the net sheet should be presented before or after lien negotiations are finalized and why." },
            { q: "Assess whether it's appropriate for the legal team to pressure clients to accept settlements. Where is the ethical boundary?" }
          ] },
        { id: "d3-exercise", kind: "deck", title: "Exercise", label: "Exercise", group: "AM · Answering Process Questions",
          link: "https://www.canva.com/design/DAGva6b4Q_Q/sJk9AIQaiwaxO__NlgPplA/view" },
        { id: "d3-demo", kind: "video", title: "Drafting and Sending Reduction Request and Closing Statement", label: "Live Demo", group: "Live Demo · Tutorial Demo Recording",
          note: "While you review this recording to prepare for your Lien Negotiator demo, keep the Demo Guide's reference materials open: they are the ones used in the sample demo.",
          link: "https://drive.google.com/file/d/1EcVjtKuR-cYQ-K3QomaADzBiJ05Apu6X/view" },
        { id: "d3-guide", kind: "guide", title: "Demo Guide", label: "Demo Guide", group: "Live Demo · Reference",
          sections: [
            { h: "Reference materials", links: [
              { t: "📁 Demo Reference Materials", u: "https://drive.google.com/drive/folders/1mWDS1zvxFk09QQZcuT-txI_lNk0N_ebB" },
              { t: "📁 Completed Net Sheet, Reduction Request Letter & Closing Statement (sample demo output)", u: "https://drive.google.com/drive/folders/1d7O-IOP6fVJu8rC08V4INEmJKlV3ocCf" },
              { t: "🔎 NPI lookup: npino.com", u: "https://npino.com/" },
              { t: "🔎 Alternative: npidb.org", u: "https://npidb.org/" }
            ], p: "For medical providers that are not easily identifiable, use Google search or the National Provider Identifier (NPI) lookup sites." },
            { h: "First half: Initial Net Sheet Drafting and Medical Reduction Request", rows: [
              ["Naming convention", "MED - Provider's name - Reduction Request (your first name only)"],
              ["Example", "MED - Medview Inc. - Reduction Request (Michelle)"],
              ["Subject line", "Type of Request | LAST NAME, FIRST NAME of the client"],
              ["Example", "Billing Reduction Request | DOE, JOHN TEST"]
            ], pre: "Good day!\n\nWe would like to take this opportunity to thank you for the excellent medical care and treatment provided to our client- LAST NAME, FIRST NAME of the client - DOL mm/dd/yyyy. At this time, we are asking for your assistance in helping us reduce their bill. Kindly see the attached bill reduction request for our client.\n\nIf you have any questions, please do not hesitate to contact us.\n\nHoping for your kind consideration. Thank you.\n\nBest regards,\n[complete name of the VA]\nLien Negotiator\n[work email add]\n[office phone #]",
              example: "Good day!\n\nWe would like to take this opportunity to thank you for the excellent medical care and treatment provided to our client, PETIT PAPA, FRANCESSE - DOL 01/23/2023.\n\nAt this time, we are requesting your assistance in reducing their bill. Please see the attached bill reduction request for our client.\n\nIf you have any questions, please do not hesitate to contact us.\n\nWe appreciate your kind consideration and thank you in advance.\n\nBest Regards,\n[Your complete name]\nLien Negotiator\n[your work email]\nPhone Number: [office phone #]" },
            { h: "Second half: Final Net Sheet Drafting and Closing Statement Drafting", rows: [
              ["Naming convention", "Client's Name – Closing Statement (your name)"],
              ["Two types of settlement", "Name each Settlement Release Form by its type: Client's Name – Settlement Release Form BI · Client's Name – Settlement Release Form UM"],
              ["Subject line", "LAST NAME, FIRST NAME of the client - Closing Statement and Settlement Release Form/s"],
              ["Example", "DOE, JOHN TEST - Closing Statement and Settlement Release Form/s"]
            ], pre: "Good day!\n\nCongratulations on your case settlement! I hope this message finds you well. Please find attached your closing statement and settlement release for your review and signature. Kindly review the documents, sign them, and return them to me once completed.\n\nIf you have any questions, please feel free to reach out.\n\nThank you for your prompt attention.\n\nBest regards," }
          ] },
        { id: "d3-lab", kind: "lab", stage: "day3", title: "Your Case: Updated Bills, Reductions and the Closing Statement", label: "Case Activity", group: "Live Demo · Your Case",
          note: "Continue your case, step by step, just like the demo: request updated bills and payoffs where the file is out of date (the provider sends the corrected bill), send your Reduction Requests, finalize the Net Sheet, draft the Closing Statement, and send it with the Settlement Release Form(s) to the client." },
        { id: "d3-v-reduction", kind: "video", title: "Reduction & Disbursement Training", label: "Training Video", group: "PM · Shadowing and Training Video Viewing",
          link: "https://drive.google.com/file/d/1rv1Vwatczu3JVegzpEA_pAMxwXsO0EIl/view" },
        { id: "d3-v-recording", kind: "video", title: "Lien Negotiator Recording", label: "Training Video", group: "PM · Shadowing and Training Video Viewing",
          link: "https://drive.google.com/file/d/1stDohvUe3okRlq7HB8qU5uTfgD6e3I6h/view" },
        { id: "d3-v-kenneth27", kind: "video", title: "Kenneth, September 27", label: "Shadowing Video", group: "PM · Shadowing and Training Video Viewing",
          link: "https://drive.google.com/file/d/1q0J7C0Fz1G7OsPooJLK_1bRg8VaHl-6p/view" },
        { id: "d3-r-kenneth28", kind: "video", title: "Kenneth, September 28", label: "Shadowing Video", group: "Materials for Additional Reference",
          link: "https://drive.google.com/file/d/16VEGXqkzxDVLcwadQXNbfWhUPicZweHP/view" },
        { id: "d3-r-discussion", kind: "video", title: "Discussion with Kenneth", label: "Shadowing Video", group: "Materials for Additional Reference",
          link: "https://drive.google.com/file/d/1CMfB9tqOFrWamJfm-VZGtRX8wELiWXFa/view" },
        { id: "d3-r-gilda", kind: "video", title: "Lien Negotiator Recording of Gilda Marie Anagap", label: "Shadowing Video", group: "Materials for Additional Reference",
          link: "https://drive.google.com/file/d/1stDohvUe3okRlq7HB8qU5uTfgD6e3I6h/view" },
        { id: "d3-r-bill", kind: "video", title: "Bill, August 25, with William Allanigue (more in Tagalog)", label: "Shadowing Video", group: "Materials for Additional Reference",
          link: "https://drive.google.com/file/d/1Nq9oXyPmxcll2Yob4PKz3MZ4yNvGCTUh/view" }
      ],
      // The Day Complete step's "Before you go".
      wrapUp: {
        h: "Next: Litigation Training",
        p: "Free Communication Upskill for 1 to 1½ hours. Then, before you request your new role, save every link and material you'll need: once Sir Matt approves the request, you are removed from this GC.",
        steps: [
          "Go to the #set-up-guide channel and select your role: ADVANCED TRAINING.",
          "Go to the #training-reaction-roles channel, where the role selection options are.",
          "Click the first option, the LSH BOT, to choose your training channel.",
          "Select \"Litigation Training\". This sends a request to be added to the Litigation Training group.",
          "Wait for approval. Once Sir Matt approves it, you're added to the Litigation Training GC automatically.",
          "From then on there's no need to clock in or stamp your auxes here: you'll do that in your Litigation Training GC from tomorrow."
        ],
        note: "Check your calendar regularly for your scheduled demo, starting tomorrow. If you don't see your schedule, follow up."
      }
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
