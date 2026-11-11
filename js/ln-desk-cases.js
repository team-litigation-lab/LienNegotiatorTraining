/* ============================================================
   🗂 The Lien Desk's practice cases (js/ln-desk.js plays them).
   Every case is one settled personal injury file at LSH Law Firm, worked
   from the settlement release to the signed closing statement, the way the
   Day 3 demo does it: the release round-trip, the initial Net Sheet, updated
   bills, reduction requests, the final Net Sheet, the closing statement, and
   sending it to the client.

   All names, addresses, numbers and email addresses are made up for
   training. Email addresses end in .example so nothing can ever be sent.

   A case:
     id, client {first, last, dob, phone, email, address}, dol, caseNo, facts, injury
     settlements  [{type "BI" | "UM", carrier, insured, claimNo, amount, date, adjuster}]
     fee          {pct: "33⅓%" | "40%", why}            the retainer's tier
     costs        [{label, amount}]                       receipted case expenses
     pip          {carrier, limit, payments [{to, date, amount}]} or null
     payees       the Medical Provider Ledger, in order. Each:
                    id, type, name, email, address, dos, lines [{date, code, desc, amount}]
                    pip      paid by PIP (on the PIP log)
                    health   paid by health insurance
                    adj      contractual write-offs
                    onFile   {asOf, pip, health, adj} what the bill ON FILE shows, when it is out of date
                             (the corrected bill shows the real figures above). Leave it out when the bill is current.
                    reduce   {floor, policy}  the least the payee accepts, and how it answers a request
                             (floor = null: the payee does not reduce, e.g. a statutory or funding lien)
                    lien     true for a lienholder that isn't a treating provider. Every case has at least two:
                             a health subrogation lien (the client's health plan, which paid some of the care; plan says
                             whether it is ERISA self-funded or fully insured) and a pre-settlement funding lien (the
                             payoff on file is out of date: onFile {asOf, amount}; funding companies do not reduce).
                    amount   for a lienholder: the lien or payoff amount now (what the corrected letter shows)
                    notice   for a lienholder: its lien letter's text
                    reduce.policy  "zero"     a provider whose balance is $0.00 (paid by health insurance): nothing to request
                                   "contract" a funding company: the payoff is contractual, it won't reduce
                                   "statute"  a statutory lien (child support): paid in full
                    onFile.extraLines   a provider bill on file with lines the corrected bill takes out (a duplicate,
                                        a pre-accident visit, an unrelated charge)
                    onFile.extra        a health lien itemization on file with unrelated charges ({date, desc, amount});
                                        its onFile.amount includes them, and the updated itemization drops them
     settlements[].note  anything else the settlement letter says (e.g. property damage paid separately)
     challenges   what the trainee has to catch (shown to a trainer only)
   ============================================================ */
window.LN_FIRM = {
  name: "LSH Law Firm",
  address: "4100 Legacy Drive, Suite 300 · Plano, TX 75024",
  phone: "(972) 555-0140",
  email: "lienteam@lshlawfirm.example",
  attorney: "Elijah Thorne, Esq.",
  trainer: { name: "Training Desk (your trainer)", email: "training@lshlawfirm.example" }
};

