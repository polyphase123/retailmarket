/**
 * RetailMarket PH — feature layer
 * Threshold simulator, trends, whole-bill estimate, market structure, complete map,
 * share links and exports, "what changed", switching guide, languages and install support.
 * Depends on window.RMApp (app.js), RETAIL_MARKET_EXTRAS (extras.js), RETAIL_MARKET_CHANGES (changes.js).
 */
(function () {
  "use strict";

  const X = window.RETAIL_MARKET_EXTRAS || {};
  const CH = window.RETAIL_MARKET_CHANGES || null;
  let A = null; // RMApp, set on ready

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => (A ? A.escapeHtml(s) : String(s ?? ""));
  const fmt = (n, dp = 0) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const store = {
    get(k, d) { try { const v = localStorage.getItem(`rmph:${k}`); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(`rmph:${k}`, v); } catch (e) { /* storage unavailable */ } },
  };

  const ICON = {
    share: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
    print: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/></svg>',
    layers: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 8l10 5 10-5-10-5zM2 13l10 5 10-5"/></svg>',
    download: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  };

  /* ======================================================================
     1. LANGUAGES (English, Filipino, Cebuano)
     ====================================================================== */
  const STR = {
    en: {
      nav_map: "Map", nav_dir: "Directory", nav_calc: "Calculator", nav_supp: "Suppliers", nav_faq: "FAQ",
      dir_title: "On-Grid Utilities Directory", calc_title: "Power Choice Savings Calculator",
      supp_title: "Suppliers & Market Rates", faq_title: "Switching guide & FAQ",
      tab_guide: "How to switch", tab_faq: "501 questions", tab_structure: "Market structure",
      lang: "Language", lang_note: "",
      guide_intro: "For businesses with an average monthly peak demand of 100 kW or more. Smaller businesses can join through Retail Aggregation.",
      g_eligible: "Check that you qualify",
      g_eligible_b: "Your average monthly peak demand must be at least 100 kW over the past 12 months, measured at one revenue meter. Ask your distribution utility (DU) to confirm. Below 100 kW, you can pool meters in a contiguous area through Retail Aggregation (RAP).",
      g_choose: "Choose a supplier",
      g_choose_b: "Ask licensed retail electricity suppliers (RES) for offers and compare them. Once you agree on terms, the RES prepares the switching documents and can file them for you with your written authority.",
      g_loi: "Send a Letter of Intent",
      g_loi_b: "The Letter of Intent (LOI) goes to your DU as Network Service Provider. Your switch date must be at least 90 calendar days after the DU receives it.",
      g_meter: "Get the right meter",
      g_meter_b: "Your DU, as Retail Metering Service Provider, replaces or upgrades your meter no later than 30 calendar days before the switch date.",
      g_crb: "Switch request",
      g_crb_b: "Your supplier files the switch request with the Central Registration Body (CRB). The CRB checks it and confirms your switch date.",
      g_switched: "You're switched",
      g_switched_b: "From the switch date your supplier provides your electricity. Distribution, transmission, system loss and other regulated charges still apply.",
      g_days: (n) => `${n} calendar days`,
      g_notes: "While you're a retail customer, the same account can't also be on Net-Metering or the DER program. In BARMM, customer choice programs start only when the BARMM government allows it.",
      g_sources: "Sources",
      sim_title: "Threshold simulator", sim_threshold: "Contestability threshold", sim_takeup: "Customers who actually switch",
      sim_migrated: "Energy leaving captive supply", sim_stranded: "Contracted capacity left idle", sim_exposure: "Take-or-pay exposure a year",
      sim_hike: "Added cost for remaining captive customers", sim_lost: "Captive energy lost", sim_new: "Newly eligible (50–99 kW)",
      sim_byDu: "By utility", sim_search: "Find a utility", whole_bill: "Whole bill estimate", trends: "History & trends",
    },
    fil: {
      nav_map: "Mapa", nav_dir: "Direktoryo", nav_calc: "Calculator", nav_supp: "Supplier", nav_faq: "Tanong",
      dir_title: "Direktoryo ng mga Utility", calc_title: "Calculator ng Matitipid",
      supp_title: "Mga Supplier at Presyo", faq_title: "Gabay sa paglipat at FAQ",
      tab_guide: "Paano lumipat", tab_faq: "501 tanong", tab_structure: "Istruktura ng merkado",
      lang: "Wika", lang_note: "Ang pagsasalin ay draft pa; ipasuri sa katutubong tagapagsalita bago ilathala.",
      guide_intro: "Para sa mga negosyong may average na buwanang peak demand na 100 kW o higit pa. Ang mas maliliit na negosyo ay puwedeng sumali sa pamamagitan ng Retail Aggregation.",
      g_eligible: "Alamin kung kwalipikado ka",
      g_eligible_b: "Dapat hindi bababa sa 100 kW ang iyong average na buwanang peak demand sa nakaraang 12 buwan, sinukat sa isang revenue meter. Itanong sa iyong distribution utility (DU) para makumpirma. Kung mas mababa sa 100 kW, puwedeng pagsamahin ang mga metro sa magkakatabing lugar sa ilalim ng Retail Aggregation (RAP).",
      g_choose: "Pumili ng supplier",
      g_choose_b: "Humingi ng alok sa mga lisensyadong retail electricity supplier (RES) at ikumpara. Kapag nagkasundo kayo, ang RES ang maghahanda ng mga dokumento at puwede itong maghain para sa iyo kung may nakasulat kang pahintulot.",
      g_loi: "Magpadala ng Letter of Intent",
      g_loi_b: "Ipinapadala ang Letter of Intent (LOI) sa iyong DU bilang Network Service Provider. Ang petsa ng paglipat ay dapat hindi bababa sa 90 araw (kalendaryo) mula nang matanggap ito ng DU.",
      g_meter: "Kunin ang tamang metro",
      g_meter_b: "Papalitan o aayusin ng iyong DU, bilang Retail Metering Service Provider, ang iyong metro nang hindi lalampas sa 30 araw bago ang petsa ng paglipat.",
      g_crb: "Switch request",
      g_crb_b: "Ihahain ng iyong supplier ang switch request sa Central Registration Body (CRB). Susuriin ito ng CRB at kukumpirmahin ang petsa ng paglipat.",
      g_switched: "Nakalipat ka na",
      g_switched_b: "Mula sa petsa ng paglipat, ang supplier mo na ang magbibigay ng kuryente. May bayad pa rin para sa distribution, transmission, system loss at iba pang regulated na singil.",
      g_days: (n) => `${n} araw`,
      g_notes: "Habang retail customer ka, hindi puwedeng sabay na naka-Net-Metering o DER program ang parehong account. Sa BARMM, magsisimula lang ang mga programang ito kapag pinayagan ng pamahalaan ng BARMM.",
      g_sources: "Pinagmulan",
      sim_title: "Simulator ng threshold", sim_threshold: "Threshold", sim_takeup: "Bahagi ng lilipat",
      sim_migrated: "Enerhiyang lalabas sa captive", sim_stranded: "Kontratang kapasidad na hindi magagamit", sim_exposure: "Take-or-pay exposure kada taon",
      sim_hike: "Dagdag na singil sa maiiwang captive customer", sim_lost: "Nawalang captive energy", sim_new: "Bagong kwalipikado (50–99 kW)",
      sim_byDu: "Bawat utility", sim_search: "Hanapin ang utility", whole_bill: "Tantiya ng buong bill", trends: "Kasaysayan at trend",
    },
    ceb: {
      nav_map: "Mapa", nav_dir: "Direktoryo", nav_calc: "Calculator", nav_supp: "Supplier", nav_faq: "Pangutana",
      dir_title: "Direktoryo sa mga Utility", calc_title: "Calculator sa Matipig",
      supp_title: "Mga Supplier ug Presyo", faq_title: "Giya sa pagbalhin ug FAQ",
      tab_guide: "Unsaon pagbalhin", tab_faq: "501 ka pangutana", tab_structure: "Estruktura sa merkado",
      lang: "Pinulongan", lang_note: "Draft pa ang hubad; ipasusi sa lumad nga mamumulong sa dili pa imantala.",
      guide_intro: "Para sa mga negosyo nga adunay average nga binulan nga peak demand nga 100 kW o labaw pa. Ang gagmayng negosyo makaapil pinaagi sa Retail Aggregation.",
      g_eligible: "Susiha kung kwalipikado ka",
      g_eligible_b: "Ang imong average nga binulan nga peak demand kinahanglan dili ubos sa 100 kW sulod sa miaging 12 ka bulan, gisukod sa usa ka revenue meter. Pangutan-a ang imong distribution utility (DU) aron makumpirma. Kung ubos sa 100 kW, mahimong i-pool ang mga metro sa magkasikbit nga lugar pinaagi sa Retail Aggregation (RAP).",
      g_choose: "Pagpili og supplier",
      g_choose_b: "Pangayo og tanyag sa mga lisensyadong retail electricity supplier (RES) ug ikumpara. Kung magkauyon na mo, ang RES ang mag-andam sa mga dokumento ug mahimo kini nga mopasa alang kanimo kung aduna kay sinulat nga pagtugot.",
      g_loi: "Ipadala ang Letter of Intent",
      g_loi_b: "Ang Letter of Intent (LOI) ipadala sa imong DU isip Network Service Provider. Ang petsa sa pagbalhin kinahanglan dili mubo sa 90 ka adlaw (kalendaryo) gikan sa pagdawat sa DU.",
      g_meter: "Kuhaa ang husto nga metro",
      g_meter_b: "Ang imong DU, isip Retail Metering Service Provider, mopuli o mo-upgrade sa imong metro dili molapas sa 30 ka adlaw sa dili pa ang petsa sa pagbalhin.",
      g_crb: "Switch request",
      g_crb_b: "Ang imong supplier mopasa sa switch request ngadto sa Central Registration Body (CRB). Susihon kini sa CRB ug kumpirmahon ang petsa sa pagbalhin.",
      g_switched: "Nakabalhin na ka",
      g_switched_b: "Gikan sa petsa sa pagbalhin, ang imong supplier na ang mohatag sa imong kuryente. Aduna gihapoy bayad sa distribution, transmission, system loss ug uban pang regulated nga singil.",
      g_days: (n) => `${n} ka adlaw`,
      g_notes: "Samtang retail customer ka, ang samang account dili mahimong naa usab sa Net-Metering o DER program. Sa BARMM, magsugod lang kini nga mga programa kung tugotan sa gobyerno sa BARMM.",
      g_sources: "Gigikanan",
      sim_title: "Simulator sa threshold", sim_threshold: "Threshold", sim_takeup: "Bahin nga mobalhin",
      sim_migrated: "Enerhiya nga mogawas sa captive", sim_stranded: "Kontratang kapasidad nga dili magamit", sim_exposure: "Take-or-pay exposure matag tuig",
      sim_hike: "Dugang singil sa mabilin nga captive customer", sim_lost: "Nawala nga captive energy", sim_new: "Bag-ong kwalipikado (50–99 kW)",
      sim_byDu: "Matag utility", sim_search: "Pangitaa ang utility", whole_bill: "Banabana sa tibuok bill", trends: "Kasaysayan ug trend",
    },
  };
  let lang = store.get("lang", "en");
  if (!STR[lang]) lang = "en";
  const t = (k, ...a) => {
    const v = (STR[lang] && STR[lang][k]) ?? STR.en[k];
    return typeof v === "function" ? v(...a) : v;
  };

  function applyLanguage() {
    document.documentElement.lang = lang === "en" ? "en" : lang === "fil" ? "fil" : "ceb";
    const nav = { viewMap: "nav_map", viewDirectory: "nav_dir", viewCalculator: "nav_calc", viewSuppliers: "nav_supp", viewFaq: "nav_faq" };
    $$(".nav-tab").forEach((b) => {
      const k = nav[b.dataset.view];
      const lbl = $(".nav-label", b);
      if (k && lbl) lbl.textContent = t(k);
    });
    const titles = { viewDirectory: "dir_title", viewCalculator: "calc_title", viewSuppliers: "supp_title", viewFaq: "faq_title" };
    Object.entries(titles).forEach(([v, k]) => {
      const el = $(`#${v} .view-title`);
      if (el) el.textContent = t(k);
    });
    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    if (faqMode === "guide") renderGuide();
    if ($("#roadmapModal.active") && simActive) renderSimulator();
  }

  /* ======================================================================
     2. THRESHOLD SIMULATOR + TRENDS (inside the roadmap sheet)
     ====================================================================== */
  const SIM = { kw: 50, takeup: 100, grid: "all", q: "", showAll: false };
  let simActive = false;
  const STEP_KW = [100, 75, 50, 20, 10];

  function nationalAt(kw, takeup) {
    const step = (X.national?.steps || []).find((s) => s.kw === kw);
    if (!step) return null;
    const sens = (X.sensitivity || []).find((s) => s.kw === kw);
    const tk = sens?.takeup?.[String(takeup)];
    const f = takeup / 100;
    return {
      step,
      gwh: step.gwh * f,
      mw: tk ? tk.mw : step.mw * f,
      php_b: tk ? tk.php_b : step.php_b * f,
      hike: tk ? tk.hike : step.hike * f,
      hikeApprox: !tk && takeup !== 100,
      loss: step.loss_pct * f,
    };
  }

  function duRows(kw, takeup) {
    const f = takeup / 100;
    const appDus = new Map((A.RD.dus || []).map((d) => [d.acronym, d]));
    return Object.entries(X.impact || {})
      .map(([acr, v]) => {
        const s = v.steps?.[String(kw)];
        if (!s) return null;
        const du = appDus.get(acr);
        return {
          acr, du, region: v.region, risk: v.risk,
          mw: s.stranded_mw * f, php: s.exposure_php * f, hike: s.hike_php_kwh * f, loss: s.loss_pct * f,
          newly: kw <= 50 && du ? du.captive_p5_eus || 0 : null,
        };
      })
      .filter(Boolean)
      .filter((r) => SIM.grid === "all" || r.region === SIM.grid)
      .filter((r) => !SIM.q || r.acr.toLowerCase().includes(SIM.q) || (r.du?.name || "").toLowerCase().includes(SIM.q))
      .sort((a, b) => b.php - a.php);
  }

  function renderSimulator() {
    const box = $("#roadmapContainer");
    if (!box || !X.national) return;
    const n = nationalAt(SIM.kw, SIM.takeup);
    const rows = duRows(SIM.kw, SIM.takeup);
    const regionTotal = rows.reduce((a, r) => ({ mw: a.mw + r.mw, php: a.php + r.php }), { mw: 0, php: 0 });
    const newly = SIM.kw <= 50 ? (A.RD.dus || []).reduce((a, d) => a + (d.captive_p5_eus || 0), 0) : null;
    const newlyMw = SIM.kw <= 50 ? (A.RD.dus || []).reduce((a, d) => a + (d.captive_p5_mw || 0), 0) : null;
    const shown = SIM.showAll ? rows : rows.slice(0, 12);
    const maxPhp = Math.max(1, ...rows.map((r) => r.php));

    box.innerHTML = `
      <div class="sim">
        <div class="sim-controls">
          <div class="sim-label">${t("sim_threshold")}</div>
          <div class="sim-chips" role="radiogroup">
            ${STEP_KW.map((kw) => `<button class="sim-chip ${kw === SIM.kw ? "active" : ""}" role="radio" aria-checked="${kw === SIM.kw}" data-kw="${kw}">${kw} kW</button>`).join("")}
          </div>
          <div class="sim-status">${esc(n.step.status)}</div>

          <div class="sim-label" style="margin-top:12px;">${t("sim_takeup")} <b>${SIM.takeup}%</b></div>
          <input type="range" class="calc-slider sim-slider" id="simTakeup" min="0" max="4" step="1" value="${[10, 25, 50, 75, 100].indexOf(SIM.takeup)}" aria-label="${t("sim_takeup")}">
          <div class="sim-ticks"><span>10%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
        </div>

        <div class="sim-national">
          <div class="sim-kpi"><div class="sim-kpi-l">${t("sim_exposure")}</div><div class="sim-kpi-v">₱${fmt(n.php_b, 2)}<small>B</small></div></div>
          <div class="sim-kpi"><div class="sim-kpi-l">${t("sim_stranded")}</div><div class="sim-kpi-v">${fmt(n.mw)}<small> MW</small></div></div>
          <div class="sim-kpi"><div class="sim-kpi-l">${t("sim_hike")}</div><div class="sim-kpi-v">${n.hikeApprox ? "≈" : ""}₱${fmt(n.hike, 2)}<small>/kWh</small></div></div>
          <div class="sim-kpi"><div class="sim-kpi-l">${t("sim_migrated")}</div><div class="sim-kpi-v">${fmt(n.gwh)}<small> GWh</small></div></div>
          ${newly !== null ? `<div class="sim-kpi wide"><div class="sim-kpi-l">${t("sim_new")}</div><div class="sim-kpi-v">${fmt(newly)}<small> end-users · ${fmt(newlyMw)} MW</small></div></div>` : ""}
        </div>
        <div class="sim-foot">
          National figures for ${esc(X.national.scope)}. Source: ${esc(X.national.source)}${SIM.takeup !== 100 ? "; take-up scenarios from the Retail Switching Sensitivity sheet" : ""}.
          ${SIM.kw === 50 ? `<br>${esc(X.national.mitigation_note)}` : ""}
          ${n.hikeApprox ? "<br>≈ The workbook has no take-up table for this step, so the captive tariff effect is scaled in proportion." : ""}
        </div>

        <div class="sim-du-head">
          <div class="sim-label">${t("sim_byDu")}</div>
          <div class="sim-grid-chips">
            ${["all", "Luzon", "Visayas", "Mindanao"].map((g) => `<button class="sim-grid ${g === SIM.grid ? "active" : ""}" data-grid="${g}">${g === "all" ? "All" : g}</button>`).join("")}
          </div>
        </div>
        <div class="search-input-wrap sim-search"><input type="search" id="simSearch" class="search-input" placeholder="${t("sim_search")}" value="${esc(SIM.q)}" autocomplete="off"></div>
        <div class="sim-region-total">${rows.length} utilities · ₱${fmt(regionTotal.php / 1e9, 2)}B · ${fmt(regionTotal.mw)} MW</div>
        <table class="sim-table">
          <thead><tr><th>Utility</th><th class="num">₱ M / yr</th><th class="num">MW</th><th class="num">₱/kWh</th></tr></thead>
          <tbody>
            ${shown.map((r) => `
              <tr data-acr="${esc(r.acr)}" ${r.du ? `data-id="${r.du.id}" tabindex="0"` : ""}>
                <td><b>${esc(r.acr)}</b><span class="risk risk-${(r.risk || "").split(" ")[0].toLowerCase()}">${esc((r.risk || "").split(" /")[0].toLowerCase())}</span>
                  <div class="bar"><i style="width:${(r.php / maxPhp) * 100}%"></i></div>
                  ${r.newly ? `<div class="sim-sub">${fmt(r.newly)} newly eligible at 50 kW</div>` : ""}
                  ${!r.du ? `<div class="sim-sub">Not in the retail data</div>` : ""}</td>
                <td class="num">${fmt(r.php / 1e6, 1)}</td>
                <td class="num">${fmt(r.mw, 1)}</td>
                <td class="num">${fmt(r.hike, 2)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
        ${rows.length > 12 ? `<button class="sim-more" id="simMore">${SIM.showAll ? "Show top 12" : `Show all ${rows.length}`}</button>` : ""}
        <div class="sim-foot">₱/kWh is the workbook's added cost for the utility's remaining residential captive customers. Tap a row to open the utility on the map.</div>
      </div>`;

    $$(".sim-chip", box).forEach((b) => b.addEventListener("click", () => { SIM.kw = +b.dataset.kw; renderSimulator(); }));
    $("#simTakeup", box)?.addEventListener("input", (e) => { SIM.takeup = [10, 25, 50, 75, 100][+e.target.value]; renderSimulator(); $("#simTakeup")?.focus(); });
    $$(".sim-grid", box).forEach((b) => b.addEventListener("click", () => { SIM.grid = b.dataset.grid; renderSimulator(); }));
    $("#simSearch", box)?.addEventListener("input", (e) => {
      SIM.q = e.target.value.trim().toLowerCase();
      const pos = e.target.selectionStart;
      renderSimulator();
      const s = $("#simSearch"); if (s) { s.focus(); s.setSelectionRange(pos, pos); }
    });
    $("#simMore", box)?.addEventListener("click", () => { SIM.showAll = !SIM.showAll; renderSimulator(); });
    $$("tr[data-id]", box).forEach((tr) => {
      const go = () => {
        $("#roadmapModal")?.classList.remove("active");
        A.switchView("viewMap");
        A.selectDuById(tr.dataset.id, true);
      };
      tr.addEventListener("click", go);
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    });
  }

  function sparkSteps(points) {
    // Step chart of the threshold over time (log scale)
    const W = 320, H = 120, pad = { l: 34, r: 8, t: 10, b: 20 };
    const years = points.map((p) => p.year);
    const x0 = Math.min(...years), x1 = Math.max(...years);
    const lx = (y) => pad.l + ((y - x0) / (x1 - x0)) * (W - pad.l - pad.r);
    const ly = (kw) => pad.t + (1 - Math.log10(kw / 10) / Math.log10(1000 / 10)) * (H - pad.t - pad.b);
    let d = "", dp = "";
    points.forEach((p, i) => {
      const x = lx(p.year), y = ly(p.kw);
      const target = p.proposed ? "p" : "a";
      if (i === 0) { d = `M${x},${y}`; return; }
      const prev = points[i - 1];
      const seg = ` L${x},${ly(prev.kw)} L${x},${y}`;
      if (target === "a") d += seg; else { if (!dp) dp = `M${lx(prev.year)},${ly(prev.kw)}`; dp += seg; }
    });
    const grid = [1000, 500, 100, 50, 10].map((kw) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${ly(kw)}" y2="${ly(kw)}" class="g"/><text x="${pad.l - 4}" y="${ly(kw) + 3}" text-anchor="end">${kw >= 1000 ? "1 MW" : kw + " kW"}</text>`).join("");
    const xl = [2013, 2016, 2021, 2026, 2031].map((y) => `<text x="${lx(y)}" y="${H - 4}" text-anchor="middle">${y}</text>`).join("");
    const dots = points.map((p) => `<circle cx="${lx(p.year)}" cy="${ly(p.kw)}" r="3" class="${p.proposed ? "pd" : "ad"}"><title>${p.year}: ${p.kw} kW, ${esc(p.basis)}</title></circle>`).join("");
    return `<svg class="trend-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Contestability threshold over time">${grid}${xl}<path d="${d}" class="a"/><path d="${dp}" class="p"/>${dots}</svg>`;
  }

  function renderTrends() {
    const box = $("#roadmapContainer");
    const T = X.trends;
    if (!box || !T) return;
    const [p0, p1] = [T.periods[0], T.periods[T.periods.length - 1]];
    const card = (label, a, b, unit, dp = 0, pre = "") => {
      const ch = a ? ((b - a) / a) * 100 : null;
      return `<div class="tr-card"><div class="tr-l">${label}</div>
        <div class="tr-v">${pre}${fmt(b, dp)}<small>${unit}</small></div>
        <div class="tr-d">${p0.label}: ${pre}${fmt(a, dp)}${unit} ${ch !== null ? `<b class="${ch >= 0 ? "up" : "down"}">${ch >= 0 ? "+" : "−"}${fmt(Math.abs(ch), 1)}%</b>` : ""}</div></div>`;
    };
    const P = T.price_2025;
    box.innerHTML = `
      <div class="trends">
        <div class="sim-label">Contestability threshold</div>
        ${sparkSteps(T.thresholds)}
        <div class="sim-foot"><span class="key a"></span>Implemented <span class="key p"></span>Roadmap. ${T.thresholds.map((p) => `${p.year}: ${esc(p.basis)}`).join(" · ")}</div>

        <div class="sim-label" style="margin-top:14px;">Market size, ${esc(p0.label)} → ${esc(p1.label)}</div>
        <div class="tr-grid">
          ${card("CREM demand", p0.crem_mw, p1.crem_mw, " MW", 0)}
          ${card("GEOP end-users", p0.geop_eus, p1.geop_eus, "", 0)}
          ${card("GEOP demand", p0.geop_mw, p1.geop_mw, " MW", 1)}
          ${card("RAP groups", p0.rap_groups, p1.rap_groups, "", 0)}
          ${card("RAP members", p0.rap_members, p1.rap_members, "", 0)}
          ${card("RAP demand", p0.rap_mw, p1.rap_mw, " MW", 1)}
        </div>

        <div class="sim-label" style="margin-top:14px;">Average prices</div>
        <div class="tr-grid">
          ${card("CREM", p0.crem_wap, p1.crem_wap, "/kWh", 2, "₱")}
          ${card("GEOP", p0.geop_wap, p1.geop_wap, "/kWh", 2, "₱")}
          ${card("RAP", p0.rap_wap, p1.rap_wap, "/kWh", 2, "₱")}
        </div>
        <div class="tr-band">2025 ranges as reported: CREM ₱${P.crem[0]}–${P.crem[1]}, GEOP ₱${P.geop[0]}–${P.geop[1]}, against a DU average of ₱${P.du_avg_bill[0]}–${P.du_avg_bill[1]}/kWh. Estimated CREM customer savings in 2025: ₱${P.crem_savings_2025_php_b}B. Source: ${esc(P.source)}.</div>
        <div class="sim-foot">${esc(T.note)} Sources: ${T.periods.map((p) => `${esc(p.label)}: ${esc(p.source)}`).join("; ")}. The Q1 2026 figures predate the 100 kW threshold.</div>
      </div>`;
  }

  function setupRoadmapTabs() {
    const bar = $(".roadmap-mode-bar");
    if (!bar || !X.national) return;
    bar.insertAdjacentHTML("afterbegin", `<button class="roadmap-mode-tab" data-xmode="sim" data-i18n="sim_title">${t("sim_title")}</button>`);
    bar.insertAdjacentHTML("beforeend", `<button class="roadmap-mode-tab" data-xmode="trends" data-i18n="trends">${t("trends")}</button>`);
    // shorten the original labels so four tabs fit
    const p = $('.roadmap-mode-tab[data-rmode="proposed"]'); if (p) p.textContent = "Roadmap";
    const h = $('.roadmap-mode-tab[data-rmode="historical"]'); if (h) h.textContent = "Phases";
    $$(".roadmap-mode-tab").forEach((tab) => tab.addEventListener("click", () => {
      simActive = tab.dataset.xmode === "sim";
      if (!tab.dataset.xmode) return; // app.js handles its own tabs
      $$(".roadmap-mode-tab").forEach((x) => x.classList.toggle("active", x === tab));
      if (tab.dataset.xmode === "sim") renderSimulator(); else renderTrends();
    }));
    let opened = false;
    $("#openRoadmapBtn")?.addEventListener("click", () => {
      if (opened) return;
      opened = true;
      $('.roadmap-mode-tab[data-xmode="sim"]')?.click();
    });
  }

  /* ======================================================================
     3. WHOLE-BILL ESTIMATE (calculator)
     ====================================================================== */
  const BILL = { touched: false, duId: null, v: {} };
  const BILL_KEYS = [
    ["transmission", "Transmission"], ["distribution", "Distribution"], ["system_loss", "System loss"],
    ["taxes", "Taxes"], ["universal_fit_other", "Universal charges, FIT-All & others"],
  ];

  function defaultBill(gen) {
    const s = X.bill?.basis_pct || {};
    const base = s.generation || 61.35;
    const o = {};
    BILL_KEYS.forEach(([k]) => { o[k] = +(gen * ((s[k] || 0) / base)).toFixed(4); });
    return o;
  }

  function currentCalc() {
    const st = A.state;
    const du = (A.RD.dus || []).find((d) => d.id === st.calcDuId);
    const gen = A.rateNum(du) ?? A.MARKET_WAP.crem;
    const sel = A.el.calcSupplierSelect;
    const offer = sel && sel.value !== "wap" ? parseFloat(sel.value) : A.MARKET_WAP[st.calcMode];
    const kwh = parseFloat(st.calcKwh) || 0;
    return { du, gen, offer, kwh, mode: st.calcMode };
  }

  function renderWholeBill() {
    const host = $("#wholeBill");
    if (!host || !X.bill) return;
    const c = currentCalc();
    if (c.mode === "wesm") { host.style.display = "none"; return; }
    host.style.display = "";
    if (!BILL.touched || BILL.duId !== c.du?.id) { BILL.v = defaultBill(c.gen); BILL.duId = c.du?.id; BILL.touched = false; }
    const other = BILL_KEYS.reduce((a, [k]) => a + (Number(BILL.v[k]) || 0), 0);
    const capT = c.gen + other, retT = c.offer + other;
    const save = (capT - retT) * c.kwh;
    const pct = capT ? ((capT - retT) / capT) * 100 : 0;
    const body = $("#wholeBillBody", host);
    if (!body) return;
    if (!$("#wbInputs", body)) {
      body.innerHTML = `
        <div class="wb-grid" id="wbInputs">
          ${BILL_KEYS.map(([k, l]) => `<label class="wb-row"><span>${l}</span><span class="wb-in">₱<input type="number" step="0.01" min="0" inputmode="decimal" data-k="${k}"></span></label>`).join("")}
        </div>
        <div class="wb-out" id="wbOut"></div>
        <div class="wb-note"></div>`;
      $$("input[data-k]", body).forEach((inp) => inp.addEventListener("input", () => {
        BILL.v[inp.dataset.k] = parseFloat(inp.value) || 0; BILL.touched = true; renderWholeBill();
      }));
    }
    $$("input[data-k]", body).forEach((inp) => { if (document.activeElement !== inp) inp.value = BILL.v[inp.dataset.k]; });
    $("#wbOut", body).innerHTML = `
      <div class="wb-col"><div class="wb-l">Captive</div><div class="wb-v">₱${fmt(capT, 2)}<small>/kWh</small></div><div class="wb-s">₱${fmt(capT * c.kwh)} a month</div></div>
      <div class="wb-col"><div class="wb-l">With this offer</div><div class="wb-v">₱${fmt(retT, 2)}<small>/kWh</small></div><div class="wb-s">₱${fmt(retT * c.kwh)} a month</div></div>
      <div class="wb-col ${save < 0 ? "neg" : ""}"><div class="wb-l">${save >= 0 ? "Whole-bill saving" : "Whole-bill increase"}</div><div class="wb-v">${fmt(Math.abs(pct), 1)}<small>%</small></div><div class="wb-s">₱${fmt(Math.abs(save))} a month</div></div>`;
    $(".wb-note", body).textContent = BILL.touched
      ? "Using your figures. Wires and other charges are the same whether you stay captive or switch, so they change the percentage, not the peso saving."
      : `Starting figures are scaled from the ${X.bill.source}. ${X.bill.caveat} Wires and other charges are the same whether you stay captive or switch.`;
  }

  function setupWholeBill() {
    const anchor = $("#calcRateNote");
    if (!anchor) return;
    anchor.insertAdjacentHTML("afterend", `
      <details class="whole-bill" id="wholeBill">
        <summary><span data-i18n="whole_bill">${t("whole_bill")}</span><small>generation plus wires and other charges</small></summary>
        <div id="wholeBillBody"></div>
      </details>`);
    $("#wholeBill").addEventListener("toggle", renderWholeBill);
    document.addEventListener("rm:calc", () => { if ($("#wholeBill")?.open) renderWholeBill(); });
  }

  /* ======================================================================
     4. MARKET STRUCTURE (suppliers view)
     ====================================================================== */
  function structureData() {
    const res = A.RD.res_suppliers_expanded || [];
    const SOLO = /^(Others|.*\*)$/;
    const groups = new Map();
    res.forEach((r) => {
      const key = SOLO.test(r.group || "Others") ? `${r.shortname}` : r.group.replace(/ Group$/, "");
      const g = groups.get(key) || { name: key, share: 0, mw: 0, members: [], solo: SOLO.test(r.group || "Others") };
      g.share += r.share_pct || 0; g.mw += r.mw || 0; g.members.push(r);
      groups.set(key, g);
    });
    const list = [...groups.values()].sort((a, b) => b.share - a.share);
    const hhiGroup = list.reduce((a, g) => a + g.share * g.share, 0);
    const hhiSupplier = res.reduce((a, r) => a + (r.share_pct || 0) ** 2, 0);
    const aff = res.map((r) => {
      const m = String(r.affiliate_sourcing || "").match(/(\d+)%/);
      return { ...r, aff: m ? +m[1] : null };
    });
    return { list, hhiGroup, hhiSupplier, aff, top5: list.slice(0, 5).reduce((a, g) => a + g.share, 0) };
  }

  function renderStructure() {
    const box = A.el.suppListContainer;
    if (!box) return;
    const d = structureData();
    const band = (h) => (h < 1500 ? "unconcentrated" : h < 2500 ? "moderately concentrated" : "highly concentrated");
    const max = d.list[0]?.share || 1;
    const affGroups = new Map();
    d.aff.forEach((r) => {
      const k = r.group.replace(/ Group$/, "");
      const g = affGroups.get(k) || { name: k, share: 0, aff: r.aff, text: r.affiliate_sourcing };
      g.share += r.share_pct || 0; affGroups.set(k, g);
    });
    const affList = [...affGroups.values()].filter((g) => g.aff !== null || /affiliate/i.test(g.text || "")).sort((a, b) => b.share - a.share);
    const over = d.aff.filter((r) => r.aff !== null && r.aff > 50);
    const overShare = over.reduce((a, r) => a + (r.share_pct || 0), 0);
    if (A.el.suppMarketBanner) A.el.suppMarketBanner.style.display = "none";
    const ssw = $("#viewSuppliers .search-input-wrap"); if (ssw) ssw.style.display = "none";
    if (A.el.suppGroupChipsRow) A.el.suppGroupChipsRow.style.display = "none";
    if (A.el.suppCountBadge) A.el.suppCountBadge.textContent = `${(A.RD.res_suppliers_expanded || []).length} RES`;
    box.innerHTML = `
      <div class="struct">
        <div class="struct-kpis">
          <div class="sim-kpi"><div class="sim-kpi-l">Concentration by group (HHI)</div><div class="sim-kpi-v">${fmt(d.hhiGroup)}</div><div class="sim-kpi-s">${band(d.hhiGroup)}</div></div>
          <div class="sim-kpi"><div class="sim-kpi-l">By individual supplier</div><div class="sim-kpi-v">${fmt(d.hhiSupplier)}</div><div class="sim-kpi-s">${band(d.hhiSupplier)}</div></div>
          <div class="sim-kpi"><div class="sim-kpi-l">Five largest groups</div><div class="sim-kpi-v">${fmt(d.top5, 1)}<small>%</small></div><div class="sim-kpi-s">of CREM demand</div></div>
          <div class="sim-kpi"><div class="sim-kpi-l">Recorded above the 50% cap</div><div class="sim-kpi-v">${over.length}<small> suppliers</small></div><div class="sim-kpi-s">${fmt(overShare, 1)}% of CREM demand</div></div>
        </div>

        <div class="sim-label">Share of CREM demand by group</div>
        <div class="struct-bars">
          ${d.list.slice(0, 12).map((g) => `
            <div class="sb-row"><span class="sb-n">${esc(g.name)}${g.members.length > 1 ? `<small>${g.members.length} suppliers</small>` : ""}</span>
              <span class="sb-b"><i style="width:${(g.share / max) * 100}%"></i></span><span class="sb-v">${fmt(g.share, 1)}%</span></div>`).join("")}
        </div>

        <div class="sim-label" style="margin-top:14px;">Sourcing from affiliated generators</div>
        <div class="struct-aff">
          ${affList.map((g) => `
            <div class="sa-row"><span class="sb-n">${esc(g.name)}<small>${fmt(g.share, 1)}% of demand</small></span>
              <span class="sa-b">${g.aff !== null ? `<i class="${g.aff > 50 ? "over" : ""}" style="width:${g.aff}%"></i>` : `<em>not stated</em>`}<b class="cap" title="50% cap"></b></span>
              <span class="sb-v">${g.aff !== null ? `${g.aff}%` : "—"}</span></div>`).join("")}
        </div>
        <div class="sim-foot">The line marks the 50% cap on sourcing from affiliated generation companies (ERC Res. No. 13, s. 2024, Module C12.4). Affiliate percentages are the group-level figures recorded in the supplier data, not a contract-by-contract census. HHI uses CREM demand shares; under 1,500 is unconcentrated and over 2,500 highly concentrated (US DOJ/FTC bands). Suppliers listed under “Others”, Marubeni and Alsons are treated as independent.</div>
      </div>`;
  }

  function setupStructure() {
    const bar = $("#viewSuppliers .calc-mode-bar");
    if (!bar) return;
    bar.insertAdjacentHTML("beforeend", `<button class="calc-mode-pill struct-pill" id="structPill" data-i18n="tab_structure">${t("tab_structure")}</button>`);
    const pill = $("#structPill");
    pill.addEventListener("click", () => {
      $$(".calc-mode-pill[data-stype]").forEach((b) => b.classList.remove("active"));
      pill.classList.add("active");
      renderStructure();
    });
    $$(".calc-mode-pill[data-stype]").forEach((b) => b.addEventListener("click", () => {
      pill.classList.remove("active");
      if (A.el.suppGroupChipsRow) A.el.suppGroupChipsRow.style.removeProperty("display");
      if (A.el.suppMarketBanner) A.el.suppMarketBanner.style.removeProperty("display");
      const ssw = $("#viewSuppliers .search-input-wrap"); if (ssw) ssw.style.removeProperty("display");
    }));
  }

  /* ======================================================================
     5. COMPLETE MAP (off-grid and no-data utilities)
     ====================================================================== */
  let extraLayer = null;
  let showExtra = store.get("layers", "1") === "1";

  function renderExtraLayer() {
    const map = A.state.map;
    if (!map || typeof L === "undefined") return;
    if (extraLayer) extraLayer.clearLayers(); else extraLayer = L.layerGroup().addTo(map);
    if (!showExtra) return;
    const grid = A.state.gridFilter;
    const gridOf = (g) => String(g || "").replace("Off-Grid ", "");
    const imp = X.impact || {};
    (X.offgrid || []).forEach((d) => {
      if (d.lat == null || (grid !== "all" && gridOf(d.grid) !== grid)) return;
      const m = L.marker([d.lat, d.lon], {
        icon: L.divIcon({ className: "custom-div-icon", html: '<div class="xmark off"></div>', iconSize: [10, 10], iconAnchor: [5, 5] }),
        zIndexOffset: -500, keyboard: false,
      });
      m.bindPopup(`<div class="xpop"><b>${esc(d.acronym)}</b> <span class="xtag off">Off-grid</span><div>${esc(d.name)} · ${esc(d.province)}</div>
        <p>${esc(d.reason)}</p>
        ${d.workbook_ongrid ? `<p class="xflag">The impairment workbook counts ${esc(d.acronym)} as on-grid. Check which is right.</p>` : ""}</div>`, { maxWidth: 260 });
      extraLayer.addLayer(m);
    });
    (X.missing_ongrid || []).forEach((d) => {
      if (d.lat == null || d.app_says_offgrid || (grid !== "all" && d.region !== grid)) return;
      const v = imp[d.acronym];
      const m = L.marker([d.lat, d.lon], {
        icon: L.divIcon({ className: "custom-div-icon", html: '<div class="xmark nodata"></div>', iconSize: [10, 10], iconAnchor: [5, 5] }),
        zIndexOffset: -400, keyboard: false,
      });
      m.bindPopup(`<div class="xpop"><b>${esc(d.acronym)}</b> <span class="xtag">No retail data</span><div>${esc(d.type)} · ${esc(d.region)}</div>
        <p>On-grid, but not in the August 2026 MOS retail data.</p>
        ${v ? `<p>Roadmap exposure (workbook): ₱${fmt(v.steps["100"].exposure_php / 1e6, 1)}M a year at 100 kW, ₱${fmt(v.steps["50"].exposure_php / 1e6, 1)}M at 50 kW.</p>` : ""}</div>`, { maxWidth: 260 });
      extraLayer.addLayer(m);
    });
  }

  // Keep the map buttons just below the header, whatever its height on this phone
  function placeMapButtons() {
    const panel = $(".top-panel");
    const rec = $("#centerMapBtn"), lay = $("#layersBtn");
    if (!panel || !rec) return;
    const appTop = $("#app").getBoundingClientRect().top;
    const y = panel.getBoundingClientRect().bottom - appTop + 6;
    rec.style.top = `${y}px`;
    if (lay) lay.style.top = `${y + rec.offsetHeight + 8}px`;
  }

  function setupMapLayers() {
    const fab = $("#centerMapBtn");
    if (!fab) return;
    fab.insertAdjacentHTML("afterend", `<button class="fab-layers ${showExtra ? "active" : ""}" id="layersBtn" title="Show off-grid and no-data utilities" aria-pressed="${showExtra}">${ICON.layers}</button>`);
    $("#layersBtn").addEventListener("click", (e) => {
      showExtra = !showExtra;
      store.set("layers", showExtra ? "1" : "0");
      e.currentTarget.classList.toggle("active", showExtra);
      e.currentTarget.setAttribute("aria-pressed", showExtra);
      renderExtraLayer();
      A.showToast(showExtra ? "Showing off-grid and no-data utilities" : "Hiding off-grid and no-data utilities");
    });
    $$(".pill-btn").forEach((b) => b.addEventListener("click", () => setTimeout(renderExtraLayer, 0)));
    renderExtraLayer();
  }

  /* ======================================================================
     6. SHARE LINKS & EXPORTS
     ====================================================================== */
  function baseUrl() { return `${location.origin === "null" ? "" : location.origin}${location.pathname}`; }

  function copyText(text, msg) {
    const done = () => A.showToast(msg);
    if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      navigator.share({ url: text }).catch(() => {});
      return;
    }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => prompt("Copy this link", text));
    else prompt("Copy this link", text);
  }

  function duLink(du) { return `${baseUrl()}?du=${encodeURIComponent(du.id)}`; }

  function calcLink() {
    const st = A.state;
    const p = new URLSearchParams({ view: "viewCalculator", mode: st.calcMode, cdu: st.calcDuId, kw: st.calcKw, kwh: st.calcKwh });
    const sel = A.el.calcSupplierSelect;
    if (sel && sel.value !== "wap") p.set("offer", sel.value);
    if (st.calcMode === "rap") { p.set("members", st.calcRapMembers); p.set("kwm", st.calcRapKwPerMember); }
    return `${baseUrl()}?${p}`;
  }

  function applyUrlState() {
    const q = new URLSearchParams(location.search);
    const st = A.state;
    if (q.get("du")) A.selectDuById(q.get("du"), true);
    if (q.get("view") === "viewCalculator") {
      if (q.get("cdu") && A.el.calcDuSelect) { A.el.calcDuSelect.value = q.get("cdu"); st.calcDuId = q.get("cdu"); }
      if (q.get("kw")) { st.calcKw = +q.get("kw"); if (A.el.calcKwInput) A.el.calcKwInput.value = st.calcKw; }
      if (q.get("members")) { st.calcRapMembers = +q.get("members"); if (A.el.calcRapMembersInput) A.el.calcRapMembersInput.value = st.calcRapMembers; }
      if (q.get("kwm")) { st.calcRapKwPerMember = +q.get("kwm"); if (A.el.calcRapKwPerMember) A.el.calcRapKwPerMember.value = st.calcRapKwPerMember; }
      A.updateCalculatorModeUI();
      if (q.get("kwh")) { st.calcKwh = +q.get("kwh"); st.kwhTouched = true; if (A.el.calcKwhInput) A.el.calcKwhInput.value = st.calcKwh; }
      if (q.get("offer") && A.el.calcSupplierSelect) A.el.calcSupplierSelect.value = q.get("offer");
      A.recalcSavings();
    }
  }

  function csvExport() {
    const cols = [
      ["acronym", "Acronym"], ["name", "Name"], ["grid", "Grid"], ["type", "Type"], ["province", "Area"],
      ["crem_eus", "CREM end-users"], ["crem_mw", "CREM MW"], ["geop_eus", "GEOP end-users"], ["geop_mw", "GEOP MW"],
      ["rap_groups", "RAP groups"], ["rap_mw", "RAP MW"], ["captive_p5_eus", "50-99 kW captive end-users"],
      ["base_rate", "Captive generation rate (PHP/kWh)"], ["urr_month", "Rate month"],
      ["switching_penetration_pct", "Switching %"],
    ];
    const q = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const imp = X.impact || {};
    const rows = (A.RD.dus || []).map((d) => {
      const base = cols.map(([k]) => (k === "base_rate" ? A.rateNum(d) : d[k]));
      const v = imp[d.acronym];
      return [...base, A.isStaleRate(d) ? "yes" : "no", v ? Math.round(v.steps["100"].exposure_php) : "", v ? Math.round(v.steps["50"].exposure_php) : ""].map(q).join(",");
    });
    const head = [...cols.map(([, h]) => h), "Rate older than market data", "Take-or-pay exposure at 100 kW (PHP/yr)", "Take-or-pay exposure at 50 kW (PHP/yr)"].map(q).join(",");
    const blob = new Blob([`﻿${head}\n${rows.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `retailmarket-ph-utilities-${A.REPORT_LABEL.replace(/\s/g, "-").toLowerCase()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    A.showToast("CSV downloaded");
  }

  function printProfile(du) {
    const v = (X.impact || {})[du.acronym];
    const chg = CH?.rate_changes?.find((c) => c.acronym === du.acronym);
    let sheet = $("#printSheet");
    if (!sheet) { sheet = document.createElement("div"); sheet.id = "printSheet"; document.body.appendChild(sheet); }
    const row = (k, val) => `<tr><th>${k}</th><td>${val}</td></tr>`;
    sheet.innerHTML = `
      <h1>${esc(du.acronym)}</h1>
      <p class="ps-sub">${esc(du.name)} · ${esc(du.province)} · ${esc(du.grid)} grid · ${esc(du.type)}</p>
      <h2>Retail market (${esc(A.REPORT_LABEL)})</h2>
      <table>
        ${row("CREM end-users", `${fmt(du.crem_eus)} (${fmt(du.crem_mw, 1)} MW)`)}
        ${row("GEOP end-users", `${fmt(du.geop_eus)} (${fmt(du.geop_mw, 1)} MW)`)}
        ${row("RAP groups", `${fmt(du.rap_groups)} (${fmt(du.rap_members)} members, ${fmt(du.rap_mw, 1)} MW)`)}
        ${row("By phase", `≥1 MW ${fmt(du.crem_p1)} · 750–999 kW ${fmt(du.crem_p2)} · 500–749 kW ${fmt(du.crem_p3)} · 100–499 kW ${fmt(du.crem_p4)}`)}
        ${row("Captive 50–99 kW", `${fmt(du.captive_p5_eus)} end-users (${fmt(du.captive_p5_mw, 1)} MW)`)}
        ${row("Switching penetration", `${du.switching_penetration_pct || 0}%`)}
      </table>
      <h2>Prices</h2>
      <table>
        ${row("Captive generation rate", `${A.fmtRate(du)}/kWh (${esc(A.fmtMonth(du.urr_month))})${A.isStaleRate(du) ? " — older than the market data" : ""}`)}
        ${chg ? row(`Latest URR filing (${esc(chg.new_month)})`, `₱${chg.new_rate.toFixed(4)}/kWh${chg.check ? " — moved more than 25%; check" : ""}`) : ""}
        ${row("CREM / GEOP / RAP averages", `₱${A.MARKET_WAP.crem.toFixed(2)} / ₱${A.MARKET_WAP.geop.toFixed(2)} / ₱${A.MARKET_WAP.rap.toFixed(2)} per kWh`)}
        ${du.wesm_data?.latest_rate ? row("WESM purchases", `₱${du.wesm_data.latest_rate.toFixed(4)}/kWh, ${du.wesm_data.genmix_pct}% of supply`) : ""}
        ${du.psa_summary ? row("Bilateral PSAs", `${du.psa_summary.total_contracts} contracts, ${fmt(du.psa_summary.total_contracted_mw)} MW`) : ""}
      </table>
      ${v ? `<h2>Roadmap exposure (impairment workbook)</h2>
      <table><tr><th>Threshold</th><th>Stranded MW</th><th>Take-or-pay ₱/yr</th><th>Captive ₱/kWh</th></tr>
        ${STEP_KW.map((kw) => { const s = v.steps[String(kw)]; return `<tr><td>${kw} kW</td><td>${fmt(s.stranded_mw, 1)}</td><td>₱${fmt(s.exposure_php / 1e6, 1)}M</td><td>₱${fmt(s.hike_php_kwh, 3)}</td></tr>`; }).join("")}
      </table><p class="ps-note">Risk level: ${esc(v.risk || "")}. Full take-up (100%) stress values.</p>` : ""}
      <p class="ps-foot">RetailMarket PH · printed ${new Date().toLocaleDateString()} · ${esc(duLink(du))}</p>`;
    document.body.classList.add("printing");
    window.print();
    setTimeout(() => document.body.classList.remove("printing"), 500);
  }

  function setupShare() {
    // DU card actions
    const row = $(".du-header-row");
    if (row) {
      row.insertAdjacentHTML("beforeend", `
        <div class="card-actions">
          <button class="card-act" id="shareDuBtn" title="Copy a link to this utility" aria-label="Share utility">${ICON.share}</button>
          <button class="card-act" id="printDuBtn" title="Print or save a one-page profile" aria-label="Print profile">${ICON.print}</button>
        </div>`);
      const toggle = $("#cardToggleBtn");
      if (toggle) $(".card-actions").appendChild(toggle);
      $("#shareDuBtn").addEventListener("click", (e) => { e.stopPropagation(); const du = A.state.selectedDu; if (du) copyText(duLink(du), "Link copied"); });
      $("#printDuBtn").addEventListener("click", (e) => { e.stopPropagation(); const du = A.state.selectedDu; if (du) printProfile(du); });
    }
    // Calculator share
    const copy = $("#copyCalcReportBtn");
    if (copy) {
      copy.insertAdjacentHTML("beforebegin", `<button class="action-link-btn" id="shareCalcBtn" title="Copy a link to this calculation">${ICON.share}<span>Share</span></button>`);
      $("#shareCalcBtn").addEventListener("click", () => copyText(calcLink(), "Link to this calculation copied"));
      copy.parentElement.classList.add("calc-actions-row");
      const wrap = document.createElement("div"); wrap.className = "calc-actions";
      copy.parentElement.insertBefore(wrap, $("#shareCalcBtn")); wrap.appendChild($("#shareCalcBtn")); wrap.appendChild(copy);
    }
    // Directory CSV
    const badge = $("#dirCountBadge");
    if (badge) {
      badge.insertAdjacentHTML("afterend", `<button class="action-link-btn" id="csvBtn" title="Download all utilities as CSV">${ICON.download}<span>CSV</span></button>`);
      const w = document.createElement("div"); w.className = "calc-actions"; badge.parentElement.insertBefore(w, badge); w.appendChild(badge); w.appendChild($("#csvBtn"));
      $("#csvBtn").addEventListener("click", csvExport);
    }
    // Keep the address bar in step with the selected utility
    document.addEventListener("rm:select", (e) => {
      try {
        const p = new URLSearchParams(location.search);
        p.set("du", e.detail.id);
        ["view", "mode", "cdu", "kw", "kwh", "offer", "members", "kwm"].forEach((k) => p.delete(k));
        history.replaceState(null, "", `${location.pathname}?${p}`);
      } catch (err) { /* history unavailable on some file:// contexts */ }
    });
  }

  /* ======================================================================
     7. WHAT CHANGED (from tools/update_check.py)
     ====================================================================== */
  function changesHtml() {
    if (!CH) return `<div class="notes-text">Run <code>tools/update_check.py</code> after each new URR or MOS release to see what changed here.</div>`;
    const flagged = CH.rate_changes.filter((c) => c.check);
    const top = CH.rate_changes.slice(0, 12);
    return `
      <div class="notes-text">Captive rates in the app compared with <b>${esc(CH.urr_source.replace(/^\d+_|\.md$/g, "").replace(/_/g, " ").toLowerCase())}</b> (${esc(CH.urr_month)}), checked ${esc(CH.generated)}. ${CH.rate_changes.length} utilities matched; ${flagged.length} moved more than 25%, which usually means a reporting problem in the filing rather than a real change. Nothing has been overwritten.</div>
      <table class="chg-table">
        <thead><tr><th>Utility</th><th class="num">In app</th><th class="num">${esc(CH.urr_month)}</th><th class="num">Change</th></tr></thead>
        <tbody>${top.map((c) => `<tr class="${c.check ? "flag" : ""}"><td>${esc(c.acronym)}</td><td class="num">₱${c.old_rate.toFixed(2)}</td><td class="num">₱${c.new_rate.toFixed(2)}</td><td class="num">${c.pct > 0 ? "+" : ""}${c.pct}%</td></tr>`).join("")}</tbody>
      </table>
      <div class="notes-text" style="color:#66728a;">Largest moves first. The full list is in CHANGES_REPORT.md.${CH.data_changes?.length ? ` ${CH.data_changes.length} totals changed since the previous data file.` : ""}</div>`;
  }

  function setupDataNotes() {
    const modal = $("#dataNotesModal");
    const box = $("#dataNotesContainer");
    if (!modal || !box) return;
    const extend = () => {
      if ($("#langPicker", box)) return;
      box.insertAdjacentHTML("afterbegin", `
        <div class="notes-section">
          <div class="notes-heading" data-i18n="lang">${t("lang")}</div>
          <div class="sim-chips" id="langPicker">
            ${[["en", "English"], ["fil", "Filipino"], ["ceb", "Cebuano"]].map(([k, l]) => `<button class="sim-chip ${k === lang ? "active" : ""}" data-lang="${k}">${l}</button>`).join("")}
          </div>
          ${lang !== "en" ? `<div class="notes-text" style="margin-top:6px;color:#66728a;">${esc(t("lang_note"))} Data labels, the 501 FAQ answers and figures stay in English.</div>` : ""}
        </div>
        <div class="notes-section">
          <div class="notes-heading">What changed</div>
          ${changesHtml()}
        </div>
        <div class="notes-section">
          <div class="notes-heading">Map key</div>
          <div class="notes-text map-key">
            <span><i class="kd crem"></i>Utility, sized by MW in the selected program</span>
            <span><i class="kd sq"></i>NGCP directly connected customers</span>
            <span><i class="xmark nodata"></i>On-grid, not in the retail data</span>
            <span><i class="xmark off"></i>Off-grid, exempt from retail competition</span>
          </div>
        </div>`);
      $$("#langPicker .sim-chip", box).forEach((b) => b.addEventListener("click", () => {
        lang = b.dataset.lang; store.set("lang", lang); applyLanguage();
        box.innerHTML = ""; // re-rendered on next open by app.js
        $("#brandPill")?.click();
      }));
    };
    new MutationObserver(() => { if (box.children.length && !$("#langPicker", box)) extend(); }).observe(box, { childList: true });
  }

  /* DU card: show the newest filing and roadmap exposure in the drawer */
  function enrichDuCard(du) {
    const ov = $("#dtabOverview");
    if (ov) {
      $("#xDuLatest")?.remove();
      const chg = CH?.rate_changes?.find((c) => c.acronym === du.acronym);
      if (chg) {
        ov.insertAdjacentHTML("beforeend", `<div class="drawer-section" id="xDuLatest"><div class="drawer-heading">Newest URR filing</div>
          <div class="notes-text">${esc(chg.new_month)}: ₱${chg.new_rate.toFixed(4)}/kWh against ₱${chg.old_rate.toFixed(4)} in the app (${chg.pct > 0 ? "+" : ""}${chg.pct}%).${chg.check ? " That's a move of more than 25%; check the filing before relying on it." : ""}</div></div>`);
      }
    }
    const ph = $("#dtabPhases");
    if (ph) {
      $("#xDuExposure")?.remove();
      const v = (X.impact || {})[du.acronym];
      if (v) {
        ph.insertAdjacentHTML("beforeend", `<div class="drawer-section" id="xDuExposure"><div class="drawer-heading">Roadmap exposure</div>
          <table class="mini-table"><thead><tr><th>Threshold</th><th class="num">Idle MW</th><th class="num">₱M / yr</th><th class="num">₱/kWh</th></tr></thead><tbody>
          ${STEP_KW.map((kw) => { const s = v.steps[String(kw)]; return `<tr><td>${kw} kW</td><td class="num">${fmt(s.stranded_mw, 1)}</td><td class="num">${fmt(s.exposure_php / 1e6, 1)}</td><td class="num">${fmt(s.hike_php_kwh, 2)}</td></tr>`; }).join("")}
          </tbody></table><div class="sim-foot">Full take-up stress values from the impairment workbook. Risk level: ${esc(v.risk || "—")}.</div></div>`);
      }
    }
  }

  /* ======================================================================
     8. SWITCHING GUIDE (FAQ view)
     ====================================================================== */
  let faqMode = "guide";
  function renderGuide() {
    const box = $("#faqListContainer");
    if (!box || !X.guide) return;
    box.innerHTML = `
      <div class="guide">
        <p class="guide-intro">${esc(t("guide_intro"))}</p>
        <ol class="guide-steps">
          ${X.guide.steps.map((s) => `
            <li class="guide-step">
              <div class="gs-head"><span class="gs-title">${esc(t(`g_${s.key}`))}</span>${s.days ? `<span class="gs-days">${s.key === "loi" ? "≥ " : "≤ "}${esc(t("g_days", s.days))}</span>` : ""}</div>
              <p>${esc(t(`g_${s.key}_b`))}</p>
            </li>`).join("")}
        </ol>
        <p class="guide-note">${esc(t("g_notes"))}</p>
        <p class="guide-src"><b>${esc(t("g_sources"))}:</b> ${X.guide.sources.map(esc).join("; ")}.</p>
      </div>`;
  }

  function setupGuide() {
    const head = $("#viewFaq .view-header");
    if (!head || !X.guide) return;
    head.insertAdjacentHTML("beforeend", `
      <div class="calc-mode-bar faq-mode-bar" style="margin-top:8px;">
        <button class="calc-mode-pill active" data-fmode="guide" data-i18n="tab_guide">${t("tab_guide")}</button>
        <button class="calc-mode-pill" data-fmode="faq" data-i18n="tab_faq">${t("tab_faq")}</button>
      </div>`);
    const faqBits = [$("#viewFaq .search-input-wrap"), $("#viewFaq .faq-chips-row")];
    const setMode = (m) => {
      faqMode = m;
      $$(".faq-mode-bar .calc-mode-pill").forEach((b) => b.classList.toggle("active", b.dataset.fmode === m));
      faqBits.forEach((x) => x && (x.style.display = m === "faq" ? "" : "none"));
      if (m === "guide") renderGuide();
      else $("#viewFaq .faq-chip.active")?.click() || A.el.faqSearchInput?.dispatchEvent(new Event("input"));
    };
    $$(".faq-mode-bar .calc-mode-pill").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.fmode)));
    // FAQ title/count lines refer to the 501 questions; keep them but they sit under the toggle
    setMode("guide");
  }

  /* ======================================================================
     9. INSTALL & OFFLINE
     ====================================================================== */
  function setupPwa() {
    if (!/^https?:$/.test(location.protocol) || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  /* ======================================================================
     BOOT
     ====================================================================== */
  function boot() {
    A = window.RMApp;
    if (!A) return;
    setupRoadmapTabs();
    setupWholeBill();
    setupStructure();
    setupMapLayers();
    setupShare();
    setupDataNotes();
    setupGuide();
    setupPwa();
    placeMapButtons();
    window.addEventListener("resize", placeMapButtons);
    window.addEventListener("orientationchange", () => setTimeout(placeMapButtons, 300));
    if (document.fonts?.ready) document.fonts.ready.then(placeMapButtons);
    document.addEventListener("click", (e) => {
      const g = e.target.closest("[data-goto-guide]");
      if (!g) return;
      e.preventDefault();
      A.switchView("viewFaq");
      $('.faq-mode-bar [data-fmode="guide"]')?.click();
    });
    document.addEventListener("rm:select", (e) => enrichDuCard(e.detail));
    if (A.state.selectedDu) enrichDuCard(A.state.selectedDu);
    applyLanguage();
    applyUrlState();
    // Extend the data checks with the map discrepancy
    const disc = (X.offgrid || []).filter((d) => d.workbook_ongrid).map((d) => d.acronym);
    if (disc.length) window.RMApp.extraChecks = [{ level: "medium", title: `${disc.join(" and ")} are off-grid in the app but on-grid in the impairment workbook`, detail: "Both are counted in the workbook's 121 on-grid utilities and its ₱38.34B figure. Decide which list is right." }];
  }

  if (window.RMApp && window.RMApp.state.map) boot();
  else document.addEventListener("rm:ready", boot, { once: true });
})();
