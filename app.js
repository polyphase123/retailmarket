/**
 * RetailMarket PH — Apple Minimalist Mobile Power Choice Application
 * Strictly On-Grid (WESM Interconnected) · Zero API Errors · 60fps Native
 */

(function () {
  "use strict";

  // Application State
  const state = {
    currentView: "viewMap",
    map: null,
    markersLayer: null,
    markersMap: new Map(),
    programFilter: "all", // "all", "crem", "geop", "rap"
    gridFilter: "all",    // "all", "Luzon", "Visayas", "Mindanao"
    searchQuery: "",
    selectedDu: null,
    cardExpanded: false,
    activeDrawerTab: "overview",
    psaFilter: "all",
    dirSortBy: "crem_mw",
    dirSearchQuery: "",
    faqQuery: "",
    
    // Calculator State
    calcMode: "crem", // "crem", "geop", "rap"
    calcKw: 150,
    calcDuId: "meralco",
    calcSupplierKey: "wap",
    calcKwh: 65700,
    kwhTouched: false,
    calcRapMembers: 10,
    calcRapKwPerMember: 15,

    // Suppliers View State
    suppType: "res", // "res", "geop", "rap"
    suppSearchQuery: "",
    suppGroupFilter: "all",

    // Roadmap View State
    roadmapMode: "proposed", // "proposed", "historical"

    // Utility Comparator State
    compareDu1Id: "meralco",
    compareDu2Id: "veco",

    // Power Market Prices State
    pricesMode: "matrix", // "matrix", "spot", "arbitrage"
    arbitrageDuId: "meralco",

    toastTimer: null,
  };

  // Island Grid Coordinate Bounds for Smooth Camera Pan
  const GRID_BOUNDS = {
    all: [[4.8, 117.0], [21.0, 126.6]],
    Luzon: [[12.2, 119.5], [18.8, 124.5]],
    Visayas: [[9.2, 121.7], [12.6, 126.0]],
    Mindanao: [[5.3, 121.5], [9.9, 126.6]],
  };

  // Landmark utilities to show subtle preview label
  const LANDMARKS = new Set(["MERALCO", "VECO", "DLPC", "CEPALCO", "MORE"]);

  // ---- Single source of truth: every market figure is read from data.js ----
  const RD = window.RETAIL_MARKET_DATA || {};
  const MP = RD.market_prices || {};
  const SPOT_MKT = MP.spot_market || {};
  const RETAIL_MKT = MP.retail_market || {};
  const CAPTIVE_MKT = MP.captive_market || {};

  // Market Benchmark Weighted Average Prices (WAP) — from data.js market_prices
  const MARKET_WAP = {
    crem: RETAIL_MKT.crem_wap ?? 5.83,
    geop: RETAIL_MKT.geop_wap ?? 6.12,
    rap: RETAIL_MKT.rap_wap ?? 5.84,
    wesm: SPOT_MKT.national_gwap ?? 4.4038,
  };
  const REGIONAL_GWAP = {
    Luzon: SPOT_MKT.luzon_gwap,
    Visayas: SPOT_MKT.visayas_gwap,
    Mindanao: SPOT_MKT.mindanao_gwap,
  };

  // Calculator assumptions
  const HOURS_PER_MONTH = 730;
  const DEFAULT_LOAD_FACTOR = 0.6;   // used to suggest kWh from kW
  const STALE_MONTHS = 6;            // captive rate older than this vs. report period is flagged

  // ---- Helpers: rates, dates, data quality ----
  const MONTH_IDX = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function parseMonth(str) {
    const m = String(str || "").match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})/i);
    return m ? new Date(parseInt(m[2], 10), MONTH_IDX[m[1].toLowerCase()], 1) : null;
  }
  function fmtMonth(str) {
    const d = parseMonth(str);
    return d ? `${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}` : (str ? String(str) : "Undated");
  }
  const REPORT_DATE = parseMonth(RD.summary?.report_period) || new Date(2026, 7, 1);
  const REPORT_LABEL = fmtMonth(RD.summary?.report_period || "Aug 2026");
  function monthsOld(str) {
    const d = parseMonth(str);
    if (!d) return null;
    return (REPORT_DATE.getFullYear() - d.getFullYear()) * 12 + (REPORT_DATE.getMonth() - d.getMonth());
  }
  function isStaleRate(du) {
    const age = monthsOld(du?.urr_month);
    return age === null || age > STALE_MONTHS;
  }
  function rateNum(du) {
    const m = String(du?.base_rate ?? "").match(/[\d.]+/);
    return m ? parseFloat(m[0]) : null;
  }
  function fmtRate(du) {
    const n = rateNum(du);
    return n !== null ? `₱${n.toFixed(4)}` : "n/a";
  }
  function staleTag(du) {
    if (!isStaleRate(du)) return "";
    const age = monthsOld(du?.urr_month);
    const why = age === null ? "undated captive rate" : `captive rate is ${age} months older than the ${REPORT_LABEL} market data`;
    return ` <span class="stale-flag" title="${why}">${age === null ? "Undated" : "Old rate"}</span>`;
  }
  function isDistributionUtility(du) {
    return (du?.type || "") !== "Transmission";
  }
  function regionalGwap(grid) {
    return REGIONAL_GWAP[grid] ?? MARKET_WAP.wesm;
  }
  function duSpotRate(du) {
    return du?.wesm_data?.latest_rate || regionalGwap(du?.grid);
  }
  function peso(n, dp = 4) {
    return `₱${Number(n).toFixed(dp)}`;
  }
  function signedPeso(n) {
    return `${n >= 0 ? "" : "−"}₱${Math.abs(Math.round(n)).toLocaleString()}`;
  }

  /**
   * Data-quality checks, recomputed from data.js on every load,
   * so they disappear automatically once the underlying data is fixed.
   */
  function runDataChecks() {
    const dus = RD.dus || [];
    const S = RD.summary || {};
    const checks = [];
    const sum = (k) => dus.reduce((a, d) => a + (Number(d[k]) || 0), 0);
    const RIBBON_NOTE = "The map ribbon and directory add up the per-utility figures; the prices screen and supplier banners use the summary figure, so the two disagree.";
    const cmp = (label, got, want, dp, detail = RIBBON_NOTE) => {
      if (want === undefined || want === null) return;
      if (Math.abs(got - want) > (dp ? 0.05 : 0)) {
        checks.push({
          level: "high",
          title: `${label}: utilities add up to ${dp ? got.toFixed(2) : got.toLocaleString()}, summary says ${dp ? Number(want).toFixed(2) : Number(want).toLocaleString()}`,
          detail,
        });
      }
    };
    cmp("CREM end-users", sum("crem_eus"), S.crem?.total_eus);
    cmp("CREM MW", sum("crem_mw"), S.crem?.total_mw, true);
    cmp("GEOP end-users", sum("geop_eus"), S.geop?.total_eus);
    cmp("GEOP MW", sum("geop_mw"), S.geop?.total_mw, true);
    cmp("RAP groups", sum("rap_groups"), S.rap?.total_groups);
    cmp("RAP MW", sum("rap_mw"), S.rap?.total_mw, true);
    const captive14 = [1, 2, 3, 4].reduce((a, i) => a + sum(`captive_p${i}_eus`), 0);
    cmp("Captive eligible end-users (Phases I–IV)", captive14, S.captive_pipeline?.total_eligible_phases_1_4, false,
      "Eligible customers still on the captive rate. A gap this large usually means one of the two counts covers a different scope (e.g. all eligible vs. not yet switched).");

    const nonDu = dus.filter((d) => !isDistributionUtility(d));
    if (nonDu.length) {
      checks.push({
        level: "medium",
        title: `${dus.length} entries include ${nonDu.length} NGCP grid entries (${nonDu.map((d) => d.acronym).join(", ")})`,
        detail: `So the app covers ${dus.length - nonDu.length} distribution utilities plus NGCP directly-connected customers. The RCOA roadmap uses 121 on-grid DUs; confirm which count should be shown.`,
      });
    }

    const stale = dus.filter(isStaleRate);
    if (stale.length) {
      const undated = stale.filter((d) => monthsOld(d.urr_month) === null);
      checks.push({
        level: "high",
        title: `${stale.length} of ${dus.length} captive rates are more than ${STALE_MONTHS} months older than the ${REPORT_LABEL} market data`,
        detail: `Savings for these utilities compare an old captive rate against current retail prices.${undated.length ? ` ${undated.length} have no month at all (${undated.map((d) => d.acronym).join(", ")}).` : ""} Tagged “Old rate” wherever the rate appears.`,
      });
    }

    const psas = dus.flatMap((d) => (d.psas || []).map((p) => ({ ...p, du: d.acronym })));
    const placeholder = psas.filter((p) => /verification required/i.test(`${p.docket || ""} ${p.erc_case || ""}`));
    if (placeholder.length) {
      checks.push({
        level: "medium",
        title: `${placeholder.length} PSAs have a placeholder instead of an ERC case number`,
        detail: `Shown as “Verification Required”. Utilities affected: ${[...new Set(placeholder.map((p) => p.du))].join(", ")}.`,
      });
    }
    const zeroCost = psas.filter((p) => !p.annual_cost);
    if (zeroCost.length) {
      checks.push({
        level: "medium",
        title: `${zeroCost.length} of ${psas.length} PSAs have an annual cost of ₱0`,
        detail: "Any total that sums PSA costs will be understated.",
      });
    }
    const carve = psas.filter((p) => /carve-out/i.test(p.carveout_status || ""));
    if (carve.length) {
      checks.push({
        level: "low",
        title: `${carve.length} PSAs are labelled “Full Carve-Out”; ${psas.length - carve.length} are labelled “Locked”`,
        detail: "These labels carry no source citation in the data. Confirm they come from the PSA documents rather than an assumption by contract type.",
      });
    }
    const lowRate = dus.filter((d) => (rateNum(d) ?? 99) < 4);
    if (lowRate.length) {
      checks.push({
        level: "medium",
        title: `${lowRate.length} captive generation rates are below ₱4.00/kWh`,
        detail: `${lowRate.map((d) => `${d.acronym} ${fmtRate(d)}`).join(", ")}. Below the spot price, so the calculator shows retail choice as more expensive there. Confirm these are full generation charges and not a single component.`,
      });
    }
    const lowSpot = dus.filter((d) => d.wesm_data?.latest_rate && d.wesm_data.latest_rate < 2.5);
    if (lowSpot.length) {
      checks.push({
        level: "medium",
        title: `${lowSpot.length} utilities show a WESM purchase rate below ₱2.50/kWh`,
        detail: `${lowSpot.map((d) => `${d.acronym} ₱${d.wesm_data.latest_rate.toFixed(2)}`).join(", ")}. Far under the regional GWAP; may be a net-of-adjustments or partial-month figure.`,
      });
    }
    const ext = dus.filter((d) => d.switching_penetration_pct === 0 || d.switching_penetration_pct === 100);
    if (ext.length) {
      checks.push({
        level: "low",
        title: `${ext.length} utilities show exactly 0% or 100% switching`,
        detail: "Usually means the eligible-customer count is missing rather than truly zero or complete.",
      });
    }
    (window.RMApp?.extraChecks || []).forEach((c) => checks.push(c));
    return checks;
  }

  // Grid Emission Factor for GEOP Decarbonization (tCO2 / MWh)
  const GRID_EMISSION_FACTOR = 0.7122;

  // ERC Five-Year RCOA Roadmap 2027–2031
  const ROADMAP_PROPOSED = [
    {
      year: "Year 1 (2027)",
      threshold: "50 kW Unified",
      theme: "Strengthen the Foundation",
      badge: "active",
      status: "Immediate Milestone",
      details: [
        "Lower eligibility threshold to 50 kW for commercial & enterprise customers.",
        "Strengthen policies and consumer protection for small contestable consumers.",
        "Adopt mandatory national Advanced Metering Infrastructure (AMI) smart meter rollout plans.",
        "Require IEMOP to implement a Centralized Metering Data Hub modeled on Australia's MSATS.",
        "Require utility Contract Exposure Statements and Transition Plans to protect captive consumers.",
        "Adopt regulatory rules for independent third-party Retail Meter Service Providers (RMSPs)."
      ]
    },
    {
      year: "Year 2 (2028)",
      threshold: "50 kW Operational",
      theme: "Open Metering & Build the Hub",
      badge: "next",
      status: "Target: 2028",
      details: [
        "Accreditation of independent third-party RMSPs begins.",
        "Commercial launch of the IEMOP Centralized Metering Data Hub.",
        "First major wave of competitive AMI smart meter deployment across urban franchises."
      ]
    },
    {
      year: "Year 3 (2029)",
      threshold: "50 kW + Aggregation",
      theme: "Expansion & Aggregation Pilots",
      badge: "next",
      status: "Target: 2029",
      details: [
        "Accelerate smart meter rollout across electric cooperative and provincial franchises.",
        "Launch residential aggregation pilots under RAP in AMI-ready urban clusters.",
        "Conduct comprehensive Year 3 Readiness Review Gate prior to next threshold step."
      ]
    },
    {
      year: "Year 4 (2030)",
      threshold: "30 kW Threshold*",
      theme: "Reach Small Business",
      badge: "next",
      status: "Target: 2030",
      details: [
        "Lower threshold to 30 kW (subject to Year 3 Readiness Review confirmation).",
        "Design Regulated Default Market Offer (DMO) consumer price cap modeled on Australia & UK.",
        "Stress-test the Supplier of Last Resort (SOLR) mechanism for transfers of tens of thousands of customers."
      ]
    },
    {
      year: "Year 5 (2031)",
      threshold: "All End-Users (<10 kW)",
      theme: "Full Retail Competition (Household)",
      badge: "vision",
      status: "Target: 2031 Vision",
      details: [
        "Universal retail choice for every Filipino household as smart meters are registered in the data hub.",
        "One unified threshold rules for both commercial businesses and residential consumers.",
        "Regulated default supply (SOLR / DMO) remains permanently available as a safety net."
      ]
    }
  ];

  function phaseStats(key) {
    const p = RD.summary?.crem?.phases?.[key];
    return p ? `${p.eus.toLocaleString()} EUs · ${Number(p.mw).toFixed(1)} MW` : "—";
  }

  // Historical RCOA Phases (2013–2026)
  const ROADMAP_HISTORICAL = [
    {
      phase: "Phase I (2013)",
      threshold: "≥ 1,000 kW (1 MW)",
      target: "Bulk Industrial & Commercial",
      badge: "done",
      status: "Implemented",
      stats: phaseStats("p1_1mw_above"),
      desc: "Inaugural commercial launch of retail open access across interconnected Luzon, Visayas, and Mindanao WESM networks."
    },
    {
      phase: "Phase II (2016)",
      threshold: "750 kW to 999 kW",
      target: "Large Commercial",
      badge: "done",
      status: "Implemented",
      stats: phaseStats("p2_750_999kw"),
      desc: "Supreme Court permanent injunction affirmed customer choice as strictly voluntary, with right to remain captive."
    },
    {
      phase: "Phase III (2021)",
      threshold: "500 kW to 749 kW",
      target: "Medium Commercial",
      badge: "done",
      status: "Implemented",
      stats: phaseStats("p3_500_749kw"),
      desc: "Expanded customer choice to cold storage logistics, shopping malls, and secondary medical centers."
    },
    {
      phase: "Phase IV (2026)",
      threshold: "100 kW to 499 kW",
      target: "Small Commercial & Enterprise",
      badge: "active",
      status: "Active (100 kW Unified)",
      stats: phaseStats("p4_100_499kw"),
      desc: "Standardized under ERC Res. 22 (S. 2025). Enables branch banks, boutique hotels, and restaurants to contract retail power."
    }
  ];

  // DOM Cache
  const el = {};

  function cacheDom() {
    el.app = document.getElementById("app");
    el.viewMap = document.getElementById("viewMap");
    el.viewDirectory = document.getElementById("viewDirectory");
    el.viewCalculator = document.getElementById("viewCalculator");
    el.viewSuppliers = document.getElementById("viewSuppliers");
    el.viewFaq = document.getElementById("viewFaq");
    
    // Top Panel & Map
    el.map = document.getElementById("map");
    el.searchInput = document.getElementById("searchInput");
    el.clearSearchBtn = document.getElementById("clearSearchBtn");
    el.searchDropdown = document.getElementById("searchDropdown");
    el.resetBtn = document.getElementById("resetBtn");
    el.centerMapBtn = document.getElementById("centerMapBtn");
    el.calcKwhLabel = document.getElementById("calcKwhLabel");
    el.calcRateNote = document.getElementById("calcRateNote");
    el.calcLfWarning = document.getElementById("calcLfWarning");
    el.calcMonthlyLabel = document.getElementById("calcMonthlyLabel");
    el.calcAnnualLabel = document.getElementById("calcAnnualLabel");
    el.openPricesBtn = document.getElementById("openPricesBtn");
    el.openCompareBtn = document.getElementById("openCompareBtn");
    el.openRoadmapBtn = document.getElementById("openRoadmapBtn");
    el.closeRoadmapBtn = document.getElementById("closeRoadmapBtn");
    el.roadmapModal = document.getElementById("roadmapModal");
    el.roadmapContainer = document.getElementById("roadmapContainer");
    el.closePricesBtn = document.getElementById("closePricesBtn");
    el.pricesModal = document.getElementById("pricesModal");
    el.pricesContainer = document.getElementById("pricesContainer");
    el.closeCompareBtn = document.getElementById("closeCompareBtn");
    el.compareModal = document.getElementById("compareModal");
    el.compareDu1 = document.getElementById("compareDu1");
    el.compareDu2 = document.getElementById("compareDu2");
    el.compareResultCard = document.getElementById("compareResultCard");
    el.toastNotification = document.getElementById("toastNotification");

    // Dynamic Ribbon
    el.ribbonDUs = document.getElementById("ribbonDUs");
    el.ribbonCREM = document.getElementById("ribbonCREM");
    el.ribbonGEOP = document.getElementById("ribbonGEOP");
    el.ribbonRAP = document.getElementById("ribbonRAP");

    // Bottom Card
    el.bottomCard = document.getElementById("bottomCard");
    el.cardHandle = document.getElementById("cardHandle");
    el.cardSummary = document.getElementById("cardSummary");
    el.cardToggleBtn = document.getElementById("cardToggleBtn");
    el.cardAcronym = document.getElementById("cardAcronym");
    el.cardGridBadge = document.getElementById("cardGridBadge");
    el.cardTypeBadge = document.getElementById("cardTypeBadge");
    el.cardFullName = document.getElementById("cardFullName");
    el.cardCremEus = document.getElementById("cardCremEus");
    el.cardCremMw = document.getElementById("cardCremMw");
    el.cardGeopEus = document.getElementById("cardGeopEus");
    el.cardGeopMw = document.getElementById("cardGeopMw");
    el.cardRapGroups = document.getElementById("cardRapGroups");
    el.cardRapMw = document.getElementById("cardRapMw");
    el.cardBaseRate = document.getElementById("cardBaseRate");
    el.cardWesmRate = document.getElementById("cardWesmRate");
    el.cardPipelineVal = document.getElementById("cardPipelineVal");
    el.cardPenetrationVal = document.getElementById("cardPenetrationVal");
    
    // Sub-drawer
    el.cardDrawer = document.getElementById("cardDrawer");
    el.bmDuRate = document.getElementById("bmDuRate");
    el.bmDuSub = document.getElementById("bmDuSub");
    el.bmCremRate = document.getElementById("bmCremRate");
    el.bmGeopRate = document.getElementById("bmGeopRate");
    el.bmWesmRate = document.getElementById("bmWesmRate");
    el.bmWesmSub = document.getElementById("bmWesmSub");
    el.cardPsaSummary = document.getElementById("cardPsaSummary");
    el.cardPsasList = document.getElementById("cardPsasList");
    el.psaFilterRow = document.getElementById("psaFilterRow");
    el.cardSuppliersList = document.getElementById("cardSuppliersList");
    el.cardPhaseBreakdown = document.getElementById("cardPhaseBreakdown");
    el.cardPipelineCard = document.getElementById("cardPipelineCard");

    // Directory View
    el.dirSearchInput = document.getElementById("dirSearchInput");
    el.clearDirBtn = document.getElementById("clearDirBtn");
    el.dirCountBadge = document.getElementById("dirCountBadge");
    el.dirListContainer = document.getElementById("dirListContainer");

    // Calculator View
    el.copyCalcReportBtn = document.getElementById("copyCalcReportBtn");
    el.calcModeTitle = document.getElementById("calcModeTitle");
    el.calcThresholdBadge = document.getElementById("calcThresholdBadge");
    el.calcDuSelect = document.getElementById("calcDuSelect");
    el.calcSupplierLabel = document.getElementById("calcSupplierLabel");
    el.calcSupplierSelect = document.getElementById("calcSupplierSelect");
    el.calcSingleDemandWrap = document.getElementById("calcSingleDemandWrap");
    el.calcRapDemandWrap = document.getElementById("calcRapDemandWrap");
    el.calcKwInput = document.getElementById("calcKwInput");
    el.calcKwDisplay = document.getElementById("calcKwDisplay");
    el.calcRapMembersInput = document.getElementById("calcRapMembersInput");
    el.calcRapMembersDisplay = document.getElementById("calcRapMembersDisplay");
    el.calcRapKwPerMember = document.getElementById("calcRapKwPerMember");
    el.calcRapKwDisplay = document.getElementById("calcRapKwDisplay");
    el.calcRapTotalKw = document.getElementById("calcRapTotalKw");
    el.calcRapPoolStatus = document.getElementById("calcRapPoolStatus");
    el.calcKwhInput = document.getElementById("calcKwhInput");
    el.verdictBanner = document.getElementById("verdictBanner");
    el.verdictIcon = document.getElementById("verdictIcon");
    el.verdictTitle = document.getElementById("verdictTitle");
    el.verdictSub = document.getElementById("verdictSub");
    el.calcMonthlySavings = document.getElementById("calcMonthlySavings");
    el.calcMonthlySub = document.getElementById("calcMonthlySub");
    el.calcAnnualSavings = document.getElementById("calcAnnualSavings");
    el.calcAnnualSub = document.getElementById("calcAnnualSub");
    el.calcExtraMetricCard = document.getElementById("calcExtraMetricCard");
    el.calcStepsBox = document.getElementById("calcStepsBox");

    // Suppliers View
    el.suppCountBadge = document.getElementById("suppCountBadge");
    el.suppSearchInput = document.getElementById("suppSearchInput");
    el.clearSuppBtn = document.getElementById("clearSuppBtn");
    el.suppListContainer = document.getElementById("suppListContainer");
    el.suppMarketBanner = document.getElementById("suppMarketBanner");
    el.suppGroupChipsRow = document.getElementById("suppGroupChipsRow");

    // FAQ View
    el.faqSearchInput = document.getElementById("faqSearchInput");
    el.clearFaqBtn = document.getElementById("clearFaqBtn");
    el.faqCountBadge = document.getElementById("faqCountBadge");
    el.faqListContainer = document.getElementById("faqListContainer");
  }

  /**
   * Application Initialization
   */
  function init() {
    cacheDom();
    initMap();
    initControls();
    initCalculator();
    renderMarkers();
    updateStatsRibbon();
    renderDirectory();
    renderSuppliers();
    renderFaq();
    renderRoadmap();
    applyDynamicCounts();
    setTimeout(() => document.dispatchEvent(new CustomEvent("rm:ready")), 0);

    // Select initial benchmark: MERALCO
    const dus = window.RETAIL_MARKET_DATA?.dus || [];
    const meralco = dus.find((d) => d.acronym === "MERALCO") || dus[0];
    if (meralco) {
      selectDu(meralco, false);
    }

    // Support query param ?view=viewDirectory, viewCalculator, viewSuppliers, viewFaq
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get("view");
    if (viewParam && document.getElementById(viewParam)) {
      switchView(viewParam);
    }

    const modeParam = urlParams.get("mode");
    if (modeParam && ["crem", "geop", "rap", "wesm"].includes(modeParam)) {
      state.calcMode = modeParam;
      document.querySelectorAll(".calc-mode-pill[data-mode]").forEach((p) => {
        if (p.getAttribute("data-mode") === modeParam) p.classList.add("active");
        else p.classList.remove("active");
      });
      updateCalculatorModeUI();
    }

    const duParam = urlParams.get("du");
    if (duParam) {
      const matchDu = dus.find((d) => d.acronym.toLowerCase() === duParam.toLowerCase() || d.id === duParam);
      if (matchDu) selectDu(matchDu, false);
    }

    const expandParam = urlParams.get("expand");
    if (expandParam === "1" || expandParam === "true") {
      state.cardExpanded = true;
      el.bottomCard?.classList.remove("collapsed");
      if (el.cardToggleBtn) el.cardToggleBtn.textContent = "▼";
    }

    const tabParam = urlParams.get("tab");
    if (tabParam) {
      document.querySelectorAll(".drawer-tab").forEach((t) => t.classList.remove("active"));
      document.querySelector(`[data-dtab="${tabParam}"]`)?.classList.add("active");
      document.querySelectorAll(".dtab-content").forEach((c) => c.classList.remove("active"));
      if (tabParam === "overview") document.getElementById("dtabOverview")?.classList.add("active");
      else if (tabParam === "psas") document.getElementById("dtabPsas")?.classList.add("active");
      else if (tabParam === "suppliers") document.getElementById("dtabSuppliers")?.classList.add("active");
      else if (tabParam === "phases") document.getElementById("dtabPhases")?.classList.add("active");
    }

    const stypeParam = urlParams.get("stype");
    if (stypeParam && ["res", "geop", "rap"].includes(stypeParam)) {
      state.suppType = stypeParam;
      document.querySelectorAll(".calc-mode-pill[data-stype]").forEach((p) => {
        if (p.getAttribute("data-stype") === stypeParam) p.classList.add("active");
        else p.classList.remove("active");
      });
      renderSuppliers();
    }

    const suppExpandParam = urlParams.get("suppExpand");
    if (suppExpandParam !== null) {
      const idx = parseInt(suppExpandParam, 10) || 0;
      const card = el.suppListContainer?.querySelectorAll(".supp-card")[idx];
      if (card) card.classList.add("expanded");
    }

    const sortParam = urlParams.get("sort");
    if (sortParam) {
      state.dirSortBy = sortParam;
      document.querySelectorAll(".dir-sort-chip").forEach((c) => {
        if (c.getAttribute("data-sort") === sortParam) c.classList.add("active");
        else c.classList.remove("active");
      });
      renderDirectory();
    }

    const openParam = urlParams.get("open");
    if (openParam === "roadmap") el.roadmapModal?.classList.add("active");
    if (openParam === "compare") {
      renderComparison();
      el.compareModal?.classList.add("active");
    }
    if (openParam === "prices") {
      const pmodeParam = urlParams.get("pricesTab");
      if (pmodeParam && ["matrix", "spot", "arbitrage"].includes(pmodeParam)) {
        state.pricesMode = pmodeParam;
        document.querySelectorAll(".prices-mode-tab").forEach((t) => {
          if (t.getAttribute("data-pmode") === pmodeParam) t.classList.add("active");
          else t.classList.remove("active");
        });
      }
      renderPricesModal();
      el.pricesModal?.classList.add("active");
    }
  }

  /**
   * Switch Active View (Map, Directory, Calculator, Suppliers, FAQ)
   */
  function applyDynamicCounts() {
    const dus = RD.dus || [];
    const facts = document.getElementById("deskFacts");
    if (facts) {
      const S = RD.summary || {};
      const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
      facts.innerHTML =
        row("Retail customers", `${Number(S.crem?.total_eus || 0).toLocaleString()}<small> end-users</small>`) +
        row("Retail demand", `${Math.round(S.crem?.total_mw || 0).toLocaleString()}<small> MW</small>`) +
        row("Average retail price", `₱${MARKET_WAP.crem.toFixed(2)}<small>/kWh</small>`) +
        row("Data as of", escapeHtml(REPORT_LABEL));
    }
    const nDu = dus.filter(isDistributionUtility).length;
    const nGrid = dus.length - nDu;
    const label = `${nDu} DUs${nGrid ? ` + ${nGrid} NGCP` : ""}`;
    if (el.searchInput) el.searchInput.placeholder = "Search utilities or provinces";
    const dirTitle = document.querySelector("#viewDirectory .view-title");
    if (dirTitle) dirTitle.textContent = "On-Grid Utilities Directory";
    const pills = { res: (RD.res_suppliers_expanded || []).length, geop: (RD.geop_suppliers_expanded || []).length, rap: (RD.rap_aggregators_expanded || []).length };
    const names = { res: "RES Suppliers", geop: "GEOP Green", rap: "Aggregators" };
    document.querySelectorAll(".calc-mode-pill[data-stype]").forEach((p) => {
      const t = p.getAttribute("data-stype");
      p.textContent = `${names[t]} (${pills[t]})`;
    });
    const faqTotal = window.RCOA_FAQ_DATA?.faqs?.length;
    if (faqTotal) {
      const allChip = document.querySelector('.faq-chip[data-q=""]');
      if (allChip) allChip.textContent = `All (${faqTotal})`;
    }
    const nChecks = runDataChecks().filter((c) => c.level === "high").length;
    const pill = document.getElementById("brandPill");
    if (pill && nChecks) {
      pill.insertAdjacentHTML("beforeend", `<span class="brand-badge" aria-label="${nChecks} data issues">${nChecks}</span>`);
      pill.title = `About this app & data checks (${nChecks} high-priority)`;
    }
  }

  function switchView(viewId) {
    state.currentView = viewId;

    document.querySelectorAll(".app-view").forEach((view) => {
      view.classList.remove("active");
    });

    const target = document.getElementById(viewId);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav-tab").forEach((tab) => {
      if (tab.getAttribute("data-view") === viewId) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    if (viewId === "viewMap") {
      setTimeout(() => state.map?.invalidateSize(), 50);
    }
    document.dispatchEvent(new CustomEvent("rm:view", { detail: viewId }));
  }

  /**
   * Initialize Leaflet Map with Clean ESRI Light Gray Canvas
   * (Zero API Key, High-performance ESRI Light Gray Base, Never Blocked by OSM 403 or Carto API keys)
   */
  function initMap() {
    if (typeof L === "undefined") {
      console.error("Leaflet not loaded");
      return;
    }

    const initialCenter = [12.6, 122.2];
    const initialZoom = 5.8;

    state.map = L.map("map", {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 4.8,
      maxZoom: 17,
      zoomControl: false,
      attributionControl: true,
    });

    // ESRI World Light Gray Base: Free, No API Key, Clean Apple-style vector-like canvas
    const esriBaseUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
    L.tileLayer(esriBaseUrl, {
      maxZoom: 16,
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, USGS, NOAA',
    }).addTo(state.map);

    // ESRI World Light Gray Reference (clean English labels for cities and boundaries)
    const esriRefUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
    L.tileLayer(esriRefUrl, {
      maxZoom: 16,
    }).addTo(state.map);

    state.markersLayer = L.layerGroup().addTo(state.map);

    state.map.on("click", () => {
      closeSearch();
      collapseCard();
    });

    setTimeout(() => {
      state.map?.invalidateSize();
    }, 150);

    window.addEventListener("resize", () => {
      state.map?.invalidateSize();
    });
  }

  /**
   * Render Luminous Dot Markers
   */
  function renderMarkers() {
    if (!state.map || !state.markersLayer) return;

    state.markersLayer.clearLayers();
    state.markersMap.clear();

    const dus = window.RETAIL_MARKET_DATA?.dus || [];

    const filtered = dus.filter((du) => {
      if (state.gridFilter !== "all" && du.grid !== state.gridFilter) {
        return false;
      }
      if (state.programFilter === "crem") return du.crem_eus > 0;
      if (state.programFilter === "geop") return du.geop_eus > 0;
      if (state.programFilter === "rap") return du.rap_groups > 0;
      return true;
    });

    const maxMw = {};
    ["crem", "geop", "rap"].forEach((k) => {
      maxMw[k] = Math.max(...dus.map((d) => Number(d[`${k}_mw`]) || 0));
    });

    filtered.forEach((du) => {
      const lat = du.lat;
      const lon = du.lon ?? du.lng;
      if (typeof lat !== "number" || typeof lon !== "number") return;

      const isSelected = state.selectedDu && state.selectedDu.id === du.id;

      // Proportional symbol: circle area scales with the MW of the program in view
      const prog = state.programFilter === "all" ? "crem" : state.programFilter;
      const mw = Number(du[`${prog}_mw`]) || 0;
      const size = Math.round(6 + 28 * Math.sqrt(mw / (maxMw[prog] || 1)));
      const cls = `${prog}${isSelected ? " active" : ""}${isDistributionUtility(du) ? "" : " grid-node"}`;

      const html = `
        <div class="clean-marker" style="width:${size}px;height:${size}px;">
          ${isSelected ? `<div class="marker-callout-pill" style="bottom:${size / 2 + 8}px">${escapeHtml(du.acronym)} <span>${mw.toLocaleString(undefined, { maximumFractionDigits: 1 })} MW</span></div>` : ""}
          <div class="marker-dot ${cls}" style="width:${size}px;height:${size}px;"></div>
        </div>
      `;

      const icon = L.divIcon({
        className: "custom-div-icon",
        html: html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([lat, lon], {
        icon: icon,
        zIndexOffset: isSelected ? 2000 : 1000 - size * 10,
        keyboard: false,
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        selectDu(du, true);
      });

      state.markersLayer.addLayer(marker);
      state.markersMap.set(du.id, marker);
    });
  }

  /**
   * Update Dynamic Live Stats Ribbon
   */
  function updateStatsRibbon() {
    const dus = window.RETAIL_MARKET_DATA?.dus || [];

    const activeList = dus.filter((d) => {
      if (state.gridFilter !== "all" && d.grid !== state.gridFilter) return false;
      if (state.programFilter === "crem") return d.crem_eus > 0;
      if (state.programFilter === "geop") return d.geop_eus > 0;
      if (state.programFilter === "rap") return d.rap_groups > 0;
      return true;
    });

    const totalDus = activeList.filter(isDistributionUtility).length;
    const ngcpCount = activeList.length - totalDus;
    let cremEus = 0;
    let cremMw = 0;
    let geopEus = 0;
    let rapGroups = 0;

    activeList.forEach((d) => {
      cremEus += d.crem_eus || 0;
      cremMw += d.crem_mw || 0;
      geopEus += d.geop_eus || 0;
      rapGroups += d.rap_groups || 0;
    });

    const prefix = state.gridFilter === "all" ? "" : `${state.gridFilter}:`;
    if (el.ribbonDUs) el.ribbonDUs.textContent = `${prefix} ${totalDus} DUs${ngcpCount ? ` + ${ngcpCount} NGCP` : ""}`;
    if (el.ribbonCREM) el.ribbonCREM.textContent = `${cremEus.toLocaleString()} CREM EUs (${Math.round(cremMw).toLocaleString()} MW)`;
    if (el.ribbonGEOP) el.ribbonGEOP.textContent = `${geopEus.toLocaleString()} GEOP EUs`;
    if (el.ribbonRAP) el.ribbonRAP.textContent = `${rapGroups} RAP Grps`;
  }

  /**
   * Select DU & Update Mobile Bottom Card
   */
  function selectDu(du, flyTo = true) {
    if (!du) return;
    state.selectedDu = du;
    document.dispatchEvent(new CustomEvent("rm:select", { detail: du }));

    renderMarkers();

    // Populate Peek Header
    if (el.cardAcronym) el.cardAcronym.textContent = du.acronym;
    if (el.cardGridBadge) el.cardGridBadge.textContent = du.grid;
    if (el.cardTypeBadge) el.cardTypeBadge.textContent = du.type || "PDU";
    if (el.cardFullName) el.cardFullName.textContent = `${du.name} · ${du.province}`;

    // Populate 3 Pillars
    if (el.cardCremEus) el.cardCremEus.innerHTML = `${(du.crem_eus || 0).toLocaleString()} <span class="stat-unit">EUs</span>`;
    if (el.cardCremMw) el.cardCremMw.textContent = `${(du.crem_mw || 0).toFixed(1)} MW`;

    if (el.cardGeopEus) el.cardGeopEus.innerHTML = `${(du.geop_eus || 0).toLocaleString()} <span class="stat-unit">EUs</span>`;
    if (el.cardGeopMw) el.cardGeopMw.textContent = `${(du.geop_mw || 0).toFixed(1)} MW`;

    if (el.cardRapGroups) el.cardRapGroups.innerHTML = `${du.rap_groups ? du.rap_groups : 0} <span class="stat-unit">grp</span>`;
    if (el.cardRapMw) el.cardRapMw.textContent = `${(du.rap_mw || 0).toFixed(1)} MW`;

    // Populate Sub-strip (Verified URR Base Rate, WESM Spot Rate, Switching Penetration)
    const formattedRate = fmtRate(du);
    if (el.cardBaseRate) el.cardBaseRate.innerHTML = `${formattedRate}/kWh${staleTag(du)}`;
    if (el.cardWesmRate) {
      const wRate = duSpotRate(du);
      el.cardWesmRate.textContent = `₱${wRate.toFixed(4)}`;
      el.cardWesmRate.title = du.wesm_data?.latest_rate
        ? `WESM Spot: ₱${wRate.toFixed(4)}/kWh (${du.wesm_data.genmix_pct}% of supply mix)`
        : `No DU-specific spot data; showing ${du.grid} regional GWAP`;
    }
    if (el.bmDuRate) el.bmDuRate.textContent = `${formattedRate}`;
    if (el.bmDuSub) {
      el.bmDuSub.innerHTML = `${escapeHtml(fmtMonth(du.urr_month))} URR${staleTag(du)}`;
    }
    if (el.bmCremRate) el.bmCremRate.textContent = `₱${MARKET_WAP.crem.toFixed(4)}`;
    if (el.bmGeopRate) el.bmGeopRate.textContent = `₱${MARKET_WAP.geop.toFixed(4)}`;
    if (el.bmWesmRate) {
      if (du.wesm_data && du.wesm_data.latest_rate) {
        el.bmWesmRate.textContent = `₱${du.wesm_data.latest_rate.toFixed(4)}`;
        if (el.bmWesmSub) el.bmWesmSub.textContent = `${du.wesm_data.genmix_pct}% gen mix`;
      } else {
        const regGwap = regionalGwap(du.grid);
        el.bmWesmRate.textContent = `₱${regGwap.toFixed(4)}`;
        if (el.bmWesmSub) el.bmWesmSub.textContent = `${du.grid} Spot GWAP`;
      }
    }
    if (el.cardPipelineVal) {
      el.cardPipelineVal.textContent = du.captive_p5_eus ? `50–99 kW (+${du.captive_p5_eus})` : "50–99 kW Wave";
    }
    if (el.cardPenetrationVal) {
      el.cardPenetrationVal.textContent = `${du.switching_penetration_pct || 0}%`;
    }

    // Populate Drawer: Top Suppliers
    if (el.cardSuppliersList) {
      const suppliers = du.top_suppliers || [];
      if (suppliers.length > 0) {
        el.cardSuppliersList.innerHTML = suppliers
          .slice(0, 4)
          .map(
            (s) => `
            <div class="supplier-pill">
              <span style="font-weight:700; color:#14213d;">${escapeHtml(s.name)}</span>
              <span style="color:#2d5bd7; font-weight:700;">${escapeHtml(s.share || s.role || "Active")}</span>
            </div>
          `
          )
          .join("");
      } else {
        el.cardSuppliersList.innerHTML = `<div style="font-size:10.5px; color:#97a1b3; padding:3px;">Supplied via standard contestable retail contracts</div>`;
      }
    }

    // Populate Drawer: Migration Phases
    if (el.cardPhaseBreakdown) {
      el.cardPhaseBreakdown.innerHTML = `
        <div class="phase-tile">
          <div class="phase-tile-title">Phase I (≥1 MW)</div>
          <div class="phase-tile-val">${(du.crem_p1 || 0).toLocaleString()} EUs</div>
        </div>
        <div class="phase-tile">
          <div class="phase-tile-title">Phase II (750–999 kW)</div>
          <div class="phase-tile-val">${(du.crem_p2 || 0).toLocaleString()} EUs</div>
        </div>
        <div class="phase-tile">
          <div class="phase-tile-title">Phase III (500–749 kW)</div>
          <div class="phase-tile-val">${(du.crem_p3 || 0).toLocaleString()} EUs</div>
        </div>
        <div class="phase-tile">
          <div class="phase-tile-title">Phase IV (100–499 kW)</div>
          <div class="phase-tile-val">${(du.crem_p4 || 0).toLocaleString()} EUs</div>
        </div>
      `;
    }

    // Populate Drawer: PSAs & Carve-Outs
    renderDuPsas(du);

    // Populate Drawer: Phase V Pipeline
    if (el.cardPipelineCard) {
      el.cardPipelineCard.innerHTML = `
        <div style="font-weight:700; color:#87520b; font-size:10px;">
          ${(du.captive_p5_eus || 0).toLocaleString()} EUs (${(du.captive_p5_mw || 0).toFixed(1)} MW) · 50–99 kW Wave
        </div>
        <div style="font-size:10px; color:#6e430a; margin-top:2px;">
          Proposed Year 1 (2027) milestone · Synchronized with PSA expirations.
        </div>
      `;
    }

    // Keep calculator DU in sync
    if (el.calcDuSelect && el.calcDuSelect.value !== du.id) {
      el.calcDuSelect.value = du.id;
      state.calcDuId = du.id;
      recalcSavings();
    }

    // Camera Pan
    if (flyTo && state.map) {
      const lat = du.lat;
      const lon = du.lon ?? du.lng;
      state.map.flyTo([lat, lon], 9.2, { duration: 0.6 });
    }
  }

  /**
   * Render DU Bilateral PSAs, Rates, Tenor & Carve-Out Provisions
   */
  function renderDuPsas(du) {
    if (!el.cardPsasList || !el.cardPsaSummary) return;

    const psas = du.psas || [];
    const summary = du.psa_summary || {
      total_contracts: 0,
      total_contracted_mw: 0,
      carved_out_mw: 0,
      locked_mw: 0,
      carveout_share_pct: 0,
      weighted_psa_rate: 0,
    };

    if (psas.length === 0) {
      el.cardPsaSummary.innerHTML = `
        <div style="font-size:10px; font-weight:700; color:#1f2d48; margin-bottom:2px;">Special Procuring Entity / Industrial Zone</div>
        <div style="font-size:10px; color:#66728a; line-height:1.35;">
          No captive bilateral PSAs on file. Energy is procured directly through PEZA industrial zone tariffs or WESM spot purchases without captive stranded capacity covenants.
        </div>
      `;
      el.cardPsasList.innerHTML = `<div style="font-size:10.5px; color:#97a1b3; text-align:center; padding:15px;">No bilateral PSAs registered</div>`;
      return;
    }

    const carvePct = summary.carveout_share_pct || 0;
    const lockedPct = (100 - carvePct).toFixed(1);
    const urrMonthLabel = summary.latest_urr_month || du.urr_month || "August 2026 URR";
    const wesmRateVal = du.wesm_data?.latest_rate || 5.4513;
    const wesmMix = du.wesm_data?.genmix_pct || 15;
    const wesmGwh = ((du.wesm_data?.annual_kwh || 0) / 1e6).toFixed(1);
    const wesmCostB = ((du.wesm_data?.annual_cost || 0) / 1e9).toFixed(2);

    el.cardPsaSummary.innerHTML = `
      <div class="psa-summary-stats" style="grid-template-columns: repeat(5, 1fr);">
        <div class="psa-summary-stat">
          <div class="pstat-lbl">Contracts</div>
          <div class="pstat-val">${summary.total_contracts} PSAs</div>
        </div>
        <div class="psa-summary-stat">
          <div class="pstat-lbl">Bilateral MW</div>
          <div class="pstat-val">${summary.total_contracted_mw.toLocaleString()} <span style="font-size:9px; font-weight:600;">MW</span></div>
        </div>
        <div class="psa-summary-stat">
          <div class="pstat-lbl">Captive Base</div>
          <div class="pstat-val" style="color:#2d5bd7;">${du.base_rate ? (du.base_rate.startsWith("₱") ? du.base_rate : `₱${du.base_rate}`) : "₱7.3300"}</div>
        </div>
        <div class="psa-summary-stat">
          <div class="pstat-lbl" style="color:#6b46c1;">URR WESM Spot</div>
          <div class="pstat-val" style="color:#6b46c1;" title="${wesmMix}% captive generation mix">₱${wesmRateVal.toFixed(4)}</div>
        </div>
        <div class="psa-summary-stat">
          <div class="pstat-lbl">Filing Month</div>
          <div class="pstat-val" style="font-size:10px; color:#13866b; font-weight:800;" title="${escapeHtml(urrMonthLabel)}">${escapeHtml(urrMonthLabel)}</div>
        </div>
      </div>
      <div class="psa-progress-wrap">
        <div class="psa-progress-bar">
          <div class="psa-progress-segment carved" style="width: ${carvePct}%;"></div>
          <div class="psa-progress-segment locked" style="width: ${100 - carvePct}%;"></div>
        </div>
        <div class="psa-progress-legend">
          <span class="psa-legend-item carved">Carve-Out: ${summary.carved_out_mw.toFixed(1)} MW (${carvePct}%)</span>
          <span class="psa-legend-item" style="color:#6b46c1;">Spot Mix: ${wesmMix}% (${wesmGwh} GWh)</span>
          <span class="psa-legend-item locked">Locked: ${summary.locked_mw.toFixed(1)} MW</span>
        </div>
      </div>
    `;

    const wesmCardHtml = `
      <div class="psa-card psa-wesm">
        <div class="psa-header-row">
          <div class="psa-supplier-title" style="color:#53359e;">WHOLESALE ELECTRICITY SPOT MARKET (WESM)</div>
          <span class="psa-tech-badge tech-wesm">SPOT PROCUREMENT</span>
        </div>

        <div class="psa-metrics-row" style="background:#f6f3fc; border-color:#ddd3f3;">
          <div class="psa-metric">
            <span class="psa-lbl" style="color:#6b46c1;">Spot Generation Mix</span>
            <span class="psa-val" style="color:#53359e;">${wesmMix}% <span class="psa-sub">captive</span></span>
          </div>
          <div class="psa-metric highlight">
            <span class="psa-lbl" style="color:#6b46c1;">Latest URR Spot Rate</span>
            <span class="psa-val" style="color:#6b46c1;">₱${wesmRateVal.toFixed(4)}<span class="psa-sub">/kWh</span></span>
          </div>
          <div class="psa-metric">
            <span class="psa-lbl" style="color:#6b46c1;">URR Filing Month</span>
            <span class="psa-val" style="color:#13866b; font-size:10px; font-weight:700;">${escapeHtml(urrMonthLabel)}</span>
          </div>
        </div>

        <div class="psa-details-grid">
          <div class="psa-detail-item">
            <span class="psa-lbl">Market Settlement</span>
            <span class="psa-val-txt"><code class="docket-code" style="color:#6b46c1; background:#f3effb; border-color:#d7ccf2;">IEMOP Gross Pool Market Clearing</code></span>
          </div>
          <div class="psa-detail-item">
            <span class="psa-lbl">Annual Volume &amp; Spend</span>
            <span class="psa-val-txt">${wesmGwh} GWh / yr (₱${wesmCostB}B)</span>
          </div>
        </div>

        <div class="psa-carveout-box" style="background:#f3effb; border:1px solid #d7ccf2;">
          <div class="psa-status-badge" style="color:#6b46c1; font-weight:800;">
            Variable Spot Exposure (Hourly Net Settlement)
          </div>
          <div class="psa-carveout-text" style="color:#53359e;">Procured on wholesale spot market to balance captive customer load without locked Take-or-Pay penalties.</div>
        </div>
      </div>
    `;

    // Filter PSAs
    let filtered = psas;
    let includeWesm = state.psaFilter === "all" || state.psaFilter === "wesm";

    if (state.psaFilter === "wesm") {
      filtered = [];
    } else if (state.psaFilter === "carved") {
      filtered = psas.filter((p) => p.carveout_status && (p.carveout_status.includes("Carve-Out") || p.carveout_status.includes("Protected")));
      includeWesm = false;
    } else if (state.psaFilter === "locked") {
      filtered = psas.filter((p) => p.carveout_status && p.carveout_status.includes("Locked"));
      includeWesm = false;
    }

    if (filtered.length === 0 && !includeWesm) {
      el.cardPsasList.innerHTML = `<div style="text-align:center; padding:15px; font-size:10.5px; color:#97a1b3;">No contracts matching this filter</div>`;
      return;
    }

    const psasCardsHtml = filtered
      .map((p) => {
        const isCarved = p.carveout_status && (p.carveout_status.includes("Carve-Out") || p.carveout_status.includes("Protected"));
        const techClean = (p.tech || "default").toLowerCase().replace(/[^a-z]/g, "");
        const techClass = "tech-" + techClean;
        const effectiveRateVal = (p.urr_rate || p.rate || 0);
        const rateDisplay = effectiveRateVal > 0 ? `₱${effectiveRateVal.toFixed(4)}/kWh` : "Pending URR";
        const monthBadge = p.urr_month ? `${escapeHtml(p.urr_month)}` : "URR Filing";
        const docketNum = p.erc_case || p.docket || "ERC Docket Pending";

        return `
        <div class="psa-card ${isCarved ? "psa-carved" : "psa-locked"}">
          <div class="psa-header-row">
            <div class="psa-supplier-title">${escapeHtml(p.supplier)}</div>
            <span class="psa-tech-badge ${techClass}">${escapeHtml(p.tech || "GENCO")}</span>
          </div>

          <div class="psa-metrics-row">
            <div class="psa-metric">
              <span class="psa-lbl">Capacity</span>
              <span class="psa-val">${p.mw.toFixed(2)} MW</span>
            </div>
            <div class="psa-metric highlight">
              <span class="psa-lbl">Latest URR Rate</span>
              <span class="psa-val">${rateDisplay}</span>
            </div>
            <div class="psa-metric">
              <span class="psa-lbl">URR Month</span>
              <span class="psa-val" style="color:#13866b; font-size:10px; font-weight:700;">${monthBadge}</span>
            </div>
          </div>

          <div class="psa-details-grid">
            <div class="psa-detail-item">
              <span class="psa-lbl">Verified ERC Case No.</span>
              <span class="psa-val-txt"><code class="docket-code">${escapeHtml(docketNum)}</code></span>
            </div>
            <div class="psa-detail-item">
              <span class="psa-lbl">Tenor &amp; Expiration</span>
              <span class="psa-val-txt">${escapeHtml(p.tenor)}</span>
            </div>
          </div>

          <div class="psa-carveout-box ${isCarved ? "carved" : "locked"}">
            <div class="psa-status-badge">
              ${isCarved ? "" + escapeHtml(p.carveout_status) : "" + escapeHtml(p.carveout_status)}
            </div>
            <div class="psa-carveout-text">${isCarved ? "Pro-rata capacity reduction active · No stranded fee on captive pool" : "Fixed capacity fees retained · No contestability reduction clause"}</div>
          </div>
        </div>
      `;
      })
      .join("");

    el.cardPsasList.innerHTML = (includeWesm ? wesmCardHtml : "") + psasCardsHtml;
  }

  /**
   * Card Drawer Toggle
   */
  function toggleCard() {
    state.cardExpanded = !state.cardExpanded;
    if (state.cardExpanded) {
      el.bottomCard?.classList.remove("collapsed");
      if (el.cardToggleBtn) el.cardToggleBtn.textContent = "▼";
    } else {
      collapseCard();
    }
  }

  function collapseCard() {
    state.cardExpanded = false;
    el.bottomCard?.classList.add("collapsed");
    if (el.cardToggleBtn) el.cardToggleBtn.textContent = "▲";
  }

  /**
   * Autocomplete Live Search (Map Top Bar)
   */
  function handleSearch(query) {
    const q = query.trim().toLowerCase();
    state.searchQuery = q;

    if (!q) {
      el.clearSearchBtn?.classList.remove("active");
      closeSearch();
      return;
    }

    el.clearSearchBtn?.classList.add("active");

    const dus = window.RETAIL_MARKET_DATA?.dus || [];
    const matches = dus
      .filter((d) => {
        return (
          d.acronym.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          d.province.toLowerCase().includes(q) ||
          (q === "rap" && d.rap_groups > 0) ||
          (q === "geop" && d.geop_eus > 0)
        );
      })
      .slice(0, 6);

    if (matches.length === 0) {
      el.searchDropdown.innerHTML = `<div style="padding:8px 12px; font-size:11px; color:#97a1b3; text-align:center;">No matching DUs found</div>`;
      el.searchDropdown.classList.add("active");
      return;
    }

    el.searchDropdown.innerHTML = matches
      .map(
        (du) => `
        <div class="dropdown-row" data-id="${du.id}">
          <div>
            <div class="dropdown-acr">${escapeHtml(du.acronym)}</div>
            <div class="dropdown-sub">${escapeHtml(du.province)} · ${escapeHtml(du.name)}</div>
          </div>
          <div>
            ${du.crem_eus > 0 ? `<span class="dropdown-badge crem">CREM ${du.crem_eus}</span>` : ""}
            ${du.geop_eus > 0 ? `<span class="dropdown-badge geop">GEOP ${du.geop_eus}</span>` : ""}
            ${du.rap_groups > 0 ? `<span class="dropdown-badge rap">RAP</span>` : ""}
          </div>
        </div>
      `
      )
      .join("");

    el.searchDropdown.classList.add("active");

    el.searchDropdown.querySelectorAll(".dropdown-row").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.getAttribute("data-id");
        const found = dus.find((d) => d.id === id);
        if (found) {
          selectDu(found, true);
          closeSearch();
          showToast(`Selected ${found.acronym} (${found.province})`);
        }
      });
    });
  }

  function closeSearch() {
    el.searchDropdown?.classList.remove("active");
  }

  /**
   * 1-Tap Global Master Reset
   */
  function performReset() {
    state.programFilter = "all";
    state.gridFilter = "all";
    state.searchQuery = "";
    state.faqQuery = "";
    state.dirSearchQuery = "";
    state.suppSearchQuery = "";
    collapseCard();
    closeSearch();

    if (el.searchInput) el.searchInput.value = "";
    if (el.dirSearchInput) el.dirSearchInput.value = "";
    if (el.suppSearchInput) el.suppSearchInput.value = "";
    if (el.faqSearchInput) el.faqSearchInput.value = "";
    el.clearSearchBtn?.classList.remove("active");
    el.clearDirBtn?.classList.remove("active");
    el.clearSuppBtn?.classList.remove("active");
    el.clearFaqBtn?.classList.remove("active");

    document.querySelectorAll(".pill-btn").forEach((b) => {
      if (b.getAttribute("data-grid") === "all") b.classList.add("active");
      else b.classList.remove("active");
    });

    document.querySelectorAll(".program-pill").forEach((p) => {
      if (p.getAttribute("data-filter") === "all") p.classList.add("active");
      else p.classList.remove("active");
    });

    el.roadmapModal?.classList.remove("active");
    el.compareModal?.classList.remove("active");
    el.pricesModal?.classList.remove("active");

    renderMarkers();
    updateStatsRibbon();
    renderDirectory();
    renderSuppliers();

    const initialCenter = [12.6, 122.2];
    const initialZoom = 5.8;
    state.map?.flyTo(initialCenter, initialZoom, { duration: 0.7 });

    const dus = window.RETAIL_MARKET_DATA?.dus || [];
    const meralco = dus.find((d) => d.acronym === "MERALCO") || dus[0];
    if (meralco) selectDu(meralco, false);

    showToast("↺ All filters and map reset to default");
  }

  /**
   * Render Directory & Leaderboard (Tab 2)
   */
  function renderDirectory() {
    if (!el.dirListContainer) return;

    const dus = window.RETAIL_MARKET_DATA?.dus || [];
    const q = (state.dirSearchQuery || "").trim().toLowerCase();

    let list = dus.filter((d) => {
      if (!q) return true;
      return (
        d.acronym.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.province.toLowerCase().includes(q)
      );
    });

    // Sorting
    list.sort((a, b) => {
      if (state.dirSortBy === "crem_mw") return (b.crem_mw || 0) - (a.crem_mw || 0);
      if (state.dirSortBy === "geop_eus") return (b.geop_eus || 0) - (a.geop_eus || 0);
      if (state.dirSortBy === "rap_groups") return (b.rap_groups || 0) - (a.rap_groups || 0);
      if (state.dirSortBy === "base_rate") {
        const rateA = parseFloat((a.base_rate || "0").replace(/[^\d.]/g, "")) || 0;
        const rateB = parseFloat((b.base_rate || "0").replace(/[^\d.]/g, "")) || 0;
        return rateB - rateA;
      }
      if (state.dirSortBy === "wesm_rate") {
        const wA = a.wesm_data?.latest_rate || 0;
        const wB = b.wesm_data?.latest_rate || 0;
        return wB - wA;
      }
      if (state.dirSortBy === "psas") {
        const mwA = a.psa_summary?.total_contracted_mw || 0;
        const mwB = b.psa_summary?.total_contracted_mw || 0;
        return mwB - mwA;
      }
      if (state.dirSortBy === "switching") {
        return (b.switching_penetration_pct || 0) - (a.switching_penetration_pct || 0);
      }
      return 0;
    });

    if (el.dirCountBadge) {
      const nDu = list.filter(isDistributionUtility).length;
      const nGrid = list.length - nDu;
      el.dirCountBadge.textContent = `${nDu} DU${nDu === 1 ? "" : "s"}${nGrid ? ` + ${nGrid} NGCP` : ""}`;
    }

    if (list.length === 0) {
      el.dirListContainer.innerHTML = `<div style="text-align:center; padding:30px; font-size:11px; color:#97a1b3;">No matching utilities found</div>`;
      return;
    }

    el.dirListContainer.innerHTML = list
      .map((du) => {
        let metricVal = `${(du.crem_mw || 0).toFixed(1)} MW`;
        let metricSub = `${(du.crem_eus || 0).toLocaleString()} EUs`;

        if (state.dirSortBy === "geop_eus") {
          metricVal = `${(du.geop_eus || 0).toLocaleString()} EUs`;
          metricSub = `${(du.geop_mw || 0).toFixed(1)} MW Green`;
        } else if (state.dirSortBy === "rap_groups") {
          metricVal = `${du.rap_groups || 0} Groups`;
          metricSub = `${(du.rap_mw || 0).toFixed(1)} MW Agg`;
        } else if (state.dirSortBy === "base_rate") {
          metricVal = fmtRate(du);
          metricSub = `${escapeHtml(fmtMonth(du.urr_month))} URR`;
        } else if (state.dirSortBy === "wesm_rate") {
          metricVal = `₱${(du.wesm_data?.latest_rate || 0).toFixed(4)}/kWh`;
          metricSub = `${du.wesm_data?.genmix_pct || 0}% Spot Gen Mix`;
        } else if (state.dirSortBy === "psas") {
          const s = du.psa_summary || {};
          metricVal = `${s.total_contracts || 0} PSAs (${s.total_contracted_mw || 0} MW)`;
          metricSub = `${s.carveout_share_pct || 0}% Carve-Out Protected`;
        } else if (state.dirSortBy === "switching") {
          metricVal = `${du.switching_penetration_pct || 0}%`;
          metricSub = `Penetration`;
        }

        const psaSummary = du.psa_summary || {};
        const psaBadge = (psaSummary.total_contracts > 0 && state.dirSortBy !== "psas")
          ? `<span class="badge-tag" style="background:#edf1f5; color:#4a5770;">${psaSummary.total_contracts} PSAs</span>`
          : "";
        const urrMonthBadge = isStaleRate(du)
          ? `<span class="badge-tag stale" title="Captive rate more than ${STALE_MONTHS} months older than the ${REPORT_LABEL} market data">${escapeHtml(fmtMonth(du.urr_month))} · old</span>`
          : `<span class="badge-tag" style="background:#eef3fd; color:#2449b5; font-weight:700;">${escapeHtml(fmtMonth(du.urr_month))}</span>`;
        const wesmBadge = state.dirSortBy !== "wesm_rate" && du.wesm_data?.latest_rate
          ? `<span class="badge-tag wesm" style="background:#f3effb; color:#6b46c1; font-weight:700;">WESM ₱${du.wesm_data.latest_rate.toFixed(2)}</span>`
          : "";

        return `
        <div class="dir-card" data-id="${du.id}">
          <div class="dir-card-left">
            <div class="dir-card-title-row">
              <span class="dir-card-acr">${escapeHtml(du.acronym)}</span>
              <span class="badge-tag grid">${escapeHtml(du.grid)}</span>
              ${urrMonthBadge}
              ${wesmBadge}
              ${psaBadge}
            </div>
            <div class="dir-card-sub">${escapeHtml(du.name)} · ${escapeHtml(du.province)}</div>
          </div>
          <div class="dir-card-right">
            <div class="dir-card-main-val">${metricVal}</div>
            <div class="dir-card-extra">${metricSub}</div>
          </div>
        </div>
      `;
      })
      .join("");

    el.dirListContainer.querySelectorAll(".dir-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-id");
        const found = dus.find((d) => d.id === id);
        if (found) {
          switchView("viewMap");
          selectDu(found, true);
          showToast(`Viewing ${found.acronym}`);
        }
      });
    });
  }

  /**
   * Calculator: Initialize & Update Dynamic Program Options
   */
  function initCalculator() {
    const dus = window.RETAIL_MARKET_DATA?.dus || [];

    // Populate DU select dropdown
    if (el.calcDuSelect) {
      el.calcDuSelect.innerHTML = dus
        .map((d) => {
          return `<option value="${d.id}" ${d.acronym === "MERALCO" ? "selected" : ""}>${escapeHtml(d.acronym)} — ${escapeHtml(d.province)} (${fmtRate(d)}/kWh · ${escapeHtml(fmtMonth(d.urr_month))}${isStaleRate(d) ? ", old" : ""})</option>`;
        })
        .join("");
    }

    // Populate Comparator DU dropdowns
    if (el.compareDu1 && el.compareDu2) {
      const opts = dus
        .map((d) => `<option value="${d.id}">${escapeHtml(d.acronym)} (${escapeHtml(d.province)})</option>`)
        .join("");
      el.compareDu1.innerHTML = opts;
      el.compareDu2.innerHTML = opts;
      el.compareDu1.value = "meralco";
      el.compareDu2.value = "veco";
      renderComparison();
    }

    updateCalculatorModeUI();
    recalcSavings();
  }

  /**
   * Update Calculator Mode UI & Supplier Dropdowns
   */
  function updateCalculatorModeUI() {
    const mode = state.calcMode;
    const rdata = window.RETAIL_MARKET_DATA || {};
    if (el.calcKwhLabel) el.calcKwhLabel.textContent = "Monthly Energy Consumption (kWh / month)";
    syncSuggestedKwh();

    if (mode === "crem") {
      if (el.calcModeTitle) el.calcModeTitle.textContent = "Individual Retail Open Access (CREM)";
      if (el.calcThresholdBadge) el.calcThresholdBadge.textContent = "Threshold: 100 kW";
      if (el.calcSingleDemandWrap) el.calcSingleDemandWrap.style.display = "flex";
      if (el.calcRapDemandWrap) el.calcRapDemandWrap.style.display = "none";
      if (el.calcSupplierLabel) el.calcSupplierLabel.textContent = "Select Retail Electricity Supplier (RES) & Rate";

      const suppliers = rdata.res_suppliers_expanded || [];
      if (el.calcSupplierSelect) {
        el.calcSupplierSelect.innerHTML = `
          <option value="wap" selected>Market Benchmark WAP — ₱${MARKET_WAP.crem.toFixed(4)}/kWh</option>
          ${suppliers
            .map(
              (s) =>
                `<option value="${s.rate}">₱${s.rate.toFixed(4)}/kWh — ${escapeHtml(s.name)} (${s.share_pct}% share)</option>`
            )
            .join("")}
        `;
      }
    } else if (mode === "geop") {
      if (el.calcModeTitle) el.calcModeTitle.textContent = "Green Energy Option Program (GEOP)";
      if (el.calcThresholdBadge) el.calcThresholdBadge.textContent = "100% RE · 100 kW Threshold";
      if (el.calcSingleDemandWrap) el.calcSingleDemandWrap.style.display = "flex";
      if (el.calcRapDemandWrap) el.calcRapDemandWrap.style.display = "none";
      if (el.calcSupplierLabel) el.calcSupplierLabel.textContent = "Select Green RE Supplier & Tariff Rate";

      const suppliers = rdata.geop_suppliers_expanded || [];
      if (el.calcSupplierSelect) {
        el.calcSupplierSelect.innerHTML = `
          <option value="wap" selected>GEOP Market WAP — ₱${MARKET_WAP.geop.toFixed(4)}/kWh (Renewable)</option>
          ${suppliers
            .map(
              (s) =>
                `<option value="${s.rate}">₱${s.rate.toFixed(4)}/kWh — ${escapeHtml(s.supplier)} (${escapeHtml(s.re_type)})</option>`
            )
            .join("")}
        `;
      }
    } else if (mode === "rap") {
      if (el.calcModeTitle) el.calcModeTitle.textContent = "Retail Aggregation Program (RAP Calculator)";
      if (el.calcKwhLabel) el.calcKwhLabel.textContent = "Whole Group Monthly Consumption (kWh / month)";
      if (el.calcThresholdBadge) el.calcThresholdBadge.textContent = "Pooled Meters (<100 kW each)";
      if (el.calcSingleDemandWrap) el.calcSingleDemandWrap.style.display = "none";
      if (el.calcRapDemandWrap) el.calcRapDemandWrap.style.display = "flex";
      if (el.calcSupplierLabel) el.calcSupplierLabel.textContent = "Select Retail Aggregator & Supply Offer";

      const aggregators = rdata.rap_aggregators_expanded || [];
      if (el.calcSupplierSelect) {
        el.calcSupplierSelect.innerHTML = `
          <option value="wap" selected>RAP Market WAP — ₱${MARKET_WAP.rap.toFixed(4)}/kWh (Aggregated)</option>
          ${aggregators
            .map(
              (a) =>
                `<option value="${a.rate}">₱${a.rate.toFixed(4)}/kWh — ${escapeHtml(a.aggregator)} (${escapeHtml(a.role)})</option>`
            )
            .join("")}
        `;
      }
    } else if (mode === "wesm") {
      if (el.calcModeTitle) el.calcModeTitle.textContent = "WESM Spot Price (Reference Only)";
      if (el.calcThresholdBadge) el.calcThresholdBadge.textContent = "Benchmark, not a supply option";
      if (el.calcSingleDemandWrap) el.calcSingleDemandWrap.style.display = "flex";
      if (el.calcRapDemandWrap) el.calcRapDemandWrap.style.display = "none";
      if (el.calcSupplierLabel) el.calcSupplierLabel.textContent = "Select WESM Spot Clearing Reference";

      const spotData = rdata.market_prices?.spot_market || {};
      const dus = rdata.dus || [];
      const duSelected = dus.find((d) => d.id === state.calcDuId) || dus[0];
      const duSpotRate = duSelected?.wesm_data?.latest_rate;

      let duSpotOpt = "";
      if (duSpotRate) {
        duSpotOpt = `<option value="${duSpotRate}">₱${duSpotRate.toFixed(4)}/kWh — ${escapeHtml(duSelected.acronym)} DU Spot Rate (${duSelected.wesm_data.genmix_pct}% of mix)</option>`;
      }

      if (el.calcSupplierSelect) {
        el.calcSupplierSelect.innerHTML = `
          <option value="wap" selected>National Spot GWAP — ${peso(MARKET_WAP.wesm)}/kWh</option>
          ${duSpotOpt}
          ${["Luzon", "Visayas", "Mindanao"].filter((g) => REGIONAL_GWAP[g]).map((g) => `<option value="${REGIONAL_GWAP[g]}">${peso(REGIONAL_GWAP[g])}/kWh — ${g} Grid Spot GWAP</option>`).join("")}
        `;
      }
    }

    recalcSavings();
  }

  /**
   * Keep the kWh box consistent with the demand inputs until the user types their own figure.
   */
  function syncSuggestedKwh() {
    if (state.kwhTouched) return;
    const kw = state.calcMode === "rap"
      ? (parseInt(state.calcRapMembers, 10) || 10) * (parseFloat(state.calcRapKwPerMember) || 15)
      : parseFloat(state.calcKw) || 150;
    state.calcKwh = Math.round((kw * HOURS_PER_MONTH * DEFAULT_LOAD_FACTOR) / 100) * 100;
    if (el.calcKwhInput) el.calcKwhInput.value = state.calcKwh;
  }

  /**
   * Real-Time Multi-Program Savings & Qualification Calculation
   */
  function recalcSavings() {
    recalcSavingsCore();
    document.dispatchEvent(new CustomEvent("rm:calc"));
  }

  function recalcSavingsCore() {
    const mode = state.calcMode;
    const dus = window.RETAIL_MARKET_DATA?.dus || [];
    const du = dus.find((d) => d.id === state.calcDuId) || dus[0];

    // DU captive generation rate (URR); no silent fallback to another utility's rate
    const duBaseRate = rateNum(du) ?? MARKET_WAP.crem;
    const rateNote = `Compares generation charges only: ${escapeHtml(du?.acronym || "DU")} captive rate ${fmtRate(du)}/kWh (${escapeHtml(fmtMonth(du?.urr_month))}) vs. the selected ${mode === "wesm" ? "spot price" : "offer"}. Distribution, transmission, system loss, taxes and other DU charges still apply either way.${isStaleRate(du) ? ` <b class="stale-text">This captive rate is more than ${STALE_MONTHS} months older than the ${REPORT_LABEL} market prices, so the gap may be overstated or understated.</b>` : ""}`;
    if (el.calcRateNote) el.calcRateNote.innerHTML = rateNote;

    // Determine Chosen Supplier Rate
    let chosenSupplierRate = MARKET_WAP[mode];
    if (el.calcSupplierSelect) {
      const val = el.calcSupplierSelect.value;
      if (val !== "wap") {
        chosenSupplierRate = parseFloat(val) || MARKET_WAP[mode];
      }
    }

    const kwh = parseFloat(state.calcKwh) || 0;

    if (mode === "crem" || mode === "geop" || mode === "wesm") {
      const kw = parseFloat(state.calcKw) || 150;
      if (el.calcKwDisplay) el.calcKwDisplay.textContent = `${kw} kW`;

      let isEligible = kw >= 100;
      let isUpcoming = kw >= 50 && kw < 100;
      let verdictTitle = "";
      let verdictSub = "";
      let icon = "✓";
      let bannerClass = "verdict-banner";

      if (mode === "wesm") {
        icon = "≈";
        verdictTitle = "WESM Spot Benchmark (reference only)";
        const spread = duBaseRate - chosenSupplierRate;
        if (spread > 0) {
          verdictSub = `Spot clears ₱${spread.toFixed(4)}/kWh below the ${du?.acronym} captive rate on average. End-users don't buy at spot directly; a RES spot pass-through offer adds margin and carries hourly price risk.`;
        } else {
          verdictSub = `Spot rate exceeds ${du?.acronym} captive base rate by ₱${Math.abs(spread).toFixed(4)}/kWh. Fixed RSC hedge recommended.`;
          bannerClass += " upcoming";
        }
      } else if (kw >= 1000) {
        verdictTitle = "Phase I Bulk Contestable (≥1,000 kW)";
        verdictSub = mode === "geop" ? "100% Green Choice (GEOP) or CREM Retail." : "Unrestricted bilateral retail contracts.";
      } else if (kw >= 750) {
        verdictTitle = "Phase II Large Commercial (750–999 kW)";
        verdictSub = "Voluntary open access choice under SC ruling.";
      } else if (kw >= 500) {
        verdictTitle = "Phase III Medium Commercial (500–749 kW)";
        verdictSub = "Fully contestable · Freely switch between RES.";
      } else if (kw >= 100) {
        verdictTitle = "Phase IV Standardized (100–499 kW)";
        verdictSub = "Active threshold under ERC Res. 22 (2025).";
      } else if (kw >= 50) {
        verdictTitle = "Proposed Wave (50–99 kW)";
        verdictSub = "Roadmap Year 1 (2027) · Eligible to pool now under RAP.";
        icon = "!";
        bannerClass += " upcoming";
      } else {
        verdictTitle = "Captive Consumer (<50 kW)";
        verdictSub = "Regulated tariff · Switch to RAP tab to pool demand.";
        icon = "–";
        bannerClass += " captive";
      }

      if (el.verdictBanner) el.verdictBanner.className = bannerClass;
      if (el.verdictIcon) el.verdictIcon.textContent = icon;
      if (el.verdictTitle) el.verdictTitle.textContent = verdictTitle;
      if (el.verdictSub) el.verdictSub.textContent = verdictSub;

      // Savings (only shown as savings once the customer can actually switch)
      const rateDiff = duBaseRate - chosenSupplierRate;
      const monthlySavings = kwh * rateDiff;
      const annualSavings = monthlySavings * 12;
      const pctDiff = Math.round((Math.abs(rateDiff) / duBaseRate) * 100);
      const canSwitch = mode === "wesm" || isEligible;
      const label = mode === "wesm" ? "Gap vs. spot" : rateDiff >= 0 ? "Savings" : "Extra cost";

      if (el.calcMonthlyLabel) el.calcMonthlyLabel.textContent = canSwitch ? `Estimated Monthly ${label}` : "Monthly Savings";
      if (el.calcAnnualLabel) el.calcAnnualLabel.textContent = canSwitch ? `Projected Annual ${label}` : "Annual Savings";
      if (el.calcMonthlySavings) {
        el.calcMonthlySavings.textContent = canSwitch ? (mode === "wesm" ? signedPeso(monthlySavings) : signedPeso(Math.abs(monthlySavings))) : "—";
        el.calcMonthlySavings.classList.toggle("negative", canSwitch && monthlySavings < 0);
      }
      if (el.calcMonthlySub) {
        el.calcMonthlySub.textContent = canSwitch
          ? `vs. ${du?.acronym} captive rate (₱${duBaseRate.toFixed(4)})`
          : isUpcoming
            ? `Not yet eligible · would be ${signedPeso(monthlySavings)}/mo if the 50 kW threshold takes effect`
            : "Not eligible to switch individually";
      }
      if (el.calcAnnualSavings) {
        el.calcAnnualSavings.textContent = canSwitch ? (mode === "wesm" ? signedPeso(annualSavings) : signedPeso(Math.abs(annualSavings))) : "—";
        el.calcAnnualSavings.classList.toggle("negative", canSwitch && annualSavings < 0);
        el.calcAnnualSavings.closest(".saving-box")?.classList.toggle("is-cost", canSwitch && annualSavings < 0);
      }
      if (el.calcAnnualSub) {
        el.calcAnnualSub.textContent = `at ₱${chosenSupplierRate.toFixed(4)}/kWh (${pctDiff}% ${rateDiff >= 0 ? "below" : "above"} captive)`;
      }

      // Physical sanity check: kWh cannot exceed kW × hours in a month
      const lf = kw > 0 ? kwh / (kw * HOURS_PER_MONTH) : 0;
      if (el.calcLfWarning) {
        if (lf > 1) {
          el.calcLfWarning.style.display = "block";
          el.calcLfWarning.innerHTML = `${kwh.toLocaleString()} kWh/month is more than a ${kw} kW load can use running flat-out (${Math.round(kw * HOURS_PER_MONTH).toLocaleString()} kWh). Lower the kWh or raise the peak demand.`;
        } else if (lf > 0 && lf < 0.1) {
          el.calcLfWarning.style.display = "block";
          el.calcLfWarning.innerHTML = `Load factor is only ${(lf * 100).toFixed(0)}%. Check the kWh figure; most commercial loads run at 30–80%.`;
        } else {
          el.calcLfWarning.style.display = "none";
        }
      }

      // Extra Card for GEOP or WESM
      if (mode === "geop" && el.calcExtraMetricCard) {
        const annualMWh = (kwh * 12) / 1000;
        const co2AvoidedTons = (annualMWh * GRID_EMISSION_FACTOR).toFixed(1);
        const treesEquivalent = Math.round(co2AvoidedTons * 16.5);
        el.calcExtraMetricCard.style.display = "block";
        el.calcExtraMetricCard.className = "extra-metric-card";
        el.calcExtraMetricCard.style.background = "#eef7f2";
        el.calcExtraMetricCard.style.borderColor = "#c4e6d8";
        el.calcExtraMetricCard.style.color = "#0b5a47";
        el.calcExtraMetricCard.innerHTML = `
          <div style="font-weight:800; font-size:10px; color:#0b5a47; margin-bottom:4px;">100% Renewable Impact:</div>
          <div style="font-size:10.5px; display:flex; gap:8px; flex-wrap:wrap;">
            <span><strong>${co2AvoidedTons} t CO₂</strong>/yr avoided</span>
            <span><strong>${treesEquivalent.toLocaleString()}</strong> trees planted</span>
          </div>
        `;
      } else if (mode === "wesm" && el.calcExtraMetricCard) {
        const spotMix = du?.wesm_data?.genmix_pct || 15;
        const resMargin = (MARKET_WAP.crem - chosenSupplierRate).toFixed(4);
        el.calcExtraMetricCard.style.display = "block";
        el.calcExtraMetricCard.className = "extra-metric-card";
        el.calcExtraMetricCard.style.background = "#f6f3fc";
        el.calcExtraMetricCard.style.borderColor = "#d7ccf2";
        el.calcExtraMetricCard.style.color = "#53359e";
        el.calcExtraMetricCard.innerHTML = `
          <div style="font-weight:800; font-size:10px; color:#53359e; margin-bottom:4px;">Wholesale Generation Mix:</div>
          <div style="font-size:10.5px; display:flex; gap:8px; flex-wrap:wrap;">
            <span><strong>${spotMix}%</strong> DU spot mix</span>
            <span><strong>+₱${resMargin}/kWh</strong> retail hedge</span>
          </div>
        `;
      } else if (el.calcExtraMetricCard) {
        el.calcExtraMetricCard.style.display = "none";
      }

      // Next Steps
      if (el.calcStepsBox) {
        if (mode === "wesm") {
          el.calcStepsBox.innerHTML = `
            <div style="font-weight:700; margin-bottom:3px; color:#53359e; font-size:10px;">WESM Spot Access:</div>
            <div style="font-size:10.5px; color:#4a5770; line-height:1.35;">
              • Requires IEMOP registration &amp; collateral deposit.<br>
              • Or engage a licensed RES with spot pass-through tariff.
            </div>
          `;
        } else if (isEligible) {
          el.calcStepsBox.innerHTML = `
            <div style="font-weight:700; margin-bottom:3px; color:#14213d; font-size:10px;">Next Steps to Switch:</div>
            <div style="font-size:10.5px; color:#4a5770; line-height:1.35;">
              1. Confirm with ${escapeHtml(du?.acronym || "your DU")} that your average monthly peak demand is at least 100 kW.<br>
              2. Agree terms with a supplier, then send your Letter of Intent at least 90 days before the switch date.<br>
              3. The DU upgrades your meter no later than 30 days before the switch.<br>
              <a href="#" class="guide-link" data-goto-guide>See the full switching guide</a>
            </div>
          `;
        } else {
          el.calcStepsBox.innerHTML = `
            <div style="font-weight:700; margin-bottom:3px; color:#87520b; font-size:10px;">Tip for Sub-100 kW Consumers:</div>
            <div style="font-size:10.5px; color:#6e430a; line-height:1.35;">
              Pool contiguous meters with neighbors under <strong>Retail Aggregation (RAP)</strong> to switch immediately!
            </div>
          `;
        }
      }
    } else if (mode === "rap") {
      // RAP Mode
      const members = parseInt(state.calcRapMembers, 10) || 10;
      const kwPerMember = parseFloat(state.calcRapKwPerMember) || 15;
      const totalPooledKw = members * kwPerMember;

      if (el.calcRapMembersDisplay) el.calcRapMembersDisplay.textContent = `${members} Accounts`;
      if (el.calcRapKwDisplay) el.calcRapKwDisplay.textContent = `${kwPerMember} kW / meter`;
      if (el.calcRapTotalKw) el.calcRapTotalKw.textContent = `${totalPooledKw.toFixed(0)} kW`;

      const isPoolQualified = totalPooledKw >= 100;
      if (el.calcRapPoolStatus) {
        if (isPoolQualified) {
          el.calcRapPoolStatus.innerHTML = `Surpasses 100 kW Threshold`;
          el.calcRapPoolStatus.style.color = "#13866b";
        } else {
          const needed = (100 - totalPooledKw).toFixed(0);
          el.calcRapPoolStatus.innerHTML = `Need +${needed} kW to qualify`;
          el.calcRapPoolStatus.style.color = "#c27a12";
        }
      }

      // Verdict
      let icon = isPoolQualified ? "✓" : "!";
      let bannerClass = isPoolQualified ? "verdict-banner" : "verdict-banner upcoming";
      let verdictTitle = isPoolQualified
        ? `RAP Group Qualified (${totalPooledKw.toFixed(0)} kW Total Pooled Demand)`
        : `Pool Below Threshold (${totalPooledKw.toFixed(0)} kW of 100 kW)`;
      let verdictSub = isPoolQualified
        ? `All ${members} member accounts in ${du?.province || "this franchise"} qualify for wholesale retail supply!`
        : `Add ${Math.ceil((100 - totalPooledKw) / kwPerMember)} more member meters to surpass the 100 kW aggregation mark.`;

      if (el.verdictBanner) el.verdictBanner.className = bannerClass;
      if (el.verdictIcon) el.verdictIcon.textContent = icon;
      if (el.verdictTitle) el.verdictTitle.textContent = verdictTitle;
      if (el.verdictSub) el.verdictSub.textContent = verdictSub;

      // Group Pooled Savings — can be negative if the offer is above the captive rate
      const rateDiff = duBaseRate - chosenSupplierRate;
      const totalMonthlySavings = kwh * rateDiff;
      const totalAnnualSavings = totalMonthlySavings * 12;
      const memberAnnualSavings = totalAnnualSavings / members;
      const word = rateDiff >= 0 ? "Savings" : "Extra cost";

      if (el.calcMonthlyLabel) el.calcMonthlyLabel.textContent = isPoolQualified ? `Group Monthly ${word}` : "Group Monthly Savings";
      if (el.calcAnnualLabel) el.calcAnnualLabel.textContent = isPoolQualified ? `Group Annual ${word}` : "Group Annual Savings";
      if (el.calcMonthlySavings) {
        el.calcMonthlySavings.textContent = isPoolQualified ? signedPeso(Math.abs(totalMonthlySavings)) : "—";
        el.calcMonthlySavings.classList.toggle("negative", isPoolQualified && totalMonthlySavings < 0);
      }
      if (el.calcMonthlySub) el.calcMonthlySub.textContent = isPoolQualified ? `Whole group vs. ${du?.acronym} captive rate` : "Pool must reach 100 kW first";
      if (el.calcAnnualSavings) {
        el.calcAnnualSavings.textContent = isPoolQualified ? signedPeso(Math.abs(totalAnnualSavings)) : "—";
        el.calcAnnualSavings.classList.toggle("negative", isPoolQualified && totalAnnualSavings < 0);
        el.calcAnnualSavings.closest(".saving-box")?.classList.toggle("is-cost", isPoolQualified && totalAnnualSavings < 0);
      }
      if (el.calcAnnualSub) el.calcAnnualSub.textContent = `at ₱${chosenSupplierRate.toFixed(4)}/kWh`;

      const poolLf = totalPooledKw > 0 ? kwh / (totalPooledKw * HOURS_PER_MONTH) : 0;
      if (el.calcLfWarning) {
        if (poolLf > 1) {
          el.calcLfWarning.style.display = "block";
          el.calcLfWarning.innerHTML = `${kwh.toLocaleString()} kWh/month is more than ${members} meters × ${kwPerMember} kW can use running flat-out (${Math.round(totalPooledKw * HOURS_PER_MONTH).toLocaleString()} kWh).`;
        } else {
          el.calcLfWarning.style.display = "none";
        }
      }

      if (el.calcExtraMetricCard) {
        el.calcExtraMetricCard.style.display = "block";
        el.calcExtraMetricCard.className = "extra-metric-card";
        el.calcExtraMetricCard.style.background = "#fcf6ea";
        el.calcExtraMetricCard.style.borderColor = "#eed3a4";
        el.calcExtraMetricCard.style.color = "#87520b";
        el.calcExtraMetricCard.innerHTML = `
          <div style="font-weight:800; margin-bottom:2px;">Per-Member Breakdown:</div>
          <div>${isPoolQualified
            ? `Each of the <strong>${members} members</strong> ${memberAnnualSavings >= 0 ? "saves" : "pays"} about <strong>${signedPeso(Math.abs(memberAnnualSavings))} / year</strong> (${signedPeso(Math.abs(memberAnnualSavings) / 12)} / month) ${memberAnnualSavings >= 0 ? "less" : "more"} than on the captive rate.`
            : `Per-member figures appear once the pool reaches 100 kW.`}</div>
        `;
      }

      if (el.calcStepsBox) {
        el.calcStepsBox.innerHTML = `
          <div style="font-weight:700; margin-bottom:3px; color:#14213d;">Retail Aggregation Program (RAP) Rules:</div>
          <ol style="padding-left:16px; margin:0; line-height:1.4;">
            <li>All aggregated meters must reside within the same DU franchise (${escapeHtml(du?.acronym)}).</li>
            <li>Execute an Aggregation Agreement with a licensed Retail Aggregator.</li>
            <li>Members can be commercial tenants, branch outlets, clinics, or condo units.</li>
          </ol>
        `;
      }
    }
  }

  /**
   * Render Suppliers View (Tab 4 — Complete Verified Submissions from MOS RED)
   */
  function renderSuppliers() {
    if (!el.suppListContainer) return;

    const rdata = window.RETAIL_MARKET_DATA || {};
    const summary = rdata.supplier_market_summary || {};
    const type = state.suppType;
    const q = (state.suppSearchQuery || "").trim().toLowerCase();
    const gFilter = state.suppGroupFilter || "all";

    const resList = rdata.res_suppliers_expanded || [];
    const lresCount = resList.filter((r) => /local res/i.test(r.type || "")).length;
    const resCount = resList.length - lresCount;

    // Update Market Banner
    if (el.suppMarketBanner) {
      if (type === "res") {
        el.suppMarketBanner.innerHTML = `
          <div class="supp-market-stats-row">
            <div class="supp-market-stat">
              <span class="sstat-lbl">Active Retail Suppliers</span>
              <span class="sstat-val">${resCount} RES + ${lresCount} LRES (${resCount + lresCount})</span>
            </div>
            <div class="supp-market-stat">
              <span class="sstat-lbl">Contracted Demand</span>
              <span class="sstat-val">${Number(summary.crem?.total_mw ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MW</span>
            </div>
            <div class="supp-market-stat highlight">
              <span class="sstat-lbl">Market WAP (${escapeHtml(RETAIL_MKT.crem_period || REPORT_LABEL)})</span>
              <span class="sstat-val">${peso(MARKET_WAP.crem)}/kWh</span>
            </div>
          </div>
          <div style="font-size:9.5px; color:#66728a; margin-top:3px;">
            ${(summary.crem?.top_groups || []).map((g) => `${escapeHtml(g.group.replace(/ Group$/, ""))} (${Number(g.share).toFixed(1)}%)`).join(" · ")}
          </div>
        `;
      } else if (type === "geop") {
        el.suppMarketBanner.innerHTML = `
          <div class="supp-market-stats-row">
            <div class="supp-market-stat">
              <span class="sstat-lbl">Active RE Suppliers</span>
              <span class="sstat-val">${(rdata.geop_suppliers_expanded || []).length} RE Suppliers</span>
            </div>
            <div class="supp-market-stat">
              <span class="sstat-lbl">GEOP Demand</span>
              <span class="sstat-val">${Number(summary.geop?.total_mw ?? 0).toFixed(2)} MW (${Number(summary.geop?.total_eus ?? 0).toLocaleString()} EUs)</span>
            </div>
            <div class="supp-market-stat highlight">
              <span class="sstat-lbl">GEOP WAP (${escapeHtml(RETAIL_MKT.geop_period || REPORT_LABEL)})</span>
              <span class="sstat-val" style="color:#13866b;">${peso(MARKET_WAP.geop)}/kWh</span>
            </div>
          </div>
          <div style="font-size:9.5px; color:#0f7059; margin-top:3px;">
            100% Zero-Carbon Renewable Energy (Geothermal, Solar PV, Run-of-River Hydro) · ${escapeHtml(summary.geop?.market_leader?.name || "")} Market Leader (${Number(summary.geop?.market_leader?.share ?? 0).toFixed(1)}%)
          </div>
        `;
      } else if (type === "rap") {
        el.suppMarketBanner.innerHTML = `
          <div class="supp-market-stats-row">
            <div class="supp-market-stat">
              <span class="sstat-lbl">Retail Aggregators</span>
              <span class="sstat-val">${(rdata.rap_aggregators_expanded || []).length} Aggregators</span>
            </div>
            <div class="supp-market-stat">
              <span class="sstat-lbl">Aggregated Members</span>
              <span class="sstat-val">${Number(summary.rap?.total_members ?? 0).toLocaleString()} (${summary.rap?.total_groups ?? 0} Groups)</span>
            </div>
            <div class="supp-market-stat highlight">
              <span class="sstat-lbl">RAP WAP (${escapeHtml(RETAIL_MKT.rap_period || REPORT_LABEL)})</span>
              <span class="sstat-val" style="color:#c27a12;">${peso(MARKET_WAP.rap)}/kWh</span>
            </div>
          </div>
          <div style="font-size:9.5px; color:#a2650d; margin-top:3px;">
            Small end-users (&lt;100 kW) pooled into ≥100 kW within single franchise · ${escapeHtml((summary.rap?.demand_leader?.name || "").replace(/ \(.*\)$/, ""))} (${Number(summary.rap?.demand_leader?.mw ?? 0).toFixed(1)} MW) &amp; ${escapeHtml(summary.rap?.membership_leader?.name || "")} (${Number(summary.rap?.membership_leader?.members ?? 0).toLocaleString()} members) lead
          </div>
        `;
      }
    }

    // Render Group Filter Chips
    if (el.suppGroupChipsRow) {
      if (type === "res") {
        const GROUP_KEYS = ["Aboitiz", "MERALCO", "San Miguel", "First Gen", "Ayala", "Citicore"];
        const LABELS = { MERALCO: "Meralco" };
        const countFor = (k) => resList.filter((r) => (r.group || "").toLowerCase().includes(k.toLowerCase())).length;
        const indep = resList.filter((r) => !GROUP_KEYS.some((k) => (r.group || "").toLowerCase().includes(k.toLowerCase()))).length;
        const groups = [
          { id: "all", label: `All Groups (${resList.length})` },
          ...GROUP_KEYS.map((k) => ({ id: k, label: `${LABELS[k] || k} (${countFor(k)})` })).filter((g) => !/\(0\)$/.test(g.label)),
          { id: "Independent", label: `Independent (${indep})` },
        ];
        el.suppGroupChipsRow.style.display = "flex";
        el.suppGroupChipsRow.innerHTML = groups
          .map(
            (g) =>
              `<button class="supp-group-chip ${gFilter === g.id ? "active" : ""}" data-sgroup="${g.id}">${g.label}</button>`
          )
          .join("");
      } else {
        el.suppGroupChipsRow.style.display = "none";
      }
    }

    // Fetch list based on active tab
    let list = [];
    if (type === "res") list = rdata.res_suppliers_expanded || [];
    else if (type === "geop") list = rdata.geop_suppliers_expanded || [];
    else if (type === "rap") list = rdata.rap_aggregators_expanded || [];

    // Filter by group if RES
    if (type === "res" && gFilter !== "all") {
      list = list.filter((item) => {
        if (gFilter === "Independent") {
          return item.group === "Independent RES" || item.group === "Others";
        }
        return item.group && item.group.includes(gFilter);
      });
    }

    // Filter by search query
    if (q) {
      list = list.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const shortname = (item.shortname || "").toLowerCase();
        const group = (item.group || "").toLowerCase();
        const tech = (item.tech || item.re_type || item.role || "").toLowerCase();
        return name.includes(q) || shortname.includes(q) || group.includes(q) || tech.includes(q);
      });
    }

    if (el.suppCountBadge) {
      el.suppCountBadge.textContent = `${list.length} ${type.toUpperCase()}`;
    }

    if (list.length === 0) {
      el.suppListContainer.innerHTML = `<div style="text-align:center; padding:35px 10px; font-size:11px; color:#97a1b3;">No matching suppliers found</div>`;
      return;
    }

    // Render Cards
    el.suppListContainer.innerHTML = list
      .map((item, idx) => {
        const name = item.name;
        const shortname = item.shortname || name;
        const group = item.group || "";
        const rate = item.rate ? `₱${item.rate.toFixed(4)}/kWh` : "Competitive";
        const mw = item.mw ? item.mw.toFixed(2) : "0.00";
        const clients = item.eus || item.members || 0;
        const share = item.share_pct ? `${item.share_pct.toFixed(2)}%` : "—";
        const typeTag = item.type || "Supplier";
        const tech = item.tech || item.re_type || item.role || "Multi-Tech";
        const validity = item.validity || "Active Verified (ERC)";
        const sourcing = item.affiliate_sourcing || item.pooling_rule || item.esg_benefit || "";
        const compliance = item.sourcing_compliance || "";

        let typeClass = "type-res";
        let rateHighlightClass = "rate-highlight";
        if (type === "geop") {
          typeClass = "type-geop";
          rateHighlightClass += " geop";
        } else if (type === "rap") {
          typeClass = "type-rap";
          rateHighlightClass += " rap";
        }

        return `
        <div class="supp-card" data-supp-idx="${idx}">
          <div class="supp-card-head">
            <div class="supp-card-name-wrap">
              <div class="supp-card-name">${escapeHtml(name)}</div>
              <div class="supp-card-sub-tags">
                ${group ? `<span class="supp-tag group">${escapeHtml(group)}</span>` : ""}
                <span class="supp-tag ${typeClass}">${escapeHtml(typeTag)}</span>
                ${item.capacity_mw ? `<span class="supp-tag" style="background:#f5f7fa; color:#66728a;">Allocation: ${item.capacity_mw.toFixed(1)} MW</span>` : ""}
              </div>
            </div>
            <span class="supp-chevron">▼</span>
          </div>

          <div class="supp-card-metrics-grid">
            <div class="supp-metric-item">
              <span class="sm-lbl">Demand</span>
              <span class="sm-val">${mw} MW</span>
            </div>
            <div class="supp-metric-item">
              <span class="sm-lbl">${type === "rap" ? "Members" : "Clients"}</span>
              <span class="sm-val">${clients.toLocaleString()} ${type === "rap" ? (item.groups ? `(${item.groups} grp)` : "") : "EUs"}</span>
            </div>
            <div class="supp-metric-item">
              <span class="sm-lbl">Mkt Share</span>
              <span class="sm-val">${share}</span>
            </div>
            <div class="supp-metric-item ${rateHighlightClass}">
              <span class="sm-lbl">Offer Rate</span>
              <span class="sm-val">${rate}</span>
            </div>
          </div>

          <!-- Expandable Detail Tray -->
          <div class="supp-details-tray">
            <div class="supp-detail-row">
              <strong>Asset Backing:</strong> ${escapeHtml(tech)}
            </div>
            <div class="supp-detail-row">
              <strong>License Status:</strong> ${escapeHtml(validity)}
            </div>
            ${sourcing ? `<div class="supp-detail-row"><strong>Sourcing &amp; Governance:</strong> ${escapeHtml(sourcing)}</div>` : ""}
            ${compliance ? `<div class="supp-compliance-box"><strong>Regulatory Audit:</strong> ${escapeHtml(compliance)}</div>` : ""}
            <div class="supp-action-row">
              <button class="supp-simulate-btn" data-srate="${item.rate || 5.83}" data-stype="${type}" data-sname="${escapeHtml(shortname)}">Simulate in Calculator</button>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Wire up accordion expand/collapse
    el.suppListContainer.querySelectorAll(".supp-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".supp-simulate-btn")) return;
        card.classList.toggle("expanded");
      });
    });

    // Wire up "Simulate in Calculator" buttons
    el.suppListContainer.querySelectorAll(".supp-simulate-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const srate = parseFloat(btn.getAttribute("data-srate")) || 5.83;
        const stype = btn.getAttribute("data-stype") || "crem";
        const sname = btn.getAttribute("data-sname") || "";

        // Switch to Calculator view
        switchView("viewCalculator");

        // Set calculator mode
        state.calcMode = stype === "res" ? "crem" : stype;
        document.querySelectorAll(".calc-mode-pill[data-mode]").forEach((p) => {
          if (p.getAttribute("data-mode") === state.calcMode) p.classList.add("active");
          else p.classList.remove("active");
        });
        updateCalculatorModeUI();

        // Select the matching rate or closest
        if (el.calcSupplierSelect) {
          el.calcSupplierSelect.value = srate;
          recalcSavings();
        }

        showToast(`Loaded ${sname} (₱${srate.toFixed(4)}/kWh) into Calculator`);
      });
    });

    // Wire up group filter chips
    if (el.suppGroupChipsRow) {
      el.suppGroupChipsRow.querySelectorAll(".supp-group-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          state.suppGroupFilter = chip.getAttribute("data-sgroup") || "all";
          renderSuppliers();
        });
      });
    }
  }

  /**
   * Render Roadmap Modal (Proposed vs Historical)
   */
  function renderRoadmap() {
    if (!el.roadmapContainer) return;

    if (state.roadmapMode === "proposed") {
      el.roadmapContainer.innerHTML = ROADMAP_PROPOSED.map(
        (r) => `
        <div class="roadmap-card">
          <div class="roadmap-card-head">
            <div class="roadmap-card-title">${r.year} · ${r.threshold}</div>
            <span class="roadmap-badge ${r.badge}">${r.status}</span>
          </div>
          <div class="roadmap-card-sub">${r.theme}</div>
          <ul style="padding-left:14px; margin:4px 0 0; font-size:10.5px; color:#4a5770; line-height:1.4;">
            ${r.details.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}
          </ul>
        </div>
      `
      ).join("");
    } else {
      el.roadmapContainer.innerHTML = ROADMAP_HISTORICAL.map(
        (r) => `
        <div class="roadmap-card">
          <div class="roadmap-card-head">
            <div class="roadmap-card-title">${r.phase} · ${r.threshold}</div>
            <span class="roadmap-badge ${r.badge}">${r.status}</span>
          </div>
          <div class="roadmap-card-sub">${r.target} · ${r.stats}</div>
          <div class="roadmap-card-desc">${r.desc}</div>
        </div>
      `
      ).join("");
    }
  }

  /**
   * Side-by-Side Utility Comparator
   */
  function renderComparison() {
    if (!el.compareResultCard) return;

    const dus = window.RETAIL_MARKET_DATA?.dus || [];
    const du1 = dus.find((d) => d.id === state.compareDu1Id) || dus[0];
    const du2 = dus.find((d) => d.id === state.compareDu2Id) || dus[1];

    if (!du1 || !du2) return;

    const rate1 = fmtRate(du1);
    const rate2 = fmtRate(du2);

    el.compareResultCard.innerHTML = `
      <table class="compare-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th style="color:#2d5bd7;">${escapeHtml(du1.acronym)}</th>
            <th style="color:#13866b;">${escapeHtml(du2.acronym)}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Region &amp; Grid</td>
            <td>${escapeHtml(du1.grid)} (${escapeHtml(du1.type || "PDU")})</td>
            <td>${escapeHtml(du2.grid)} (${escapeHtml(du2.type || "PDU")})</td>
          </tr>
          <tr>
            <td>URR Base Rate &amp; Period</td>
            <td><strong>${rate1}/kWh</strong><br><span style="font-size:9.5px; color:#13866b; font-weight:700;">${escapeHtml(fmtMonth(du1.urr_month))}</span>${staleTag(du1)}</td>
            <td><strong>${rate2}/kWh</strong><br><span style="font-size:9.5px; color:#13866b; font-weight:700;">${escapeHtml(fmtMonth(du2.urr_month))}</span>${staleTag(du2)}</td>
          </tr>
          <tr>
            <td>Latest URR WESM Spot Rate</td>
            <td><strong style="color:#6b46c1;">₱${duSpotRate(du1).toFixed(4)}/kWh</strong><br><span style="font-size:9.5px; color:#6b46c1; font-weight:700;">${du1.wesm_data?.latest_rate ? `${du1.wesm_data.genmix_pct}% Spot Mix` : `${escapeHtml(du1.grid)} regional GWAP`}</span></td>
            <td><strong style="color:#6b46c1;">₱${duSpotRate(du2).toFixed(4)}/kWh</strong><br><span style="font-size:9.5px; color:#6b46c1; font-weight:700;">${du2.wesm_data?.latest_rate ? `${du2.wesm_data.genmix_pct}% Spot Mix` : `${escapeHtml(du2.grid)} regional GWAP`}</span></td>
          </tr>
          <tr>
            <td>Annual WESM Procurement</td>
            <td><strong>${((du1.wesm_data?.annual_kwh || 0)/1e6).toFixed(1)} GWh</strong> (₱${((du1.wesm_data?.annual_cost || 0)/1e9).toFixed(2)}B)</td>
            <td><strong>${((du2.wesm_data?.annual_kwh || 0)/1e6).toFixed(1)} GWh</strong> (₱${((du2.wesm_data?.annual_cost || 0)/1e9).toFixed(2)}B)</td>
          </tr>
          <tr>
            <td>Bilateral PSAs Contracted</td>
            <td><strong>${du1.psa_summary?.total_contracts || 0} PSAs</strong> (${du1.psa_summary?.total_contracted_mw || 0} MW)</td>
            <td><strong>${du2.psa_summary?.total_contracts || 0} PSAs</strong> (${du2.psa_summary?.total_contracted_mw || 0} MW)</td>
          </tr>
          <tr>
            <td>Carve-Out Protected MW</td>
            <td><strong style="color:#13866b;">${du1.psa_summary?.carved_out_mw || 0} MW</strong> (${du1.psa_summary?.carveout_share_pct || 0}%)</td>
            <td><strong style="color:#13866b;">${du2.psa_summary?.carved_out_mw || 0} MW</strong> (${du2.psa_summary?.carveout_share_pct || 0}%)</td>
          </tr>
          <tr>
            <td>Locked Take-or-Pay MW</td>
            <td><strong style="color:#c2362b;">${du1.psa_summary?.locked_mw || 0} MW</strong> (${(100 - (du1.psa_summary?.carveout_share_pct || 0)).toFixed(1)}%)</td>
            <td><strong style="color:#c2362b;">${du2.psa_summary?.locked_mw || 0} MW</strong> (${(100 - (du2.psa_summary?.carveout_share_pct || 0)).toFixed(1)}%)</td>
          </tr>
          <tr>
            <td>Weighted Bilateral PSA Rate</td>
            <td><strong>₱${du1.psa_summary?.weighted_psa_rate ? du1.psa_summary.weighted_psa_rate.toFixed(4) : "—"}/kWh</strong></td>
            <td><strong>₱${du2.psa_summary?.weighted_psa_rate ? du2.psa_summary.weighted_psa_rate.toFixed(4) : "—"}/kWh</strong></td>
          </tr>
          <tr>
            <td>CREM Retail EUs</td>
            <td>${(du1.crem_eus || 0).toLocaleString()} EUs</td>
            <td>${(du2.crem_eus || 0).toLocaleString()} EUs</td>
          </tr>
          <tr>
            <td>CREM Demand (MW)</td>
            <td>${(du1.crem_mw || 0).toFixed(1)} MW</td>
            <td>${(du2.crem_mw || 0).toFixed(1)} MW</td>
          </tr>
          <tr>
            <td>GEOP Green EUs</td>
            <td>${(du1.geop_eus || 0).toLocaleString()} EUs</td>
            <td>${(du2.geop_eus || 0).toLocaleString()} EUs</td>
          </tr>
          <tr>
            <td>RAP Groups</td>
            <td>${du1.rap_groups || 0} groups</td>
            <td>${du2.rap_groups || 0} groups</td>
          </tr>
          <tr>
            <td>Switching Penetration</td>
            <td><strong>${du1.switching_penetration_pct || 0}%</strong></td>
            <td><strong>${du2.switching_penetration_pct || 0}%</strong></td>
          </tr>
          <tr>
            <td>Phase V (50–99 kW)</td>
            <td>+${(du1.captive_p5_eus || 0).toLocaleString()} EUs</td>
            <td>+${(du2.captive_p5_eus || 0).toLocaleString()} EUs</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  /**
   * All-in-One Power Market Monitor Modal (Spot, Retail, Captive & Arbitrage)
   */
  function renderPricesModal() {
    if (!el.pricesContainer) return;
    const rdata = window.RETAIL_MARKET_DATA || {};
    const mp = rdata.market_prices || {};
    const spot = mp.spot_market || {};
    const retail = mp.retail_market || {};
    const captive = mp.captive_market || {};
    const dus = rdata.dus || [];

    const capWap = captive.national_captive_wap ?? 6.845;
    const vsCap = (wap) => {
      const d = capWap - wap;
      return `${d >= 0 ? "Below" : "Above"} national captive avg by ${Math.abs((d / capWap) * 100).toFixed(1)}% (${peso(Math.abs(d))}/kWh)`;
    };
    const urrMonths = dus.map((d) => parseMonth(d.urr_month)).filter(Boolean).sort((a, b) => a - b);
    const urrRange = urrMonths.length
      ? `${MONTH_ABBR[urrMonths[0].getMonth()]} ${urrMonths[0].getFullYear()} – ${MONTH_ABBR[urrMonths[urrMonths.length - 1].getMonth()]} ${urrMonths[urrMonths.length - 1].getFullYear()}`
      : "undated";

    if (state.pricesMode === "matrix") {
      el.pricesContainer.innerHTML = `
        <div class="price-banner-box">
          <div class="price-banner-title">
            <span>Philippine Multi-Market Price Structure</span>
            <span style="font-size:10.5px; background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:12px;">${escapeHtml(REPORT_LABEL)} data</span>
          </div>
          <div class="price-banner-sub">
            Wholesale Spot (WESM) · Retail Open Access (CREM) · Green Choice (GEOP) · Regulated Captive Tariffs.
          </div>
        </div>

        <div class="market-matrix-grid">
          <!-- WESM Wholesale Spot -->
          <div class="market-price-card">
            <div class="market-price-header">
              <div class="market-name-wrap">
                <span class="market-badge-pill spot">Wholesale</span>
                <span class="market-title-text">WESM Spot Market (GWAP)</span>
              </div>
              <div class="market-rate-hero" style="color:#6b46c1;">
                ${peso(MARKET_WAP.wesm)}
                <span class="rate-unit">/kWh</span>
              </div>
            </div>
            <div class="market-stats-row">
              <div class="market-stat-col">
                <div class="market-stat-label">Total Volume</div>
                <div class="market-stat-val">${Number(spot.volume_gwh ?? 0).toLocaleString()} GWh</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Market Spend</div>
                <div class="market-stat-val">₱${spot.annual_spend_billion ?? "—"}B</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Operator</div>
                <div class="market-stat-val">${escapeHtml(spot.operator || "IEMOP / PEMC")}</div>
              </div>
            </div>
            <div class="market-spread-box">
              <span>Regional GWAP: ${["Luzon", "Visayas", "Mindanao"].map((g) => `${g} ${peso(regionalGwap(g))}`).join(" · ")}</span>
            </div>
            <div class="market-citation">Source: ${escapeHtml(spot.period || "WESM filings")}</div>
          </div>

          <!-- CREM Retail Open Access -->
          <div class="market-price-card">
            <div class="market-price-header">
              <div class="market-name-wrap">
                <span class="market-badge-pill crem">Retail</span>
                <span class="market-title-text">Competitive Retail (CREM WAP)</span>
              </div>
              <div class="market-rate-hero" style="color:#2d5bd7;">
                ${peso(MARKET_WAP.crem)}
                <span class="rate-unit">/kWh</span>
              </div>
            </div>
            <div class="market-stats-row">
              <div class="market-stat-col">
                <div class="market-stat-label">Total Demand</div>
                <div class="market-stat-val">${Number(retail.crem_demand_mw ?? 0).toFixed(1)} MW</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Active EUs</div>
                <div class="market-stat-val">${Number(retail.crem_eus ?? 0).toLocaleString()}</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Suppliers</div>
                <div class="market-stat-val">${retail.crem_suppliers ?? "—"} RES</div>
              </div>
            </div>
            <div class="market-spread-box savings">
              <span>${vsCap(MARKET_WAP.crem)}</span>
              <span>Over spot: +${peso(MARKET_WAP.crem - MARKET_WAP.wesm)}/kWh</span>
            </div>
            <div class="market-citation">Source: ${escapeHtml(retail.crem_period || "2Q 2026 MOS-CMD (Aug 2026)")}</div>
          </div>

          <!-- GEOP Green Energy -->
          <div class="market-price-card">
            <div class="market-price-header">
              <div class="market-name-wrap">
                <span class="market-badge-pill geop">Renewable</span>
                <span class="market-title-text">Green Energy Option (GEOP WAP)</span>
              </div>
              <div class="market-rate-hero" style="color:#13866b;">
                ${peso(MARKET_WAP.geop)}
                <span class="rate-unit">/kWh</span>
              </div>
            </div>
            <div class="market-stats-row">
              <div class="market-stat-col">
                <div class="market-stat-label">Green Demand</div>
                <div class="market-stat-val">${(retail.geop_demand_mw || 303.5).toFixed(1)} MW</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Active EUs</div>
                <div class="market-stat-val">${(retail.geop_eus || 985).toLocaleString()}</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">RE Suppliers</div>
                <div class="market-stat-val">${retail.geop_suppliers || 15} RE RES</div>
              </div>
            </div>
            <div class="market-spread-box savings">
              <span>${vsCap(MARKET_WAP.geop)}</span>
              <span>Green premium over CREM: +${peso(MARKET_WAP.geop - MARKET_WAP.crem, 2)}/kWh</span>
            </div>
            <div class="market-citation">Source: ${escapeHtml(retail.geop_period || "2Q 2026 MOS-CMD (Aug 2026)")}</div>
          </div>

          <!-- RAP Retail Aggregation -->
          <div class="market-price-card">
            <div class="market-price-header">
              <div class="market-name-wrap">
                <span class="market-badge-pill rap">Aggregation</span>
                <span class="market-title-text">Retail Aggregation (RAP WAP)</span>
              </div>
              <div class="market-rate-hero" style="color:#a2650d;">
                ${peso(MARKET_WAP.rap)}
                <span class="rate-unit">/kWh</span>
              </div>
            </div>
            <div class="market-stats-row">
              <div class="market-stat-col">
                <div class="market-stat-label">Aggregated MW</div>
                <div class="market-stat-val">${(retail.rap_demand_mw || 250.0).toFixed(1)} MW</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Pooled Groups</div>
                <div class="market-stat-val">${(retail.rap_groups || 311).toLocaleString()} (${(retail.rap_members || 4997).toLocaleString()} facilities)</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Aggregators</div>
                <div class="market-stat-val">${retail.rap_aggregators || 20}</div>
              </div>
            </div>
            <div class="market-spread-box savings">
              <span>${vsCap(MARKET_WAP.rap)}</span>
              <span>vs. CREM: ${MARKET_WAP.rap - MARKET_WAP.crem >= 0 ? "+" : "−"}${peso(Math.abs(MARKET_WAP.rap - MARKET_WAP.crem))}/kWh</span>
            </div>
            <div class="market-citation">Source: ${escapeHtml(retail.rap_period || "2Q 2026 MOS-CMD (Aug 2026)")}</div>
          </div>

          <!-- Captive Regulated Base Rate -->
          <div class="market-price-card">
            <div class="market-price-header">
              <div class="market-name-wrap">
                <span class="market-badge-pill captive">Regulated</span>
                <span class="market-title-text">Captive DU Tariffs (National WAP)</span>
              </div>
              <div class="market-rate-hero" style="color:#4a5770;">
                ${peso(capWap)}
                <span class="rate-unit">/kWh</span>
              </div>
            </div>
            <div class="market-stats-row">
              <div class="market-stat-col">
                <div class="market-stat-label">Luzon Base</div>
                <div class="market-stat-val">${captive.luzon_captive_wap ? peso(captive.luzon_captive_wap) : "—"}</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Visayas Base</div>
                <div class="market-stat-val">${captive.visayas_captive_wap ? peso(captive.visayas_captive_wap) : "—"}</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Mindanao Base</div>
                <div class="market-stat-val">${captive.mindanao_captive_wap ? peso(captive.mindanao_captive_wap) : "—"}</div>
              </div>
            </div>
            <div class="market-spread-box">
              <span>Generation charge from each DU's latest URR filing. Filings in the app run ${urrRange}; the data file labels this average “${escapeHtml(captive.period || "")}”.</span>
            </div>
            <div class="market-citation">Source: ${escapeHtml(captive.source || "ERC MOS-CMD Captive Filings")}</div>
          </div>
        </div>
      `;
    } else if (state.pricesMode === "spot") {
      const dusWithWesm = dus.filter((d) => d.wesm_data && d.wesm_data.annual_kwh > 0);
      dusWithWesm.sort((a, b) => (b.wesm_data.annual_kwh || 0) - (a.wesm_data.annual_kwh || 0));

      el.pricesContainer.innerHTML = `
        <div class="spot-grid-layout">
          <div class="spot-gwap-card">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:12px; font-weight:800; color:#14213d;">Regional Spot Clearing (GWAP)</span>
              <span style="font-size:10px; font-weight:700; color:#6b46c1; background:#ebe5f8; padding:2px 8px; border-radius:10px;">National: ${peso(MARKET_WAP.wesm)}</span>
            </div>
            <div class="spot-regions-row">
              ${(() => {
                const regs = ["Luzon", "Visayas", "Mindanao"].map((g) => ({ g, rate: regionalGwap(g), gwh: spot[`${g.toLowerCase()}_gwh`] }));
                const hi = Math.max(...regs.map((r) => r.rate));
                const lo = Math.min(...regs.map((r) => r.rate));
                return regs.map((r) => `
              <div class="spot-region-box ${r.rate === lo ? "cheapest" : ""}">
                <div class="spot-region-name">${r.g}</div>
                <div class="spot-region-rate" ${r.rate === hi ? 'style="color:#c27a12;"' : ""}>${peso(r.rate)}</div>
                <div class="spot-region-sub">${r.gwh ? `${Number(r.gwh).toLocaleString()} GWh` : ""}${r.rate === hi ? " (Highest)" : r.rate === lo ? " (Lowest)" : ""}</div>
              </div>`).join("");
              })()}
            </div>
          </div>

          <div class="spot-gwap-card">
            <div style="font-size:11px; font-weight:800; color:#14213d; margin-bottom:4px;">
              DU Spot Market Exposure Leaderboard
            </div>
            <div style="font-size:10px; color:#66728a; margin-bottom:6px;">
              Annual WESM spot purchases and generation mix percentage based on ERC Annex C &amp; D filings.
            </div>
            <table class="wesm-du-table">
              <thead>
                <tr>
                  <th>Utility</th>
                  <th>Latest Rate</th>
                  <th>Annual Avg</th>
                  <th>Gen Mix %</th>
                </tr>
              </thead>
              <tbody>
                ${dusWithWesm.slice(0, 10).map((d) => `
                  <tr>
                    <td><b>${escapeHtml(d.acronym)}</b> <span style="color:#66728a; font-size:9.5px;">(${escapeHtml(d.grid)})</span></td>
                    <td style="color:#6b46c1;">₱${d.wesm_data.latest_rate.toFixed(4)}</td>
                    <td>₱${d.wesm_data.avg_rate.toFixed(4)}</td>
                    <td><span style="background:#eef3fd; color:#2449b5; padding:1px 4px; border-radius:4px;">${d.wesm_data.genmix_pct}%</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (state.pricesMode === "arbitrage") {
      const curDu = dus.find((d) => d.id === state.arbitrageDuId) || dus[0];
      const duBase = rateNum(curDu) ?? capWap;
      const cremRate = MARKET_WAP.crem;
      const geopRate = MARKET_WAP.geop;
      const curSpot = duSpotRate(curDu);
      const sampleKwh = Math.round((100 * HOURS_PER_MONTH * DEFAULT_LOAD_FACTOR) / 100) * 100;

      const cremDelta = duBase - cremRate;
      const cremDeltaPct = ((cremDelta / duBase) * 100).toFixed(1);
      const geopDelta = duBase - geopRate;
      const geopDeltaPct = ((geopDelta / duBase) * 100).toFixed(1);
      const spotDelta = duBase - curSpot;
      const spotDeltaPct = ((spotDelta / duBase) * 100).toFixed(1);

      el.pricesContainer.innerHTML = `
        <div class="arbitrage-card">
          <label style="font-size:10.5px; font-weight:800; color:#4a5770; display:block; margin-bottom:4px;">
            Select Distribution Utility for Arbitrage Analysis:
          </label>
          <select id="modalArbitrageSelect" class="calc-select" style="margin-bottom:10px;">
            ${dus.map((d) => `<option value="${d.id}" ${d.id === curDu.id ? "selected" : ""}>${escapeHtml(d.acronym)} — ${escapeHtml(d.province)} (${fmtRate(d)}/kWh${isStaleRate(d) ? ", old" : ""})</option>`).join("")}
          </select>

          <div style="background:#f5f7fa; border:1px solid #dde3eb; border-radius:8px; padding:10px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="font-size:13px; font-weight:900; color:#14213d;">${escapeHtml(curDu.acronym)}</span>
                <span style="font-size:10.5px; color:#66728a; margin-left:4px;">${escapeHtml(curDu.province)}</span>
              </div>
              <span style="font-size:12px; font-weight:900; color:#a42e25; background:#f9e1de; padding:2px 8px; border-radius:12px;">
                Captive: ₱${duBase.toFixed(4)}/kWh
              </span>
            </div>
            <div style="font-size:10px; color:#66728a; margin-top:3px;">
              Filing: ${escapeHtml(fmtMonth(curDu.urr_month))}${staleTag(curDu)} · ${curDu.wesm_data?.latest_rate ? `Spot share of supply: ${curDu.wesm_data.genmix_pct}%` : `No DU spot data (using ${escapeHtml(curDu.grid)} GWAP)`}
            </div>
          </div>

          <div style="font-size:10px; font-weight:800; color:#14213d; margin-top:10px; margin-bottom:4px;">
            Net Spread vs Captive Base Tariff:
          </div>
          <div class="arbitrage-delta-grid">
            <div class="arbitrage-delta-box ${cremDelta >= 0 ? "positive" : "negative"}">
              <div class="arbitrage-delta-label">CREM Net</div>
              <div class="arbitrage-delta-val">${cremDelta >= 0 ? `+₱${cremDelta.toFixed(4)}` : `-₱${Math.abs(cremDelta).toFixed(4)}`}</div>
              <div class="arbitrage-delta-sub">${cremDelta >= 0 ? `${cremDeltaPct}% cheaper` : `${Math.abs(cremDeltaPct)}% dearer`}</div>
            </div>
            <div class="arbitrage-delta-box ${geopDelta >= 0 ? "positive" : "negative"}">
              <div class="arbitrage-delta-label">GEOP Net</div>
              <div class="arbitrage-delta-val">${geopDelta >= 0 ? `+₱${geopDelta.toFixed(4)}` : `-₱${Math.abs(geopDelta).toFixed(4)}`}</div>
              <div class="arbitrage-delta-sub">${geopDelta >= 0 ? `${geopDeltaPct}% cheaper` : `${Math.abs(geopDeltaPct)}% dearer`}</div>
            </div>
            <div class="arbitrage-delta-box ${spotDelta >= 0 ? "positive" : "negative"}" style="background:${spotDelta >= 0 ? "#f6f3fc" : "#fcefed"}; border-color:${spotDelta >= 0 ? "#ddd3f3" : "#f2c3bd"};">
              <div class="arbitrage-delta-label" style="color:${spotDelta >= 0 ? "#6b46c1" : "#c2362b"};">Spot Delta</div>
              <div class="arbitrage-delta-val" style="color:${spotDelta >= 0 ? "#6b46c1" : "#c2362b"};">${spotDelta >= 0 ? `+₱${spotDelta.toFixed(4)}` : `-₱${Math.abs(spotDelta).toFixed(4)}`}</div>
              <div class="arbitrage-delta-sub">${spotDelta >= 0 ? `${spotDeltaPct}% below captive` : `${Math.abs(spotDeltaPct)}% above captive`}</div>
            </div>
          </div>

          <div style="margin-top:10px; padding:7px 10px; background:${cremDelta >= 0 ? "#eef3fd" : "#f5f7fa"}; border-radius:8px; border:1px solid ${cremDelta >= 0 ? "#c7d5f7" : "#dde3eb"}; font-size:10.5px; color:${cremDelta >= 0 ? "#1f3f9c" : "#4a5770"}; line-height:1.35;">
            <b>Arbitrage Summary:</b> ${cremDelta >= 0 
              ? `Switching from <b>${escapeHtml(curDu.acronym)}</b> to CREM saves <b>₱${cremDelta.toFixed(4)}/kWh</b> (${cremDeltaPct}%) · Est. <b>₱${Math.round(sampleKwh * cremDelta).toLocaleString()}/mo</b> for a 100 kW customer at ${Math.round(DEFAULT_LOAD_FACTOR * 100)}% load factor (${sampleKwh.toLocaleString()} kWh). Generation charge only.`
              : `<b>${escapeHtml(curDu.acronym)}</b>'s captive base tariff is competitive (₱${Math.abs(cremDelta).toFixed(4)}/kWh below the national CREM WAP). Retail choice available if specialized green or bilateral hedge required.`}
          </div>
        </div>
      `;

      document.getElementById("modalArbitrageSelect")?.addEventListener("change", (e) => {
        state.arbitrageDuId = e.target.value;
        renderPricesModal();
      });
    }
  }

  /**
   * Data Notes modal: sources, assumptions and live data-quality checks
   */
  function renderDataNotes() {
    const box = document.getElementById("dataNotesContainer");
    if (!box) return;
    const checks = runDataChecks();
    const S = RD.summary || {};
    const lvl = { high: "", medium: "", low: "" };
    box.innerHTML = `
      <div class="notes-section">
        <div class="notes-heading">Sources</div>
        <div class="notes-text">
          Market data: ${escapeHtml(S.report_reference || "")} (${escapeHtml(S.report_period || "")}).<br>
          Captive rates: each utility's latest URR filing, ${escapeHtml(fmtMonth((RD.dus || []).map((d) => d.urr_month).filter((m) => parseMonth(m)).sort((a, b) => parseMonth(a) - parseMonth(b))[0]))} onward.<br>
          Spot prices: ${escapeHtml(SPOT_MKT.period || "")}.
        </div>
      </div>
      <div class="notes-section">
        <div class="notes-heading">Calculator assumptions</div>
        <div class="notes-text">
          • Compares <b>generation charges only</b>. Distribution, transmission, system loss, taxes and universal charges are paid either way.<br>
          • Suggested kWh = peak kW × ${HOURS_PER_MONTH} h × ${Math.round(DEFAULT_LOAD_FACTOR * 100)}% load factor, until you type your own.<br>
          • Captive rates more than ${STALE_MONTHS} months older than ${escapeHtml(REPORT_LABEL)} are tagged “Old rate”.<br>
          • WESM spot is a reference price; end-users normally reach it only through a RES pass-through offer.
        </div>
      </div>
      <div class="notes-section">
        <div class="notes-heading">Data checks (${checks.length} open)</div>
        ${checks.length
          ? checks.map((c) => `<div class="check-item ${c.level}"><div class="check-title">${lvl[c.level] || ""} ${escapeHtml(c.title)}</div><div class="check-detail">${escapeHtml(c.detail)}</div></div>`).join("")
          : `<div class="notes-text">All checks pass.</div>`}
        <div class="notes-text" style="margin-top:6px; color:#66728a;">These checks rerun from data.js every time the app opens, so each one disappears once the data is fixed.</div>
      </div>
    `;
  }

  /**
   * Render 501 FAQ View (Auto-Search & Instant Filtering)
   */
  function renderFaq() {
    if (!el.faqListContainer) return;

    const faqs = window.RCOA_FAQ_DATA?.faqs || [];
    const q = (state.faqQuery || "").trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter((t) => t.length > 0) : [];

    let filtered = faqs;
    if (q) {
      filtered = faqs
        .map((f) => {
          const qText = (f.question || "").toLowerCase();
          const aText = (f.answer || "").toLowerCase();
          const idText = (f.id || "").toLowerCase();

          let score = 0;
          if (qText.includes(q)) score += 100;
          if (aText.includes(q)) score += 30;
          if (idText === q) score += 200;

          tokens.forEach((t) => {
            if (qText.includes(t)) score += 20;
            if (aText.includes(t)) score += 10;
          });

          return { item: f, score };
        })
        .filter((res) => res.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((res) => res.item);
    }

    if (el.faqCountBadge) {
      el.faqCountBadge.textContent = `${filtered.length} FAQ${filtered.length === 1 ? "" : "s"}`;
    }

    if (filtered.length === 0) {
      el.faqListContainer.innerHTML = `
        <div style="text-align:center; padding:35px 10px; color:#97a1b3;">
          <div style="font-size:22px; margin-bottom:4px;"></div>
          <div style="font-size:12px; font-weight:700; color:#14213d;">No matching questions found</div>
          <div style="font-size:10px; color:#66728a; margin-top:4px;">Try searching for "threshold", "switching", "rap", or a question ID like "Q142"</div>
        </div>
      `;
      return;
    }

    const headerNote = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:10.5px; font-weight:700; color:#66728a; margin-bottom:8px; padding:2px 4px;">
        <span>Showing all ${filtered.length} questions${tokens.length > 0 ? " matching query" : " (Q1 to Q501)"}</span>
        <span style="color:#2d5bd7; font-size:10px; font-weight:700;">Tap tile to read</span>
      </div>
    `;

    el.faqListContainer.innerHTML = headerNote + filtered
      .map(
        (f) => `
        <div class="faq-tile" data-id="${f.id}">
          <div class="faq-tile-head">
            <span class="faq-tile-q">${highlight(f.question, tokens)}</span>
            <span class="faq-tile-icon">▼</span>
          </div>
          <div class="faq-tile-body">
            <div>${highlight(f.answer, tokens)}</div>
            <div class="faq-action-row">
              <span class="faq-section-tag">Section ${f.section_id || 1} · ${escapeHtml(f.section_title || "RCOA Guide")}</span>
              <button class="faq-copy-btn" data-text="${escapeHtml(f.answer)}">Copy Answer</button>
            </div>
          </div>
        </div>
      `
      )
      .join("");

    el.faqListContainer.querySelectorAll(".faq-tile-head").forEach((head) => {
      head.addEventListener("click", () => {
        head.closest(".faq-tile").classList.toggle("expanded");
      });
    });

    el.faqListContainer.querySelectorAll(".faq-copy-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const text = btn.getAttribute("data-text");
        if (navigator.clipboard && text) {
          navigator.clipboard.writeText(text);
          showToast("Answer copied");
        } else {
          showToast("Answer copied");
        }
      });
    });
  }

  /**
   * Helper: Escape HTML & Highlight Tokens
   */
  const DECOR_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}]\uFE0F?\s?/gu;
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(DECOR_EMOJI, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function highlight(text, tokens) {
    if (!text) return "";
    const escaped = escapeHtml(text);
    if (!tokens || tokens.length === 0) return escaped;

    const valid = tokens
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length >= 2);
    if (valid.length === 0) return escaped;

    try {
      const pattern = new RegExp(
        `(${valid.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
        "gi"
      );
      return escaped.replace(pattern, '<span class="faq-highlight">$1</span>');
    } catch (e) {
      return escaped;
    }
  }

  /**
   * Toast Notification
   */
  function showToast(msg) {
    if (!el.toastNotification) return;
    el.toastNotification.textContent = msg;
    el.toastNotification.classList.add("active");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      el.toastNotification?.classList.remove("active");
    }, 2000);
  }

  /**
   * Initialize All UI Event Listeners
   */
  function initControls() {
    // Bottom Tab Bar Navigation (5 Tabs)
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const viewId = tab.getAttribute("data-view");
        if (viewId) switchView(viewId);
      });
    });

    // Map Search
    el.searchInput?.addEventListener("input", (e) => {
      handleSearch(e.target.value);
    });

    el.clearSearchBtn?.addEventListener("click", () => {
      if (el.searchInput) el.searchInput.value = "";
      state.searchQuery = "";
      el.clearSearchBtn?.classList.remove("active");
      closeSearch();
    });

    // Reset button
    el.resetBtn?.addEventListener("click", performReset);

    // Re-center Map button
    el.centerMapBtn?.addEventListener("click", () => {
      state.gridFilter = "all";
      document.querySelectorAll(".pill-btn").forEach((b) => {
        if (b.getAttribute("data-grid") === "all") b.classList.add("active");
        else b.classList.remove("active");
      });
      renderMarkers();
      updateStatsRibbon();
      state.map?.flyTo([12.6, 122.2], 5.8, { duration: 0.7 });
    });

    // Island Grid Pills
    document.querySelectorAll(".pill-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".pill-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.gridFilter = btn.getAttribute("data-grid");
        // Keep the bottom card relevant: if the selected utility is outside the chosen grid,
        // switch to that grid's largest retail market.
        if (state.gridFilter !== "all" && state.selectedDu?.grid !== state.gridFilter) {
          const top = (RD.dus || [])
            .filter((d) => d.grid === state.gridFilter && isDistributionUtility(d))
            .sort((a, b) => (b.crem_mw || 0) - (a.crem_mw || 0))[0];
          if (top) selectDu(top, false);
        }
        renderMarkers();
        updateStatsRibbon();
        const bounds = GRID_BOUNDS[state.gridFilter];
        if (bounds && state.map) {
          state.map.flyToBounds(bounds, { padding: [35, 35], duration: 0.7 });
        }
      });
    });

    // Program Filter Pills
    document.querySelectorAll(".program-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".program-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.programFilter = pill.getAttribute("data-filter");
        renderMarkers();
        updateStatsRibbon();
      });
    });

    // Bottom Card Toggle & Drawer Tabs
    el.cardHandle?.addEventListener("click", toggleCard);
    el.cardSummary?.addEventListener("click", toggleCard);
    el.cardToggleBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCard();
    });

    document.querySelectorAll(".drawer-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".drawer-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const target = tab.getAttribute("data-dtab");
        state.activeDrawerTab = target;

        document.querySelectorAll(".dtab-content").forEach((content) => {
          content.classList.remove("active");
        });

        if (target === "overview") document.getElementById("dtabOverview")?.classList.add("active");
        else if (target === "psas") document.getElementById("dtabPsas")?.classList.add("active");
        else if (target === "suppliers") document.getElementById("dtabSuppliers")?.classList.add("active");
        else if (target === "phases") document.getElementById("dtabPhases")?.classList.add("active");
      });
    });

    // PSA Filter Chips (All, Carve-Out, Locked)
    document.querySelectorAll(".psa-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".psa-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        state.psaFilter = chip.getAttribute("data-pfilter") || "all";
        if (state.selectedDu) renderDuPsas(state.selectedDu);
      });
    });

    // Directory Search & Sort Chips
    el.dirSearchInput?.addEventListener("input", (e) => {
      state.dirSearchQuery = e.target.value;
      el.clearDirBtn?.classList.toggle("active", Boolean(e.target.value.trim()));
      renderDirectory();
    });

    el.clearDirBtn?.addEventListener("click", () => {
      if (el.dirSearchInput) el.dirSearchInput.value = "";
      state.dirSearchQuery = "";
      el.clearDirBtn?.classList.remove("active");
      renderDirectory();
    });

    document.querySelectorAll(".dir-sort-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".dir-sort-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        state.dirSortBy = chip.getAttribute("data-sort");
        renderDirectory();
      });
    });

    // Calculator Mode Pills (CREM, GEOP, RAP)
    document.querySelectorAll(".calc-mode-pill[data-mode]").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".calc-mode-pill[data-mode]").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.calcMode = pill.getAttribute("data-mode");
        updateCalculatorModeUI();
      });
    });

    // Calculator Inputs
    el.calcKwInput?.addEventListener("input", (e) => {
      state.calcKw = parseFloat(e.target.value) || 150;
      document.querySelectorAll(".preset-chip").forEach((c) => c.classList.remove("active"));
      syncSuggestedKwh();
      recalcSavings();
    });

    document.querySelectorAll(".preset-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".preset-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        const kw = parseFloat(chip.getAttribute("data-kw")) || 150;
        state.calcKw = kw;
        if (el.calcKwInput) el.calcKwInput.value = kw;
        syncSuggestedKwh();
        recalcSavings();
      });
    });

    el.calcRapMembersInput?.addEventListener("input", (e) => {
      state.calcRapMembers = parseInt(e.target.value, 10) || 10;
      syncSuggestedKwh();
      recalcSavings();
    });

    el.calcRapKwPerMember?.addEventListener("input", (e) => {
      state.calcRapKwPerMember = parseFloat(e.target.value) || 15;
      syncSuggestedKwh();
      recalcSavings();
    });

    el.calcDuSelect?.addEventListener("change", (e) => {
      state.calcDuId = e.target.value;
      if (state.calcMode === "wesm") {
        updateCalculatorModeUI();
      } else {
        recalcSavings();
      }
    });

    el.calcSupplierSelect?.addEventListener("change", () => {
      recalcSavings();
    });

    el.calcKwhInput?.addEventListener("input", (e) => {
      state.calcKwh = parseFloat(e.target.value) || 0;
      state.kwhTouched = e.target.value !== "";
      recalcSavings();
    });

    // Copy Calculator Report
    el.copyCalcReportBtn?.addEventListener("click", () => {
      const mode = state.calcMode.toUpperCase();
      const monthly = el.calcMonthlySavings?.textContent || "₱0";
      const annual = el.calcAnnualSavings?.textContent || "₱0";
      const verdict = el.verdictTitle?.textContent || "";
      const du = (RD.dus || []).find((d) => d.id === state.calcDuId);
      const text = `RetailMarket PH Analysis (${mode}):\nUtility: ${du?.acronym || ""} (captive ${fmtRate(du)}/kWh, ${fmtMonth(du?.urr_month)}${isStaleRate(du) ? ", rate older than market data" : ""})\nOffer: ${el.calcSupplierSelect?.selectedOptions?.[0]?.textContent?.trim() || ""}\nConsumption: ${Number(state.calcKwh).toLocaleString()} kWh/month\nVerdict: ${verdict}\nMonthly: ${monthly}\nAnnual: ${annual}\nGeneration charges only; DU wheeling charges unchanged.`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        showToast("Report copied");
      }
    });

    // Suppliers View Mode & Search
    document.querySelectorAll(".calc-mode-pill[data-stype]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".calc-mode-pill[data-stype]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.suppType = btn.getAttribute("data-stype");
        state.suppGroupFilter = "all";
        renderSuppliers();
      });
    });

    el.suppSearchInput?.addEventListener("input", (e) => {
      state.suppSearchQuery = e.target.value;
      el.clearSuppBtn?.classList.toggle("active", Boolean(e.target.value.trim()));
      renderSuppliers();
    });

    el.clearSuppBtn?.addEventListener("click", () => {
      if (el.suppSearchInput) el.suppSearchInput.value = "";
      state.suppSearchQuery = "";
      el.clearSuppBtn?.classList.remove("active");
      renderSuppliers();
    });

    // FAQ Search & Category Chips
    el.faqSearchInput?.addEventListener("input", (e) => {
      state.faqQuery = e.target.value;
      el.clearFaqBtn?.classList.toggle("active", Boolean(e.target.value.trim()));
      renderFaq();
    });

    el.clearFaqBtn?.addEventListener("click", () => {
      if (el.faqSearchInput) el.faqSearchInput.value = "";
      state.faqQuery = "";
      el.clearFaqBtn?.classList.remove("active");
      renderFaq();
    });

    document.querySelectorAll(".faq-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".faq-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        const q = chip.getAttribute("data-q") || "";
        if (el.faqSearchInput) el.faqSearchInput.value = q;
        state.faqQuery = q;
        renderFaq();
      });
    });

    // Power Market Prices Modal Handlers
    el.openPricesBtn?.addEventListener("click", () => {
      renderPricesModal();
      el.pricesModal?.classList.add("active");
    });

    el.closePricesBtn?.addEventListener("click", () => {
      el.pricesModal?.classList.remove("active");
    });

    el.pricesModal?.addEventListener("click", (e) => {
      if (e.target === el.pricesModal) el.pricesModal?.classList.remove("active");
    });

    document.querySelectorAll(".prices-mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".prices-mode-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        state.pricesMode = tab.getAttribute("data-pmode");
        renderPricesModal();
      });
    });

    // Roadmap Modal & Toggle (Proposed vs Historical)
    el.openRoadmapBtn?.addEventListener("click", () => {
      el.roadmapModal?.classList.add("active");
    });

    el.closeRoadmapBtn?.addEventListener("click", () => {
      el.roadmapModal?.classList.remove("active");
    });

    el.roadmapModal?.addEventListener("click", (e) => {
      if (e.target === el.roadmapModal) el.roadmapModal?.classList.remove("active");
    });

    document.querySelectorAll(".roadmap-mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".roadmap-mode-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        state.roadmapMode = tab.getAttribute("data-rmode");
        renderRoadmap();
      });
    });

    // Utility Comparator Modal Handlers
    el.openCompareBtn?.addEventListener("click", () => {
      renderComparison();
      el.compareModal?.classList.add("active");
    });

    el.closeCompareBtn?.addEventListener("click", () => {
      el.compareModal?.classList.remove("active");
    });

    el.compareModal?.addEventListener("click", (e) => {
      if (e.target === el.compareModal) el.compareModal?.classList.remove("active");
    });

    el.compareDu1?.addEventListener("change", (e) => {
      state.compareDu1Id = e.target.value;
      renderComparison();
    });

    el.compareDu2?.addEventListener("change", (e) => {
      state.compareDu2Id = e.target.value;
      renderComparison();
    });

    // Data Notes modal (opened from the brand button)
    const notesModal = document.getElementById("dataNotesModal");
    document.getElementById("brandPill")?.addEventListener("click", () => {
      renderDataNotes();
      notesModal?.classList.add("active");
    });
    document.getElementById("closeDataNotesBtn")?.addEventListener("click", () => notesModal?.classList.remove("active"));
    notesModal?.addEventListener("click", (e) => {
      if (e.target === notesModal) notesModal.classList.remove("active");
    });

    // Escape closes any open sheet
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      document.querySelectorAll(".modal-overlay.active").forEach((m) => m.classList.remove("active"));
      closeSearch();
    });

    collapseCard();
  }

  // Small public surface for features.js (simulator, sharing, guide, languages)
  window.RMApp = {
    RD, state, el, MARKET_WAP, REPORT_LABEL, STALE_MONTHS,
    rateNum, fmtRate, fmtMonth, parseMonth, isStaleRate, isDistributionUtility, escapeHtml, peso, signedPeso,
    selectDu, switchView, renderMarkers, recalcSavings, updateCalculatorModeUI, showToast, runDataChecks,
    selectDuById(id, fly = true) {
      const du = (RD.dus || []).find((d) => d.id === id);
      if (du) selectDu(du, fly);
      return du;
    },
  };

  // DOM Ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