window.LN_CASES = [
  {
    id: "miller",
    client: { first: "Sarah", last: "Miller", dob: "06/14/1996", phone: "(214) 555-0187", email: "sarah.miller@mail.example", address: "2218 Juniper Lane, Dallas, TX 75204" },
    dol: "03/10/2026", caseNo: "LSH-2026-MVA-310418",
    facts: "Rear-end collision at a red light. Low property damage ($1,200).",
    injury: "Whiplash (Grade II), persistent headaches, cervical strain.",
    settlements: [
      { type: "BI", carrier: "Aggressive Casualty Insurance Co.", insured: "Brent Holloway", claimNo: "AC-26-0457719", amount: 25000, date: "09/18/2026", adjuster: "Monica Reyes" }
    ],
    fee: { pct: "33⅓%", why: "Settled before suit: the retainer's pre-suit tier." },
    costs: [
      { label: "Police report", amount: 25 },
      { label: "Medical records & billing requests", amount: 145.5 },
      { label: "Postage & certified mail", amount: 38.2 }
    ],
    pip: { carrier: "State Shield Insurance (first party)", limit: 2500, payments: [
      { to: "Mercy General Hospital — Emergency Dept.", date: "05/02/2026", amount: 2500 }
    ] },
    payees: [
      { id: "mercy", type: "Emergency room", name: "Mercy General Hospital — Emergency Dept.", email: "billing@mercygeneral.example",
        address: "1500 Main Street, Dallas, TX 75201", dos: "03/10/2026",
        lines: [
          { date: "03/10/2026", code: "99284", desc: "ED visit, high severity", amount: 2150 },
          { date: "03/10/2026", code: "72040", desc: "X-ray, cervical spine, 2–3 views", amount: 640 },
          { date: "03/10/2026", code: "70450", desc: "CT head without contrast", amount: 1860 },
          { date: "03/10/2026", code: "J1885", desc: "Ketorolac injection", amount: 200 }
        ],
        pip: 2500, health: 0, adj: 0,
        onFile: { asOf: "04/12/2026", pip: 0, health: 0, adj: 0 },
        reduce: { floor: 1762.5 } },
      { id: "align", type: "Chiropractic (LOP)", name: "Align Chiropractic & Wellness", email: "accounts@alignchiro.example",
        address: "8800 Preston Road, Suite 120, Dallas, TX 75225", dos: "03/14/2026 – 06/26/2026",
        lines: [
          { date: "03/14/2026", code: "99203", desc: "New patient exam", amount: 240 },
          { date: "03/16/2026 – 06/26/2026", code: "98941 ×23", desc: "Chiropractic manipulation, 3–4 regions (23 visits × $160)", amount: 3680 },
          { date: "03/16/2026 – 06/26/2026", code: "97140 ×10", desc: "Manual therapy (10 units × $40)", amount: 400 }
        ],
        pip: 0, health: 0, adj: 0, reduce: { floor: 2880 } },
      { id: "clearview", type: "MRI (LOP)", name: "Clearview Imaging Center", email: "billing@clearviewimaging.example",
        address: "4120 Lemmon Avenue, Dallas, TX 75219", dos: "04/22/2026",
        lines: [{ date: "04/22/2026", code: "72141", desc: "MRI cervical spine without contrast", amount: 1850 }],
        pip: 0, health: 0, adj: 0, reduce: { floor: 1295 } },
      { id: "northside", type: "Physical therapy (health insurance)", name: "Northside Physical Therapy", email: "billing@northsidept.example",
        address: "6300 Greenville Avenue, Dallas, TX 75206", dos: "07/06/2026 – 08/14/2026",
        lines: [
          { date: "07/06/2026", code: "97161", desc: "PT evaluation, low complexity", amount: 260 },
          { date: "07/08/2026 – 08/14/2026", code: "97110 ×12", desc: "Therapeutic exercise (12 visits × $95)", amount: 1140 },
          { date: "07/08/2026 – 08/14/2026", code: "97140 ×5", desc: "Manual therapy (5 units × $40)", amount: 200 }
        ],
        pip: 0, health: 960, adj: 640, reduce: { floor: null, policy: "zero" } },
      { id: "bluehorizon", type: "Health subrogation lien", lien: true, name: "Blue Horizon Health Plan — Subrogation & Recovery", email: "recovery@bluehorizonhealth.example",
        address: "PO Box 81920, Austin, TX 78708", amount: 960,
        plan: "Fully insured group plan through Sarah's employer (Lakeshore Dental Group). Not self-funded: Texas law, so the common-fund (procurement cost) reduction applies.",
        notice: "Blue Horizon Health Plan paid $960.00 toward medical care related to the 03/10/2026 accident (Northside Physical Therapy, 07/06/2026 – 08/14/2026) and asserts its right of reimbursement from any recovery under the member's plan.",
        reduce: { floor: 640, why: "Pro-rata procurement costs: the plan's share of the one-third fee, $320.00, off $960.00." } },
      { id: "summit", type: "Pre-settlement funding", lien: true, name: "Summit Legal Funding, LLC", email: "payoffs@summitlegalfunding.example",
        address: "2000 McKinney Avenue, Suite 900, Dallas, TX 75201", amount: 2235,
        onFile: { asOf: "09/30/2026", amount: 2145 },
        notice: "Summit Legal Funding advanced $1,500.00 to Sarah Miller on 05/20/2026 against the recovery in this matter. The payoff grows monthly under the funding agreement; a payoff figure is good only through the date stated on it.",
        reduce: { floor: null, policy: "contract" } }
    ],
    challenges: [
      "Mercy General's statement on file (as of 04/12/2026) predates State Shield's $2,500.00 PIP payment (05/02/2026, on the PIP log). Request an updated bill: the corrected statement shows a $2,350.00 balance.",
      "PIP is not a lien and not recovery: it appears only as a payment on the ER's ledger row.",
      "Northside PT was paid by Blue Horizon ($960.00) with a $640.00 contractual write-off: its balance is $0.00 and it is not a payee. The $960.00 comes back as Blue Horizon's health subrogation lien.",
      "Blue Horizon is a fully insured plan (not ERISA self-funded), so the procurement-cost reduction applies: $960.00 less one-third = $640.00.",
      "Summit Legal Funding's payoff on file is good only through 09/30/2026 ($2,145.00). Request an updated payoff: $2,235.00 through the disbursement date. Funding companies don't reduce.",
      "The LOP providers reduce: Mercy General accepts $1,762.50 (25% off its corrected balance), Align $2,880.00, Clearview $1,295.00."
    ]
  }
];
