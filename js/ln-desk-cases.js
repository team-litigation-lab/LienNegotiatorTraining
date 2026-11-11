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
  },
  {
    id: "chen",
    client: { first: "David", last: "Chen", dob: "08/02/1973", phone: "(469) 555-0132", email: "david.chen@mail.example", address: "915 Willow Creek Drive, Richardson, TX 75080" },
    dol: "01/05/2026", caseNo: "LSH-2026-PED-105227",
    facts: "Struck in a crosswalk by a rideshare driver logged into the app without a passenger (period 1).",
    injury: "Tibial plateau fracture; ORIF surgery (plates and screws).",
    settlements: [
      { type: "BI", carrier: "Northstar Mutual (rideshare period-1 policy)", insured: "Marcus Bell", claimNo: "NM-26-118340", amount: 50000, date: "08/28/2026", adjuster: "Hannah Ostrowski", note: "Period 1 (app on, no passenger): the contingent liability limit of $50,000 per person applies." },
      { type: "UM", carrier: "Pacific Crest Insurance", insured: "David Chen (own UIM policy)", claimNo: "PC-UIM-26-04471", amount: 30000, date: "09/24/2026", adjuster: "Luis Navarro" }
    ],
    fee: { pct: "33⅓%", why: "Both claims settled before suit: the pre-suit tier on the gross of both." },
    costs: [
      { label: "Police report", amount: 25 },
      { label: "Medical records & billing requests", amount: 312.4 },
      { label: "Orthopedic expert report", amount: 750 },
      { label: "Postage & certified mail", amount: 41.8 }
    ],
    pip: null,
    payees: [
      { id: "parkview", type: "Hospital (surgery)", name: "Parkview Regional Medical Center", email: "patientaccounts@parkviewregional.example",
        address: "3500 Gaston Avenue, Dallas, TX 75246", dos: "01/05/2026 – 01/08/2026",
        lines: [
          { date: "01/05/2026", code: "99285", desc: "ED visit, highest severity", amount: 3200 },
          { date: "01/06/2026", code: "27535", desc: "ORIF, tibial plateau fracture (facility)", amount: 38500 },
          { date: "01/05/2026 – 01/08/2026", code: "0120 ×3", desc: "Inpatient room & board (3 days × $3,200)", amount: 9600 }
        ],
        pip: 0, health: 18400, adj: 29100, reduce: { floor: 2850 } },
      { id: "trinity", type: "Orthopedic surgeon (LOP)", name: "Trinity Orthopedic Associates", email: "billing@trinityortho.example",
        address: "7777 Forest Lane, Suite B-200, Dallas, TX 75230", dos: "01/19/2026 – 06/15/2026",
        lines: [
          { date: "01/19/2026 – 05/11/2026", code: "99213 ×4", desc: "Post-op visits (4 × $250)", amount: 1000 },
          { date: "06/15/2026", code: "99214", desc: "Hardware removal consult", amount: 350 }
        ],
        onFile: { asOf: "07/02/2026", extraLines: [{ date: "02/16/2026", code: "99213", desc: "Post-op visit", amount: 250 }] },
        pip: 0, health: 0, adj: 0, reduce: { floor: 900 } },
      { id: "riverbend", type: "Physical therapy (health insurance)", name: "Riverbend Physical Therapy", email: "billing@riverbendpt.example",
        address: "1201 E. Campbell Road, Richardson, TX 75081", dos: "02/02/2026 – 05/29/2026",
        lines: [{ date: "02/02/2026 – 05/29/2026", code: "97110/97140", desc: "Therapeutic exercise & manual therapy (24 visits × $200)", amount: 4800 }],
        pip: 0, health: 2160, adj: 2640, reduce: { floor: null, policy: "zero" } },
      { id: "harborline", type: "Health subrogation lien", lien: true, name: "Harborline Logistics Employee Health Plan", email: "subrogation@harborlinebenefits.example",
        address: "c/o Meritline Recovery Services, PO Box 40291, Fort Worth, TX 76140", amount: 20560,
        plan: "Self-funded ERISA plan (Harborline Logistics, Inc., plan sponsor; Meritline is the third-party administrator). Federal law: the plan's reimbursement terms control, and the Texas common-fund and made-whole rules don't apply.",
        notice: "The Harborline Logistics Employee Health Plan paid $20,560.00 for injuries related to the 01/05/2026 accident (Parkview Regional $18,400.00; Riverbend Physical Therapy $2,160.00) and asserts its first-priority right of reimbursement under the plan document.",
        reduce: { floor: 18500, why: "A self-funded ERISA plan: no common-fund reduction. The plan administrator approved a discretionary reduction of about 10% for the client's limited recovery." } },
      { id: "liberty", type: "Pre-settlement funding", lien: true, name: "Liberty Bridge Funding", email: "payoffs@libertybridgefunding.example",
        address: "500 N. Akard Street, Suite 2400, Dallas, TX 75201", amount: 6480,
        onFile: { asOf: "08/31/2026", amount: 6120 },
        notice: "Liberty Bridge Funding advanced $4,000.00 to David Chen on 03/02/2026 against the recovery in this matter. Charges accrue monthly under the funding agreement; a payoff is good only through the date stated on it.",
        reduce: { floor: null, policy: "contract" } }
    ],
    challenges: [
      "Two settlements, two releases: Northstar BI $50,000.00 and Pacific Crest UIM $30,000.00. The gross is $80,000.00 and the fee one-third of it.",
      "Trinity's statement on file bills the 02/16/2026 post-op visit twice: the itemization shows five 99213 lines for four visits. Request a corrected bill ($1,350.00).",
      "Harborline is a self-funded ERISA plan: no common-fund reduction. It still approves $18,500.00 on a hardship request.",
      "Riverbend PT has a $0.00 balance (paid by the plan, written off): its $2,160.00 is inside Harborline's lien. Don't count it twice.",
      "Liberty Bridge's payoff on file expired 08/31/2026: the updated payoff is $6,480.00. Funding companies don't reduce."
    ]
  },
  {
    id: "rodriguez",
    client: { first: "Elena", last: "Rodriguez", dob: "11/19/1984", phone: "(972) 555-0164", email: "elena.rodriguez@mail.example", address: "4410 Cedar Springs Road, Apt 12, Dallas, TX 75219" },
    dol: "02/20/2026", caseNo: "LSH-2026-MVA-220513",
    facts: "5-car chain reaction on a foggy highway; client was Car #3. Car #5 is the primary tortfeasor with minimum limits ($25k).",
    injury: "Herniated discs at C4-C5 and C5-C6; spinal fusion recommended.",
    settlements: [
      { type: "BI", carrier: "Coastal Plains Casualty", insured: "Grant Weller (Car #5)", claimNo: "CPC-26-30982", amount: 25000, date: "08/14/2026", adjuster: "Renee Takahashi", note: "Tender of the $25,000 per-person policy limit." },
      { type: "UM", carrier: "Allied Heartland Insurance", insured: "Elena Rodriguez (own UIM policy)", claimNo: "AHI-UIM-26-7715", amount: 45000, date: "09/30/2026", adjuster: "Owen Fairbanks" }
    ],
    fee: { pct: "33⅓%", why: "Settled before suit: the pre-suit tier." },
    costs: [
      { label: "Crash report", amount: 25 },
      { label: "Medical records & billing requests", amount: 268 },
      { label: "MRI films on disc", amount: 25 },
      { label: "Accident reconstruction report", amount: 1200 },
      { label: "Postage & certified mail", amount: 52.6 }
    ],
    pip: null,
    payees: [
      { id: "cedarvalley", type: "Chiropractic (LOP)", name: "Cedar Valley Chiropractic", email: "billing@cedarvalleychiro.example",
        address: "2600 N. Haskell Avenue, Dallas, TX 75204", dos: "02/23/2026 – 07/17/2026",
        lines: [
          { date: "02/23/2026", code: "99204", desc: "New patient exam (post-accident)", amount: 300 },
          { date: "02/25/2026 – 07/17/2026", code: "98941 ×30", desc: "Chiropractic manipulation (30 visits × $170)", amount: 5100 }
        ],
        onFile: { asOf: "07/30/2026", extraLines: [{ date: "01/06/2026 – 02/10/2026", code: "98940 ×6", desc: "Chiropractic manipulation, shoulder (6 visits × $120)", amount: 720 }] },
        pip: 0, health: 0, adj: 0, reduce: { floor: 3600 } },
      { id: "lonestar", type: "Spine (LOP)", name: "Lone Star Spine Institute", email: "accounts@lonestarspine.example",
        address: "9301 N. Central Expressway, Suite 500, Dallas, TX 75231", dos: "04/08/2026 – 08/03/2026",
        lines: [
          { date: "04/08/2026", code: "99244", desc: "Spine consultation", amount: 450 },
          { date: "05/06/2026 & 06/17/2026", code: "62321 ×2", desc: "Cervical epidural steroid injection (2 × $2,800)", amount: 5600 },
          { date: "08/03/2026", code: "99215", desc: "Fusion consultation", amount: 450 }
        ],
        pip: 0, health: 0, adj: 0, reduce: { floor: 4550 } },
      { id: "metro", type: "MRI (health insurance)", name: "Metro Imaging Partners", email: "billing@metroimaging.example",
        address: "5323 Harry Hines Blvd, Dallas, TX 75235", dos: "03/19/2026",
        lines: [{ date: "03/19/2026", code: "72141", desc: "MRI cervical spine without contrast", amount: 2900 }],
        pip: 0, health: 1100, adj: 1800, reduce: { floor: null, policy: "zero" } },
      { id: "allcare", type: "Health subrogation lien", lien: true, name: "Allcare Health Plans — Recovery Unit", email: "recovery@allcarehealth.example",
        address: "PO Box 660218, Dallas, TX 75266", amount: 1100,
        plan: "Fully insured individual marketplace plan, issued in Texas: Texas law, so the common-fund (procurement cost) reduction applies.",
        notice: "Allcare Health Plans paid $1,100.00 for the 03/19/2026 cervical MRI (Metro Imaging Partners) related to the 02/20/2026 accident and asserts its right of reimbursement.",
        reduce: { floor: 733.33, why: "Pro-rata procurement costs: one-third off $1,100.00." } },
      { id: "oag", type: "Child support lien", lien: true, name: "OAG Child Support Division (Texas)", email: "liens@oag-childsupport.example",
        address: "PO Box 12017, Austin, TX 78711", amount: 3850,
        notice: "A child support lien is filed against Elena Rodriguez's personal injury recovery for $3,850.00 in unpaid child support (Cause No. DF-19-04482). The lien attaches to the client's net proceeds and must be paid before disbursement to the client.",
        reduce: { floor: null, policy: "statute" } },
      { id: "pinnacle", type: "Pre-settlement funding", lien: true, name: "Pinnacle Plaintiff Funding", email: "payoffs@pinnaclefunding.example",
        address: "3811 Turtle Creek Blvd, Suite 1100, Dallas, TX 75219", amount: 3540,
        onFile: { asOf: "08/15/2026", amount: 3310 },
        notice: "Pinnacle Plaintiff Funding advanced $2,500.00 to Elena Rodriguez on 04/20/2026. The payoff grows monthly under the funding agreement and is good only through the date stated on it.",
        reduce: { floor: null, policy: "contract" } }
    ],
    challenges: [
      "Cedar Valley's statement on file includes six visits from 01/06/2026 – 02/10/2026, before the 02/20/2026 accident (a prior shoulder complaint): $720.00 that isn't related. Request a corrected bill ($5,400.00).",
      "BI $25,000.00 (Car #5's limits) + UIM $45,000.00 = $70,000.00 gross; two releases.",
      "The child support lien is statutory: it isn't reduced and is paid in full ($3,850.00).",
      "Metro Imaging has a $0.00 balance; its $1,100.00 is Allcare's lien, reduced by one-third to $733.33 (fully insured, Texas law).",
      "Pinnacle's payoff on file expired 08/15/2026: the updated payoff is $3,540.00."
    ]
  },
  {
    id: "thompson",
    client: { first: "Mark", last: "Thompson", dob: "04/27/1991", phone: "(214) 555-0119", email: "mark.thompson@mail.example", address: "618 Bishop Avenue, Dallas, TX 75208" },
    dol: "12/31/2025", caseNo: "LSH-2025-DUI-123190",
    facts: "Head-on collision with a drunk driver (arrested at the scene, 0.18 BAC). Suit filed 06/02/2026 with a punitive damages claim.",
    injury: "Broken nose, wrist fracture, and PTSD.",
    settlements: [
      { type: "BI", carrier: "Granite Shield Insurance", insured: "Derek Vaughn", claimNo: "GS-25-994012", amount: 100000, date: "10/02/2026", adjuster: "Paula Whitcombe", note: "Policy-limits tender after suit was filed (Cause No. DC-26-07731), resolving all claims including punitive damages." }
    ],
    fee: { pct: "40%", why: "A lawsuit was filed on 06/02/2026: the retainer's 40% tier applies, not the 33⅓% pre-suit rate." },
    costs: [
      { label: "Filing fee", amount: 300 },
      { label: "Service of process", amount: 95 },
      { label: "Police report & arrest record", amount: 25 },
      { label: "Medical records & billing requests", amount: 287.5 },
      { label: "Deposition transcript", amount: 640 },
      { label: "Postage & certified mail", amount: 48 }
    ],
    pip: null,
    payees: [
      { id: "saintagnes", type: "Hospital (ER)", name: "Saint Agnes Medical Center", email: "billing@saintagnesmed.example",
        address: "1100 W. Jefferson Blvd, Dallas, TX 75208", dos: "12/31/2025 – 01/02/2026",
        lines: [
          { date: "12/31/2025", code: "99285", desc: "ED visit, highest severity", amount: 3850 },
          { date: "12/31/2025", code: "70486", desc: "CT maxillofacial without contrast", amount: 1920 },
          { date: "01/02/2026", code: "21315", desc: "Closed reduction, nasal fracture", amount: 2400 }
        ],
        onFile: { asOf: "02/20/2026", health: 0, adj: 0 },
        pip: 0, health: 3120, adj: 3910, reduce: { floor: 855 } },
      { id: "precision", type: "Hand surgery (LOP)", name: "Precision Hand & Wrist Center", email: "billing@precisionhand.example",
        address: "2900 Live Oak Street, Suite 300, Dallas, TX 75204", dos: "01/05/2026 – 03/30/2026",
        lines: [
          { date: "01/05/2026", code: "25600", desc: "Closed treatment, distal radius fracture, with casting", amount: 2700 },
          { date: "01/26/2026 – 03/30/2026", code: "99213 ×3", desc: "Follow-up visits (3 × $300)", amount: 900 }
        ],
        pip: 0, health: 0, adj: 0, reduce: { floor: 2400 } },
      { id: "clearwater", type: "Counseling (LOP)", name: "Clearwater Behavioral Health", email: "billing@clearwaterbh.example",
        address: "8150 Brookriver Drive, Suite S-300, Dallas, TX 75247", dos: "02/10/2026 – 06/30/2026",
        lines: [{ date: "02/10/2026 – 06/30/2026", code: "90837 ×16", desc: "Psychotherapy for PTSD (16 sessions × $175)", amount: 2800 }],
        pip: 0, health: 0, adj: 0, reduce: { floor: 2100 } },
      { id: "unity", type: "Health subrogation lien", lien: true, name: "Unity Choice Health Plan", email: "subro@unitychoice.example",
        address: "PO Box 2208, Houston, TX 77252", amount: 3120,
        plan: "Fully insured group plan (Mark's employer, Brightline HVAC). Texas law: the common-fund reduction applies, at the fee actually charged (40%).",
        notice: "Unity Choice Health Plan paid $3,120.00 to Saint Agnes Medical Center for care related to the 12/31/2025 accident and asserts its right of reimbursement from the recovery.",
        reduce: { floor: 1872, why: "Pro-rata procurement costs at the 40% fee actually charged: $1,248.00 off $3,120.00." } },
      { id: "atlas", type: "Pre-settlement funding", lien: true, name: "Atlas Lawsuit Funding", email: "payoffs@atlasfunding.example",
        address: "2121 N. Pearl Street, Suite 900, Dallas, TX 75201", amount: 8415,
        onFile: { asOf: "07/31/2026", amount: 7890 },
        notice: "Atlas Lawsuit Funding advanced $3,000.00 on 02/15/2026 and $2,000.00 on 05/01/2026 to Mark Thompson. The combined payoff grows monthly and is good only through the date stated on it.",
        reduce: { floor: null, policy: "contract" } }
    ],
    challenges: [
      "Suit was filed: the fee is 40% ($40,000.00), not one-third. Filing, service and deposition costs are on the ledger.",
      "Saint Agnes's statement on file (as of 02/20/2026) predates Unity Choice's $3,120.00 payment and the $3,910.00 contractual write-off: request an updated bill (balance $1,140.00).",
      "Unity Choice's reduction follows the 40% fee: $3,120.00 less 40% = $1,872.00.",
      "Atlas made two advances; its payoff on file expired 07/31/2026. Updated payoff: $8,415.00."
    ]
  },
  {
    id: "winslow",
    client: { first: "Gladys", last: "Winslow", dob: "02/03/1952", phone: "(972) 555-0150", email: "gladys.winslow@mail.example", address: "301 Meadowbrook Court, Garland, TX 75040" },
    dol: "04/01/2026", caseNo: "LSH-2026-PRM-401066",
    facts: "Slipped on a clear liquid in a grocery store's produce aisle; no wet floor sign.",
    injury: "Fractured hip; partial hip replacement.",
    settlements: [
      { type: "BI", carrier: "ValuMart Stores, Inc. (self-insured), administered by Crestline Claims Services", insured: "ValuMart Stores, Inc.", claimNo: "CCS-26-PL-55810", amount: 150000, date: "09/29/2026", adjuster: "Theodore Banks" }
    ],
    fee: { pct: "33⅓%", why: "Settled before suit: the pre-suit tier." },
    costs: [
      { label: "Incident report request", amount: 15 },
      { label: "Medical records & billing requests", amount: 410 },
      { label: "Surveillance video copy", amount: 75 },
      { label: "Premises safety expert", amount: 1500 },
      { label: "Postage & certified mail", amount: 36 }
    ],
    pip: null,
    payees: [
      { id: "lakewood", type: "Hospital (surgery)", name: "Lakewood General Hospital", email: "pfs@lakewoodgeneral.example",
        address: "7 Medical Parkway, Garland, TX 75044", dos: "04/01/2026 – 04/05/2026",
        lines: [
          { date: "04/01/2026", code: "99284", desc: "ED visit", amount: 2400 },
          { date: "04/02/2026", code: "27125", desc: "Hemiarthroplasty, hip (facility & implant)", amount: 52800 },
          { date: "04/01/2026 – 04/05/2026", code: "0120 ×4", desc: "Inpatient room & board (4 days × $3,300)", amount: 13200 }
        ],
        pip: 0, health: 15200, adj: 51568, reduce: { floor: 1224 } },
      { id: "northgate", type: "Skilled nursing (Medicare)", name: "Northgate Rehab & Skilled Nursing", email: "billing@northgaterehab.example",
        address: "4700 Northgate Drive, Garland, TX 75041", dos: "04/05/2026 – 04/19/2026",
        lines: [{ date: "04/05/2026 – 04/19/2026", code: "SNF ×14", desc: "Skilled nursing & rehab days (14 × $700)", amount: 9800 }],
        pip: 0, health: 4960, adj: 4840, reduce: { floor: null, policy: "zero" } },
      { id: "homeagain", type: "Home health (Medicare)", name: "HomeAgain Health Services", email: "billing@homeagainhealth.example",
        address: "1450 Holford Road, Garland, TX 75044", dos: "04/20/2026 – 05/29/2026",
        lines: [{ date: "04/20/2026 – 05/29/2026", code: "G0151 ×13", desc: "Home physical therapy visits (13 × $200)", amount: 2600 }],
        onFile: { asOf: "06/02/2026", health: 0, adj: 0 },
        pip: 0, health: 1180, adj: 1420, reduce: { floor: null, policy: "zero" } },
      { id: "medicare", type: "Health subrogation lien (Medicare)", lien: true, name: "Medicare — Benefits Coordination & Recovery Center", email: "bcrc@medicare-recovery.example",
        address: "PO Box 138832, Oklahoma City, OK 73113", amount: 21340,
        onFile: { asOf: "07/15/2026", amount: 21980, extra: [{ date: "05/12/2026", desc: "Dallas Heart Associates: cardiology follow-up (atrial fibrillation, unrelated)", amount: 640 }] },
        plan: "Medicare (the client is 74). A conditional payment letter lists what Medicare paid so far; the Final Demand, issued once the settlement is reported, is what is paid. Medicare's own formula takes off its share of the procurement costs (fees and costs ÷ gross).",
        notice: "Medicare made conditional payments for care related to the 04/01/2026 incident and has a statutory right of recovery under the Medicare Secondary Payer Act.",
        reduce: { floor: 13937, why: "Medicare's procurement-cost formula: (fee $50,000.00 + costs $2,036.00) ÷ gross $150,000.00 = 34.69%, off $21,340.00 = $13,937.00." } },
      { id: "keystone", type: "Pre-settlement funding", lien: true, name: "Keystone Legal Funding", email: "payoffs@keystonelegalfunding.example",
        address: "100 Crescent Court, Suite 700, Dallas, TX 75201", amount: 4515,
        onFile: { asOf: "09/01/2026", amount: 4260 },
        notice: "Keystone Legal Funding advanced $3,000.00 to Gladys Winslow on 05/14/2026. The payoff grows monthly and is good only through the date stated on it.",
        reduce: { floor: null, policy: "contract" } }
    ],
    challenges: [
      "Medicare's conditional payment letter on file includes a $640.00 cardiology visit for atrial fibrillation, unrelated to the fall. Dispute it and request the Final Demand: $21,340.00.",
      "Medicare's reduction is its own formula, not a negotiation: (fees + costs) ÷ gross = 34.69% off, $13,937.00.",
      "HomeAgain's statement on file (06/02/2026) predates Medicare's $1,180.00 payment and the $1,420.00 adjustment, so it shows $2,600.00 owed. Request an updated bill: the balance is $0.00, and it comes off the payables.",
      "Northgate has a $0.00 balance; Lakewood's $1,632.00 is the Medicare Part A deductible (reducible to $1,224.00).",
      "Keystone's payoff on file expired 09/01/2026: updated payoff $4,515.00."
    ]
  },
  {
    id: "taylor",
    client: { first: "James", last: "Taylor", dob: "07/30/2003", phone: "(817) 555-0171", email: "jt.taylor@mail.example", address: "2207 Lipscomb Street, Fort Worth, TX 76110" },
    dol: "03/15/2026", caseNo: "LSH-2026-UM-315904",
    facts: "A phantom vehicle swerved into JT's lane; he swerved and hit a concrete barrier. No contact; an independent witness corroborated the phantom driver.",
    injury: "Mild traumatic brain injury; post-concussion syndrome.",
    settlements: [
      { type: "UM", carrier: "Lonestar Family Insurance", insured: "James Taylor (own UM policy)", claimNo: "LFI-UM-26-20118", amount: 60000, date: "09/21/2026", adjuster: "Corinne Abbott", note: "No contact with the phantom vehicle: UM benefits paid on the independent witness's statement." }
    ],
    fee: { pct: "33⅓%", why: "Settled before suit: the pre-suit tier." },
    costs: [
      { label: "Police report", amount: 25 },
      { label: "Witness statement transcription", amount: 180 },
      { label: "Medical records & billing requests", amount: 236 },
      { label: "Neuropsychological report copy", amount: 150 },
      { label: "Postage & certified mail", amount: 22.4 }
    ],
    pip: null,
    payees: [
      { id: "brazos", type: "Emergency room", name: "Brazos Valley ER", email: "billing@brazosvalleyer.example",
        address: "4400 Camp Bowie Blvd, Fort Worth, TX 76107", dos: "03/15/2026",
        lines: [
          { date: "03/15/2026", code: "99285", desc: "ED visit, highest severity", amount: 3950 },
          { date: "03/15/2026", code: "70450", desc: "CT head without contrast", amount: 2800 }
        ],
        pip: 0, health: 2980, adj: 3120, reduce: { floor: 487.5 } },
      { id: "neurocare", type: "Neurology (LOP)", name: "NeuroCare Brain Injury Clinic", email: "billing@neurocareclinic.example",
        address: "1000 Ninth Avenue, Suite 400, Fort Worth, TX 76104", dos: "03/30/2026 – 08/24/2026",
        lines: [
          { date: "03/30/2026", code: "99244", desc: "Neurology consultation", amount: 650 },
          { date: "04/28/2026", code: "96132/96133", desc: "Neuropsychological evaluation", amount: 3200 },
          { date: "05/18/2026 – 08/24/2026", code: "99214 ×6", desc: "Follow-up visits (6 × $225)", amount: 1350 }
        ],
        onFile: { asOf: "08/31/2026", extraLines: [{ date: "07/13/2026", code: "99214", desc: "Follow-up visit", amount: 225 }] },
        pip: 0, health: 0, adj: 0, reduce: { floor: 3640 } },
      { id: "vision", type: "Vision therapy (LOP)", name: "Vision Therapy Associates", email: "billing@visiontherapyassoc.example",
        address: "5800 Overton Ridge Blvd, Fort Worth, TX 76132", dos: "06/01/2026 – 08/10/2026",
        lines: [{ date: "06/01/2026 – 08/10/2026", code: "92065 ×12", desc: "Orthoptic/vision therapy (12 × $150)", amount: 1800 }],
        pip: 0, health: 0, adj: 0, reduce: { floor: 1260 } },
      { id: "crestmark", type: "Health subrogation lien", lien: true, name: "Crestmark Employee Benefit Plan", email: "recovery@crestmarkbenefits.example",
        address: "c/o Apex Plan Recovery, PO Box 92010, Dallas, TX 75392", amount: 2980,
        plan: "Self-funded ERISA plan through JT's mother's employer (Crestmark Industries); JT is a covered dependent. Federal law: the plan's reimbursement terms control.",
        notice: "The Crestmark Employee Benefit Plan paid $2,980.00 to Brazos Valley ER for care related to the 03/15/2026 accident and asserts its right of first-dollar reimbursement under the plan document.",
        reduce: { floor: 2682, why: "Self-funded ERISA plan: no common-fund reduction. A discretionary 10% hardship reduction was approved." } },
      { id: "momentum", type: "Pre-settlement funding", lien: true, name: "Momentum Case Funding", email: "payoffs@momentumcasefunding.example",
        address: "777 Main Street, Suite 600, Fort Worth, TX 76102", amount: 2805,
        onFile: { asOf: "08/20/2026", amount: 2640 },
        notice: "Momentum Case Funding advanced $1,800.00 to James Taylor on 05/05/2026. The payoff grows monthly and is good only through the date stated on it.",
        reduce: { floor: null, policy: "contract" } }
    ],
    challenges: [
      "UM only: one release, type UM. There is no BI claim (no contact, phantom driver).",
      "NeuroCare's statement on file bills the 07/13/2026 follow-up twice (seven 99214 lines for six visits): request a corrected bill ($5,200.00).",
      "Crestmark is a self-funded ERISA plan (JT is a dependent): no common-fund reduction, but a 10% hardship reduction to $2,682.00.",
      "Momentum's payoff on file expired 08/20/2026: updated payoff $2,805.00."
    ]
  },
  {
    id: "vane",
    client: { first: "Sophie", last: "Vane", dob: "09/09/1998", phone: "(214) 555-0193", email: "sophie.vane@mail.example", address: "5530 Bryan Street, Apt 4C, Dallas, TX 75206" },
    dol: "04/10/2026", caseNo: "LSH-2026-BIK-410275",
    facts: "Cyclist struck by a car door opened suddenly by a parked driver. Liability was contested.",
    injury: "Road rash and an AC joint sprain (shoulder); a $5,000 carbon fiber bike destroyed.",
    settlements: [
      { type: "BI", carrier: "Local Farm Mutual", insured: "Patricia Okafor", claimNo: "LFM-26-08854", amount: 15000, date: "09/16/2026", adjuster: "Gary Lindqvist", note: "Property damage to the bicycle ($5,000.00) was resolved separately under the property damage claim and is not part of this settlement." }
    ],
    fee: { pct: "33⅓%", why: "Settled before suit: the pre-suit tier, on the BI settlement only (the property damage payment isn't part of it)." },
    costs: [
      { label: "Police report", amount: 25 },
      { label: "Medical records & billing requests", amount: 118 },
      { label: "Scene photographs", amount: 35 },
      { label: "Postage", amount: 18.6 }
    ],
    pip: null,
    payees: [
      { id: "uptown", type: "Urgent care", name: "Uptown Urgent Care", email: "billing@uptownurgentcare.example",
        address: "3000 McKinney Avenue, Dallas, TX 75204", dos: "04/10/2026",
        lines: [
          { date: "04/10/2026", code: "99204", desc: "Urgent care visit", amount: 385 },
          { date: "04/10/2026", code: "97597", desc: "Wound debridement & dressing", amount: 300 }
        ],
        pip: 0, health: 410, adj: 140, reduce: { floor: 101.25 } },
      { id: "eastside", type: "Orthopedics (LOP)", name: "Eastside Orthopedics", email: "billing@eastsideortho.example",
        address: "8230 Walnut Hill Lane, Suite 700, Dallas, TX 75231", dos: "04/17/2026 – 07/24/2026",
        lines: [
          { date: "04/17/2026", code: "99204", desc: "New patient orthopedic evaluation", amount: 450 },
          { date: "04/17/2026", code: "73030", desc: "X-ray, shoulder", amount: 300 },
          { date: "05/22/2026", code: "20610", desc: "AC joint injection", amount: 1400 },
          { date: "06/12/2026 – 07/24/2026", code: "99213 ×2", desc: "Follow-up visits (2 × $400)", amount: 800 }
        ],
        pip: 0, health: 0, adj: 0, reduce: { floor: 2000 } },
      { id: "motion", type: "Physical therapy (LOP)", name: "Motion Sports Physical Therapy", email: "billing@motionsportspt.example",
        address: "4515 Lemmon Avenue, Dallas, TX 75219", dos: "05/04/2026 – 07/31/2026",
        lines: [{ date: "05/04/2026 – 07/31/2026", code: "97110/97140", desc: "Therapy visits (24 × $140)", amount: 3360 }],
        onFile: { asOf: "08/05/2026", extraLines: [{ date: "05/22/2026", code: "97110 ×2", desc: "Therapeutic exercise (patient no-show)", amount: 190 }] },
        pip: 0, health: 0, adj: 0, reduce: { floor: 2240 } },
      { id: "bluebonnet", type: "Health subrogation lien", lien: true, name: "Bluebonnet Health Plan", email: "subro@bluebonnethealth.example",
        address: "PO Box 15006, San Antonio, TX 78212", amount: 410,
        plan: "Fully insured group plan (Sophie's employer, Studio Nine Architects). Texas law: the common-fund reduction applies.",
        notice: "Bluebonnet Health Plan paid $410.00 to Uptown Urgent Care for care related to the 04/10/2026 incident and asserts its right of reimbursement.",
        reduce: { floor: 273.33, why: "Pro-rata procurement costs: one-third off $410.00." } },
      { id: "bridgepoint", type: "Pre-settlement funding", lien: true, name: "Bridgepoint Settlement Funding", email: "payoffs@bridgepointfunding.example",
        address: "1717 Main Street, Suite 3800, Dallas, TX 75201", amount: 1915,
        onFile: { asOf: "08/01/2026", amount: 1780 },
        notice: "Bridgepoint Settlement Funding advanced $1,200.00 to Sophie Vane on 05/15/2026. The payoff grows monthly and is good only through the date stated on it.",
        reduce: { floor: null, policy: "contract" } }
    ],
    challenges: [
      "The gross is the BI settlement only, $15,000.00: the $5,000.00 bicycle payment is property damage, resolved separately, and isn't recovery on the Net Sheet.",
      "Motion Sports PT's statement on file bills a 05/22/2026 no-show ($190.00): request a corrected bill ($3,360.00).",
      "A small, contested-liability settlement: the reductions matter. Bluebonnet takes one-third off ($273.33).",
      "Bridgepoint's payoff on file expired 08/01/2026: updated payoff $1,915.00."
    ]
  },
  {
    id: "lee",
    client: { first: "Robert", last: "Lee", dob: "01/22/1981", phone: "(469) 555-0125", email: "robert.lee@mail.example", address: "8124 Forest Ridge Drive, Plano, TX 75025" },
    dol: "11/20/2025", caseNo: "LSH-2025-COM-112067",
    facts: "Backed into by a commercial delivery van in a parking lot.",
    injury: "Lumbar disc bulge with radiating leg numbness.",
    settlements: [
      { type: "BI", carrier: "Aggressive Casualty Insurance Co. (commercial auto, $1M policy)", insured: "Swift-Drop Logistics, LLC", claimNo: "AC-COM-25-77105", amount: 85000, date: "09/09/2026", adjuster: "Nathaniel Pryor" }
    ],
    fee: { pct: "33⅓%", why: "Settled before suit: the pre-suit tier." },
    costs: [
      { label: "Police report", amount: 25 },
      { label: "Medical records & billing requests", amount: 342.75 },
      { label: "Independent medical exam report copy", amount: 400 },
      { label: "Postage & certified mail", amount: 31.25 }
    ],
    pip: null,
    payees: [
      { id: "frontier", type: "Pain management (LOP)", name: "Frontier Spine & Pain", email: "billing@frontierspine.example",
        address: "6300 W. Parker Road, Suite 400, Plano, TX 75093", dos: "01/07/2026 – 06/22/2026",
        lines: [
          { date: "01/07/2026", code: "99244", desc: "Pain management consultation", amount: 425 },
          { date: "02/11/2026 – 05/13/2026", code: "62323 ×3", desc: "Lumbar epidural steroid injections (3 × $2,450)", amount: 7350 },
          { date: "06/22/2026", code: "99214", desc: "Radiofrequency ablation consult", amount: 300 }
        ],
        pip: 0, health: 0, adj: 0, reduce: { floor: 5650 } },
      { id: "cornerstone", type: "Chiropractic (LOP)", name: "Cornerstone Chiropractic", email: "billing@cornerstonechiro.example",
        address: "2201 Coit Road, Suite 101, Plano, TX 75075", dos: "11/24/2025 – 05/29/2026",
        lines: [{ date: "11/24/2025 – 05/29/2026", code: "98941 ×36", desc: "Chiropractic manipulation (36 visits × $160)", amount: 5760 }],
        pip: 0, health: 0, adj: 0, reduce: { floor: 3840 } },
      { id: "westpark", type: "MRI (health insurance)", name: "Westpark MRI", email: "billing@westparkmri.example",
        address: "3801 W. 15th Street, Plano, TX 75075", dos: "12/15/2025",
        lines: [{ date: "12/15/2025", code: "72148", desc: "MRI lumbar spine without contrast", amount: 2600 }],
        pip: 0, health: 980, adj: 1620, reduce: { floor: null, policy: "zero" } },
      { id: "oakridge", type: "Primary care (health insurance)", name: "Oakridge Primary Care", email: "billing@oakridgeprimary.example",
        address: "4031 W. Plano Parkway, Plano, TX 75093", dos: "11/21/2025 – 12/12/2025",
        lines: [{ date: "11/21/2025 – 12/12/2025", code: "99214 ×3", desc: "Office visits after the accident (3)", amount: 1180 }],
        onFile: { asOf: "12/20/2025", health: 0, adj: 0 },
        pip: 0, health: 610, adj: 420, reduce: { floor: 112.5 } },
      { id: "meridian", type: "Health subrogation lien", lien: true, name: "Meridian Choice Health", email: "recovery@meridianchoice.example",
        address: "PO Box 30480, Dallas, TX 75303", amount: 1590,
        onFile: { asOf: "06/30/2026", amount: 2455, extra: [{ date: "02/14/2026", desc: "Endocrinology visit and diabetes supplies (unrelated)", amount: 865 }] },
        plan: "Fully insured group plan (Robert's employer). Texas law: the common-fund reduction applies.",
        notice: "Meridian Choice Health paid benefits for care following the 11/20/2025 accident and asserts its right of reimbursement for the claims itemized below.",
        reduce: { floor: 1060, why: "Pro-rata procurement costs: one-third off the corrected $1,590.00." } },
      { id: "crescent", type: "Pre-settlement funding", lien: true, name: "Crescent Capital Legal Funding", email: "payoffs@crescentcapitalfunding.example",
        address: "200 Crescent Court, Suite 1500, Dallas, TX 75201", amount: 5780,
        onFile: { asOf: "07/15/2026", amount: 5350 },
        notice: "Crescent Capital Legal Funding advanced $3,500.00 to Robert Lee on 02/03/2026. The payoff grows monthly and is good only through the date stated on it.",
        reduce: { floor: null, policy: "contract" } }
    ],
    challenges: [
      "Meridian's lien itemization on file includes $865.00 of endocrinology and diabetes supplies, unrelated to the accident. Dispute it and request an updated itemization: $1,590.00.",
      "Oakridge's statement on file (12/20/2025) predates Meridian's $610.00 payment and the $420.00 adjustment: request an updated bill. It still has $150.00 (the copays): a payee, reducible to $112.50.",
      "Westpark MRI has a $0.00 balance: its $980.00 is inside Meridian's lien.",
      "Crescent's payoff on file expired 07/15/2026: updated payoff $5,780.00."
    ]
  },
  {
    id: "peterson",
    client: { first: "Bradley", last: "Peterson", dob: "05/05/1988", phone: "(281) 555-0108", email: "brick.peterson@mail.example", address: "1416 Heights Blvd, Houston, TX 77008" },
    dol: "04/18/2026", caseNo: "LSH-2026-MC-418390",
    facts: "Motorcyclist (\"Brick\") laid the bike down to avoid a car pulling out of a side street. No contact; helmet worn.",
    injury: "Severe road rash (degloving injury on the leg) and fractured ribs.",
    settlements: [
      { type: "BI", carrier: "Heartland Auto Insurance", insured: "Kevin Marsh", claimNo: "HAI-26-61207", amount: 50000, date: "09/08/2026", adjuster: "Simone Delacroix", note: "Policy-limits tender: liability accepted on the independent witness's account, despite no contact." },
      { type: "UM", carrier: "Ironhorse Motorcycle Insurance", insured: "Bradley Peterson (own UIM policy)", claimNo: "IMI-UIM-26-3390", amount: 40000, date: "10/05/2026", adjuster: "Wade Hollister" }
    ],
    fee: { pct: "33⅓%", why: "Both claims settled before suit: the pre-suit tier on the gross of both." },
    costs: [
      { label: "Police report", amount: 25 },
      { label: "Medical records & billing requests", amount: 486 },
      { label: "Scene photographs", amount: 60 },
      { label: "Helmet compliance expert letter", amount: 350 },
      { label: "Postage & certified mail", amount: 44 }
    ],
    pip: null,
    payees: [
      { id: "coastal", type: "Trauma center", name: "Coastal Trauma Center", email: "billing@coastaltrauma.example",
        address: "6411 Fannin Street, Houston, TX 77030", dos: "04/18/2026 – 04/23/2026",
        lines: [
          { date: "04/18/2026", code: "99291", desc: "Trauma activation & critical care", amount: 9800 },
          { date: "04/18/2026", code: "71250", desc: "CT chest", amount: 2600 },
          { date: "04/19/2026", code: "11043", desc: "Debridement, leg wound", amount: 6200 },
          { date: "04/18/2026 – 04/23/2026", code: "0120 ×5", desc: "Inpatient room & board (5 days × $4,800)", amount: 24000 }
        ],
        pip: 0, health: 14800, adj: 25300, reduce: { floor: 1875 } },
      { id: "reconstructive", type: "Plastic surgery (LOP)", name: "Reconstructive Plastic Surgery of Houston", email: "billing@reconplasticshouston.example",
        address: "6560 Fannin Street, Suite 1900, Houston, TX 77030", dos: "05/02/2026 – 08/21/2026",
        lines: [
          { date: "05/02/2026 & 05/30/2026", code: "15100 ×2", desc: "Split-thickness skin grafts (2 surgeries × $6,800)", amount: 13600 },
          { date: "06/05/2026 – 08/21/2026", code: "97597 ×8", desc: "Wound care visits (8 × $180)", amount: 1440 }
        ],
        onFile: { asOf: "09/01/2026", extraLines: [{ date: "05/09/2026", code: "15100", desc: "Split-thickness skin graft", amount: 6800 }] },
        pip: 0, health: 0, adj: 0, reduce: { floor: 10528 } },
      { id: "bayou", type: "Wound care (health insurance)", name: "Bayou Wound Care Clinic", email: "billing@bayouwoundcare.example",
        address: "2727 W. Holcombe Blvd, Houston, TX 77025", dos: "04/27/2026 – 05/29/2026",
        lines: [{ date: "04/27/2026 – 05/29/2026", code: "97605 ×12", desc: "Negative pressure wound therapy (12 × $270)", amount: 3240 }],
        pip: 0, health: 1460, adj: 1780, reduce: { floor: null, policy: "zero" } },
      { id: "gulfstream", type: "Health subrogation lien", lien: true, name: "Gulfstream Health Partners", email: "subrogation@gulfstreamhealth.example",
        address: "PO Box 4411, Houston, TX 77210", amount: 16260,
        plan: "Fully insured group plan (Brick's employer, Bayport Marine Services). Texas law: the common-fund reduction applies.",
        notice: "Gulfstream Health Partners paid $16,260.00 for care related to the 04/18/2026 accident (Coastal Trauma Center $14,800.00; Bayou Wound Care Clinic $1,460.00) and asserts its right of reimbursement.",
        reduce: { floor: 10840, why: "Pro-rata procurement costs: one-third off $16,260.00." } },
      { id: "velocity", type: "Pre-settlement funding", lien: true, name: "Velocity Pre-Settlement Funding", email: "payoffs@velocityfunding.example",
        address: "1001 Fannin Street, Suite 2200, Houston, TX 77002", amount: 10080,
        onFile: { asOf: "08/30/2026", amount: 9450 },
        notice: "Velocity Pre-Settlement Funding advanced $4,000.00 on 05/10/2026 and $3,000.00 on 07/01/2026 to Bradley Peterson. The combined payoff grows monthly and is good only through the date stated on it.",
        reduce: { floor: null, policy: "contract" } }
    ],
    challenges: [
      "Reconstructive Plastic Surgery's statement on file bills a third skin graft on 05/09/2026: there were two surgeries (05/02 and 05/30). Request a corrected bill: $15,040.00, not $21,840.00.",
      "Two settlements, two releases: Heartland BI $50,000.00 + Ironhorse UIM $40,000.00 = $90,000.00 gross.",
      "Gulfstream's $16,260.00 is what it paid Coastal Trauma and Bayou Wound Care: Bayou's balance is $0.00 and Coastal's remaining $2,500.00 is the client's share.",
      "Velocity made two advances; its payoff on file expired 08/30/2026: updated payoff $10,080.00."
    ]

  }
];
