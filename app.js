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
    calcKwh: 65000,
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

  // Market Benchmark Weighted Average Prices (WAP) from MOS Memo (Aug 2026)
  const MARKET_WAP = {
    crem: 5.8300,
    geop: 6.1200,
    rap: 5.8400,
    wesm: 4.4038,
  };

  // Grid Emission Factor for GEOP Decarbonization (tCO2 / MWh)
  const GRID_EMISSION_FACTOR = 0.7122;

  // Official Proposed 2027–2031 Roadmap (ERC Working Draft, Oct 2026)
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

  // Historical RCOA Phases (2013–2026)
  const ROADMAP_HISTORICAL = [
    {
      phase: "Phase I (2013)",
      threshold: "≥ 1,000 kW (1 MW)",
      target: "Bulk Industrial & Commercial",
      badge: "done",
      status: "Implemented",
      stats: "1,437 EUs · 4,131.2 MW",
      desc: "Inaugural commercial launch of retail open access across interconnected Luzon, Visayas, and Mindanao WESM networks."
    },
    {
      phase: "Phase II (2016)",
      threshold: "750 kW to 999 kW",
      target: "Large Commercial",
      badge: "done",
      status: "Implemented",
      stats: "514 EUs · 436.7 MW",
      desc: "Supreme Court permanent injunction affirmed customer choice as strictly voluntary, with right to remain captive."
    },
    {
      phase: "Phase III (2021)",
      threshold: "500 kW to 749 kW",
      target: "Medium Commercial",
      badge: "done",
      status: "Implemented",
      stats: "623 EUs · 480.5 MW",
      desc: "Expanded customer choice to cold storage logistics, shopping malls, and secondary medical centers."
    },
    {
      phase: "Phase IV (2026)",
      threshold: "100 kW to 499 kW",
      target: "Small Commercial & Enterprise",
      badge: "active",
      status: "Active (100 kW Unified)",
      stats: "118 CREM + 985 GEOP · 335.9 MW",
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
      document.querySelectorAll(".calc-mode-pill").forEach((p) => {
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

    filtered.forEach((du) => {
      const lat = du.lat;
      const lon = du.lon ?? du.lng;
      if (typeof lat !== "number" || typeof lon !== "number") return;

      const isSelected = state.selectedDu && state.selectedDu.id === du.id;
      const hasCrem = (du.crem_eus || 0) > 0;
      const hasGeop = (du.geop_eus || 0) > 0;
      const hasRap = (du.rap_groups || 0) > 0;

      let dotClass = "crem";
      if (hasCrem && hasGeop) dotClass = "crem-geop";
      else if (!hasCrem && hasGeop) dotClass = "geop";
      if (hasRap) dotClass += " rap-ring";
      if (isSelected) dotClass += " active";

      const showCallout = isSelected;
      const isLandmark = LANDMARKS.has(du.acronym);

      const html = `
        <div class="clean-marker">
          ${showCallout ? `<div class="marker-callout-pill">${escapeHtml(du.acronym)} · ${(du.crem_eus || 0).toLocaleString()} EUs</div>` : ""}
          <div class="marker-dot ${dotClass}"></div>
          ${!showCallout && isLandmark ? `<div class="landmark-tag">${escapeHtml(du.acronym)}</div>` : ""}
        </div>
      `;

      const icon = L.divIcon({
        className: "custom-div-icon",
        html: html,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const marker = L.marker([lat, lon], {
        icon: icon,
        zIndexOffset: isSelected ? 1000 : 10,
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

    const totalDus = activeList.length;
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

    const prefix = state.gridFilter === "all" ? "⚡" : `⚡ ${state.gridFilter}:`;
    if (el.ribbonDUs) el.ribbonDUs.textContent = `${prefix} ${totalDus} On-Grid DUs`;
    if (el.ribbonCREM) el.ribbonCREM.textContent = `${cremEus.toLocaleString()} CREM EUs (${cremMw.toFixed(0)} MW)`;
    if (el.ribbonGEOP) el.ribbonGEOP.textContent = `${geopEus.toLocaleString()} GEOP EUs`;
    if (el.ribbonRAP) el.ribbonRAP.textContent = `${rapGroups} RAP Grps`;
  }

  /**
   * Select DU & Update Mobile Bottom Card
   */
  function selectDu(du, flyTo = true) {
    if (!du) return;
    state.selectedDu = du;

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
    const formattedRate = du.base_rate ? (du.base_rate.startsWith("₱") ? du.base_rate : `₱${du.base_rate}`) : "₱7.3300";
    if (el.cardBaseRate) el.cardBaseRate.textContent = `${formattedRate}/kWh`;
    if (el.cardWesmRate) {
      const wRate = du.wesm_data?.latest_rate || 5.4513;
      el.cardWesmRate.textContent = `₱${wRate.toFixed(4)}`;
      el.cardWesmRate.title = `WESM Spot: ₱${wRate.toFixed(4)}/kWh (${du.wesm_data?.genmix_pct || 15}% captive mix)`;
    }
    if (el.bmDuRate) el.bmDuRate.textContent = `${formattedRate}`;
    if (el.bmDuSub) {
      el.bmDuSub.textContent = du.urr_month ? `📅 ${du.urr_month} URR filing` : "Regulated URR captive tariff";
    }
    if (el.bmCremRate) el.bmCremRate.textContent = `₱${MARKET_WAP.crem.toFixed(4)}`;
    if (el.bmGeopRate) el.bmGeopRate.textContent = `₱${MARKET_WAP.geop.toFixed(4)}`;
    if (el.bmWesmRate) {
      if (du.wesm_data && du.wesm_data.latest_rate) {
        el.bmWesmRate.textContent = `₱${du.wesm_data.latest_rate.toFixed(4)}`;
        if (el.bmWesmSub) el.bmWesmSub.textContent = `${du.wesm_data.genmix_pct}% gen mix`;
      } else {
        const regGwap = du.grid === "Visayas" ? 4.9967 : du.grid === "Mindanao" ? 3.9837 : 4.3140;
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
              <span style="font-weight:700; color:#0f172a;">${escapeHtml(s.name)}</span>
              <span style="color:#2563eb; font-weight:700;">${escapeHtml(s.share || s.role || "Active")}</span>
            </div>
          `
          )
          .join("");
      } else {
        el.cardSuppliersList.innerHTML = `<div style="font-size:9.5px; color:#94a3b8; padding:3px;">Supplied via standard contestable retail contracts</div>`;
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
        <div style="font-weight:700; color:#92400e; font-size:10px;">
          ⚡ ${(du.captive_p5_eus || 0).toLocaleString()} EUs (${(du.captive_p5_mw || 0).toFixed(1)} MW) · 50–99 kW Wave
        </div>
        <div style="font-size:9px; color:#78350f; margin-top:2px;">
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
        <div style="font-size:10px; font-weight:700; color:#1e293b; margin-bottom:2px;">Special Procuring Entity / Industrial Zone</div>
        <div style="font-size:9px; color:#64748b; line-height:1.35;">
          No captive bilateral PSAs on file. Energy is procured directly through PEZA industrial zone tariffs or WESM spot purchases without captive stranded capacity covenants.
        </div>
      `;
      el.cardPsasList.innerHTML = `<div style="font-size:9.5px; color:#94a3b8; text-align:center; padding:15px;">No bilateral PSAs registered</div>`;
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
          <div class="pstat-val">${summary.total_contracted_mw.toLocaleString()} <span style="font-size:7px; font-weight:600;">MW</span></div>
        </div>
        <div class="psa-summary-stat">
          <div class="pstat-lbl">Captive Base</div>
          <div class="pstat-val" style="color:#2563eb;">${du.base_rate ? (du.base_rate.startsWith("₱") ? du.base_rate : `₱${du.base_rate}`) : "₱7.3300"}</div>
        </div>
        <div class="psa-summary-stat">
          <div class="pstat-lbl" style="color:#7c3aed;">URR WESM Spot</div>
          <div class="pstat-val" style="color:#7c3aed;" title="${wesmMix}% captive generation mix">₱${wesmRateVal.toFixed(4)}</div>
        </div>
        <div class="psa-summary-stat">
          <div class="pstat-lbl">Filing Month</div>
          <div class="pstat-val" style="font-size:8.5px; color:#059669; font-weight:800;" title="${escapeHtml(urrMonthLabel)}">📅 ${escapeHtml(urrMonthLabel)}</div>
        </div>
      </div>
      <div class="psa-progress-wrap">
        <div class="psa-progress-bar">
          <div class="psa-progress-segment carved" style="width: ${carvePct}%;"></div>
          <div class="psa-progress-segment locked" style="width: ${100 - carvePct}%;"></div>
        </div>
        <div class="psa-progress-legend">
          <span class="psa-legend-item carved">🟢 Carve-Out: ${summary.carved_out_mw.toFixed(1)} MW (${carvePct}%)</span>
          <span class="psa-legend-item" style="color:#7c3aed;">⚡ Spot Mix: ${wesmMix}% (${wesmGwh} GWh)</span>
          <span class="psa-legend-item locked">🔴 Locked: ${summary.locked_mw.toFixed(1)} MW</span>
        </div>
      </div>
    `;

    const wesmCardHtml = `
      <div class="psa-card psa-wesm">
        <div class="psa-header-row">
          <div class="psa-supplier-title" style="color:#6b21a8;">WHOLESALE ELECTRICITY SPOT MARKET (WESM)</div>
          <span class="psa-tech-badge tech-wesm">⚡ SPOT PROCUREMENT</span>
        </div>

        <div class="psa-metrics-row" style="background:#faf5ff; border-color:#e9d5ff;">
          <div class="psa-metric">
            <span class="psa-lbl" style="color:#7c3aed;">Spot Generation Mix</span>
            <span class="psa-val" style="color:#6b21a8;">${wesmMix}% <span class="psa-sub">captive</span></span>
          </div>
          <div class="psa-metric highlight">
            <span class="psa-lbl" style="color:#7c3aed;">Latest URR Spot Rate</span>
            <span class="psa-val" style="color:#7c3aed;">₱${wesmRateVal.toFixed(4)}<span class="psa-sub">/kWh</span></span>
          </div>
          <div class="psa-metric">
            <span class="psa-lbl" style="color:#7c3aed;">URR Filing Month</span>
            <span class="psa-val" style="color:#059669; font-size:8.5px; font-weight:700;">📅 ${escapeHtml(urrMonthLabel)}</span>
          </div>
        </div>

        <div class="psa-details-grid">
          <div class="psa-detail-item">
            <span class="psa-lbl">Market Settlement</span>
            <span class="psa-val-txt"><code class="docket-code" style="color:#7c3aed; background:#f5f3ff; border-color:#ddd6fe;">🏛️ IEMOP Gross Pool Market Clearing</code></span>
          </div>
          <div class="psa-detail-item">
            <span class="psa-lbl">Annual Volume &amp; Spend</span>
            <span class="psa-val-txt">⚡ ${wesmGwh} GWh / yr (₱${wesmCostB}B)</span>
          </div>
        </div>

        <div class="psa-carveout-box" style="background:#f5f3ff; border:1px solid #ddd6fe;">
          <div class="psa-status-badge" style="color:#7c3aed; font-weight:800;">
            ⚡ Variable Spot Exposure (Hourly Net Settlement)
          </div>
          <div class="psa-carveout-text" style="color:#5b21b6;">Procured on wholesale spot market to balance captive customer load without locked Take-or-Pay penalties.</div>
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
      el.cardPsasList.innerHTML = `<div style="text-align:center; padding:15px; font-size:9.5px; color:#94a3b8;">No contracts matching this filter</div>`;
      return;
    }

    const psasCardsHtml = filtered
      .map((p) => {
        const isCarved = p.carveout_status && (p.carveout_status.includes("Carve-Out") || p.carveout_status.includes("Protected"));
        const techClean = (p.tech || "default").toLowerCase().replace(/[^a-z]/g, "");
        const techClass = "tech-" + techClean;
        const effectiveRateVal = (p.urr_rate || p.rate || 0);
        const rateDisplay = effectiveRateVal > 0 ? `₱${effectiveRateVal.toFixed(4)}/kWh` : "Pending URR";
        const monthBadge = p.urr_month ? `📅 ${escapeHtml(p.urr_month)}` : "URR Filing";
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
              <span class="psa-val" style="color:#059669; font-size:8.5px; font-weight:700;">${monthBadge}</span>
            </div>
          </div>

          <div class="psa-details-grid">
            <div class="psa-detail-item">
              <span class="psa-lbl">Verified ERC Case No.</span>
              <span class="psa-val-txt"><code class="docket-code">⚖️ ${escapeHtml(docketNum)}</code></span>
            </div>
            <div class="psa-detail-item">
              <span class="psa-lbl">Tenor &amp; Expiration</span>
              <span class="psa-val-txt">⏳ ${escapeHtml(p.tenor)}</span>
            </div>
          </div>

          <div class="psa-carveout-box ${isCarved ? "carved" : "locked"}">
            <div class="psa-status-badge">
              ${isCarved ? "🟢 " + escapeHtml(p.carveout_status) : "🔴 " + escapeHtml(p.carveout_status)}
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
      el.searchDropdown.innerHTML = `<div style="padding:8px 12px; font-size:11px; color:#94a3b8; text-align:center;">No matching DUs found</div>`;
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
      el.dirCountBadge.textContent = `${list.length} DU${list.length === 1 ? "" : "s"}`;
    }

    if (list.length === 0) {
      el.dirListContainer.innerHTML = `<div style="text-align:center; padding:30px; font-size:11px; color:#94a3b8;">No matching utilities found</div>`;
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
          metricVal = du.base_rate || "₱7.3300";
          metricSub = du.urr_month ? `${du.urr_month} URR` : "URR Captive Rate";
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
          ? `<span class="badge-tag" style="background:#f1f5f9; color:#475569;">📜 ${psaSummary.total_contracts} PSAs</span>`
          : "";
        const urrMonthBadge = du.urr_month
          ? `<span class="badge-tag" style="background:#eff6ff; color:#1d4ed8; font-weight:700;">📅 ${escapeHtml(du.urr_month)}</span>`
          : "";
        const wesmBadge = state.dirSortBy !== "wesm_rate" && du.wesm_data?.latest_rate
          ? `<span class="badge-tag wesm" style="background:#f5f3ff; color:#7c3aed; font-weight:700;">⚡ WESM ₱${du.wesm_data.latest_rate.toFixed(2)}</span>`
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
          const rate = d.base_rate || "₱7.3300";
          return `<option value="${d.id}" ${d.acronym === "MERALCO" ? "selected" : ""}>${escapeHtml(d.acronym)} — ${escapeHtml(d.province)} (${rate}/kWh)</option>`;
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

    if (mode === "crem") {
      if (el.calcModeTitle) el.calcModeTitle.textContent = "🔵 Individual Retail Open Access (CREM)";
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
      if (el.calcModeTitle) el.calcModeTitle.textContent = "🟢 Green Energy Option Program (GEOP)";
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
      if (el.calcModeTitle) el.calcModeTitle.textContent = "🟠 Retail Aggregation Program (RAP Calculator)";
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
      if (el.calcModeTitle) el.calcModeTitle.textContent = "⚡ Wholesale Spot Market (WESM Passthrough)";
      if (el.calcThresholdBadge) el.calcThresholdBadge.textContent = "Wholesale True-Up Benchmark";
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
          <option value="wap" selected>National Spot GWAP — ₱${(spotData.national_gwap || 4.4038).toFixed(4)}/kWh</option>
          ${duSpotOpt}
          <option value="${spotData.luzon_gwap || 4.3140}">₱${(spotData.luzon_gwap || 4.3140).toFixed(4)}/kWh — Luzon Grid Spot GWAP</option>
          <option value="${spotData.visayas_gwap || 4.9967}">₱${(spotData.visayas_gwap || 4.9967).toFixed(4)}/kWh — Visayas Grid Spot GWAP</option>
          <option value="${spotData.mindanao_gwap || 3.9837}">₱${(spotData.mindanao_gwap || 3.9837).toFixed(4)}/kWh — Mindanao Grid Spot GWAP (Hydro)</option>
        `;
      }
    }

    recalcSavings();
  }

  /**
   * Real-Time Multi-Program Savings & Qualification Calculation
   */
  function recalcSavings() {
    const mode = state.calcMode;
    const dus = window.RETAIL_MARKET_DATA?.dus || [];
    const du = dus.find((d) => d.id === state.calcDuId) || dus[0];

    // Extract DU Base Rate from verified URR
    let duBaseRate = 7.3300;
    if (du && du.base_rate) {
      const match = du.base_rate.match(/[\d.]+/);
      if (match) duBaseRate = parseFloat(match[0]);
    }

    // Determine Chosen Supplier Rate
    let chosenSupplierRate = MARKET_WAP[mode];
    if (el.calcSupplierSelect) {
      const val = el.calcSupplierSelect.value;
      if (val !== "wap") {
        chosenSupplierRate = parseFloat(val) || MARKET_WAP[mode];
      }
    }

    const kwh = parseFloat(state.calcKwh) || 65000;

    if (mode === "crem" || mode === "geop" || mode === "wesm") {
      const kw = parseFloat(state.calcKw) || 150;
      if (el.calcKwDisplay) el.calcKwDisplay.textContent = `${kw} kW`;

      let isEligible = kw >= 100;
      let isUpcoming = kw >= 50 && kw < 100;
      let verdictTitle = "";
      let verdictSub = "";
      let icon = "✅";
      let bannerClass = "verdict-banner";

      if (mode === "wesm") {
        icon = "⚡";
        verdictTitle = "Wholesale Spot Arbitrage (WESM)";
        const spread = duBaseRate - chosenSupplierRate;
        if (spread > 0) {
          verdictSub = `Spot clearing is ₱${spread.toFixed(4)}/kWh below ${du?.acronym} captive tariff. Subject to hourly volatility.`;
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
        icon = "⏳";
        bannerClass += " upcoming";
      } else {
        verdictTitle = "Captive Consumer (<50 kW)";
        verdictSub = "Regulated tariff · Switch to RAP tab to pool demand.";
        icon = "📦";
        bannerClass += " captive";
      }

      if (el.verdictBanner) el.verdictBanner.className = bannerClass;
      if (el.verdictIcon) el.verdictIcon.textContent = icon;
      if (el.verdictTitle) el.verdictTitle.textContent = verdictTitle;
      if (el.verdictSub) el.verdictSub.textContent = verdictSub;

      // Savings
      const rateDiff = duBaseRate - chosenSupplierRate;
      const monthlySavings = kwh * rateDiff;
      const annualSavings = monthlySavings * 12;

      if (el.calcMonthlySavings) {
        el.calcMonthlySavings.textContent = `${monthlySavings >= 0 ? "₱" : "-₱"}${Math.abs(Math.round(monthlySavings)).toLocaleString()}`;
      }
      if (el.calcMonthlySub) {
        el.calcMonthlySub.textContent = `vs. ${du?.acronym} base rate (₱${duBaseRate.toFixed(4)})`;
      }
      if (el.calcAnnualSavings) {
        el.calcAnnualSavings.textContent = `${annualSavings >= 0 ? "₱" : "-₱"}${Math.abs(Math.round(annualSavings)).toLocaleString()}`;
      }
      if (el.calcAnnualSub) {
        const pctDiff = Math.round((Math.abs(rateDiff) / duBaseRate) * 100);
        el.calcAnnualSub.textContent = `at ₱${chosenSupplierRate.toFixed(4)}/kWh (${pctDiff}% ${rateDiff >= 0 ? "savings" : "premium"})`;
      }

      // Extra Card for GEOP or WESM
      if (mode === "geop" && el.calcExtraMetricCard) {
        const annualMWh = (kwh * 12) / 1000;
        const co2AvoidedTons = (annualMWh * GRID_EMISSION_FACTOR).toFixed(1);
        const treesEquivalent = Math.round(co2AvoidedTons * 16.5);
        el.calcExtraMetricCard.style.display = "block";
        el.calcExtraMetricCard.className = "extra-metric-card";
        el.calcExtraMetricCard.style.background = "#f0fdf4";
        el.calcExtraMetricCard.style.borderColor = "#bbf7d0";
        el.calcExtraMetricCard.style.color = "#065f46";
        el.calcExtraMetricCard.innerHTML = `
          <div style="font-weight:800; font-size:10px; color:#065f46; margin-bottom:4px;">🌱 100% Renewable Impact:</div>
          <div style="font-size:9.5px; display:flex; gap:8px; flex-wrap:wrap;">
            <span>🛡️ <strong>${co2AvoidedTons} t CO₂</strong>/yr avoided</span>
            <span>🌳 <strong>${treesEquivalent.toLocaleString()}</strong> trees planted</span>
          </div>
        `;
      } else if (mode === "wesm" && el.calcExtraMetricCard) {
        const spotMix = du?.wesm_data?.genmix_pct || 15;
        const resMargin = (MARKET_WAP.crem - chosenSupplierRate).toFixed(4);
        el.calcExtraMetricCard.style.display = "block";
        el.calcExtraMetricCard.className = "extra-metric-card";
        el.calcExtraMetricCard.style.background = "#faf5ff";
        el.calcExtraMetricCard.style.borderColor = "#ddd6fe";
        el.calcExtraMetricCard.style.color = "#5b21b6";
        el.calcExtraMetricCard.innerHTML = `
          <div style="font-weight:800; font-size:10px; color:#5b21b6; margin-bottom:4px;">⚡ Wholesale Generation Mix:</div>
          <div style="font-size:9.5px; display:flex; gap:8px; flex-wrap:wrap;">
            <span>📊 <strong>${spotMix}%</strong> DU spot mix</span>
            <span>🛡️ <strong>+₱${resMargin}/kWh</strong> retail hedge</span>
          </div>
        `;
      } else if (el.calcExtraMetricCard) {
        el.calcExtraMetricCard.style.display = "none";
      }

      // Next Steps
      if (el.calcStepsBox) {
        if (mode === "wesm") {
          el.calcStepsBox.innerHTML = `
            <div style="font-weight:700; margin-bottom:3px; color:#5b21b6; font-size:10px;">⚡ WESM Spot Access:</div>
            <div style="font-size:9.5px; color:#475569; line-height:1.35;">
              • Requires IEMOP registration &amp; collateral deposit.<br>
              • Or engage a licensed RES with spot pass-through tariff.
            </div>
          `;
        } else if (isEligible) {
          el.calcStepsBox.innerHTML = `
            <div style="font-weight:700; margin-bottom:3px; color:#0f172a; font-size:10px;">📋 Next Steps to Switch:</div>
            <div style="font-size:9.5px; color:#475569; line-height:1.35;">
              1. Secure <strong>Certificate of Contestability (CC)</strong> from ${escapeHtml(du?.acronym || "DU")}.<br>
              2. Sign Retail Supply Contract (RSC) at target rate.<br>
              3. Verify AMI smart meter installation.
            </div>
          `;
        } else {
          el.calcStepsBox.innerHTML = `
            <div style="font-weight:700; margin-bottom:3px; color:#92400e; font-size:10px;">💡 Tip for Sub-100 kW Consumers:</div>
            <div style="font-size:9.5px; color:#78350f; line-height:1.35;">
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
          el.calcRapPoolStatus.innerHTML = `✅ Surpasses 100 kW Threshold`;
          el.calcRapPoolStatus.style.color = "#059669";
        } else {
          const needed = (100 - totalPooledKw).toFixed(0);
          el.calcRapPoolStatus.innerHTML = `⏳ Need +${needed} kW to qualify`;
          el.calcRapPoolStatus.style.color = "#d97706";
        }
      }

      // Verdict
      let icon = isPoolQualified ? "✅" : "⏳";
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

      // Group Pooled Savings
      const rateDiff = Math.max(0.15, duBaseRate - chosenSupplierRate);
      const totalMonthlySavings = kwh * rateDiff;
      const totalAnnualSavings = totalMonthlySavings * 12;
      const memberAnnualSavings = totalAnnualSavings / members;

      if (el.calcMonthlySavings) el.calcMonthlySavings.textContent = `₱${Math.round(totalMonthlySavings).toLocaleString()}`;
      if (el.calcMonthlySub) el.calcMonthlySub.textContent = `Total group savings vs. DU tariff`;
      if (el.calcAnnualSavings) el.calcAnnualSavings.textContent = `₱${Math.round(totalAnnualSavings).toLocaleString()}`;
      if (el.calcAnnualSub) el.calcAnnualSub.textContent = `Pooled group savings per year`;

      if (el.calcExtraMetricCard) {
        el.calcExtraMetricCard.style.display = "block";
        el.calcExtraMetricCard.className = "extra-metric-card";
        el.calcExtraMetricCard.style.background = "#fffbeb";
        el.calcExtraMetricCard.style.borderColor = "#fde68a";
        el.calcExtraMetricCard.style.color = "#92400e";
        el.calcExtraMetricCard.innerHTML = `
          <div style="font-weight:800; margin-bottom:2px;">👥 Per-Member Breakdown:</div>
          <div>Each of the <strong>${members} members</strong> saves an average of <strong>₱${Math.round(memberAnnualSavings).toLocaleString()} / year</strong> (₱${Math.round(memberAnnualSavings / 12).toLocaleString()} / month) by joining the aggregation pool!</div>
        `;
      }

      if (el.calcStepsBox) {
        el.calcStepsBox.innerHTML = `
          <div style="font-weight:700; margin-bottom:3px; color:#0f172a;">📦 Retail Aggregation Program (RAP) Rules:</div>
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

    // Update Market Banner
    if (el.suppMarketBanner) {
      if (type === "res") {
        el.suppMarketBanner.innerHTML = `
          <div class="supp-market-stats-row">
            <div class="supp-market-stat">
              <span class="sstat-lbl">Active Retail Suppliers</span>
              <span class="sstat-val">39 RES + 2 LRES (41)</span>
            </div>
            <div class="supp-market-stat">
              <span class="sstat-lbl">Contracted Demand</span>
              <span class="sstat-val">5,080.70 MW</span>
            </div>
            <div class="supp-market-stat highlight">
              <span class="sstat-lbl">Market WAP (Q2 2026)</span>
              <span class="sstat-val">₱5.8300/kWh</span>
            </div>
          </div>
          <div style="font-size:8px; color:#64748b; margin-top:3px;">
            Aboitiz (25.8%) · Meralco (25.0%) · San Miguel (14.2%) · First Gen (8.9%) · Ayala (8.1%)
          </div>
        `;
      } else if (type === "geop") {
        el.suppMarketBanner.innerHTML = `
          <div class="supp-market-stats-row">
            <div class="supp-market-stat">
              <span class="sstat-lbl">Active RE Suppliers</span>
              <span class="sstat-val">15 RE Suppliers</span>
            </div>
            <div class="supp-market-stat">
              <span class="sstat-lbl">GEOP Demand</span>
              <span class="sstat-val">303.52 MW (985 EUs)</span>
            </div>
            <div class="supp-market-stat highlight">
              <span class="sstat-lbl">GEOP WAP (Q2 2026)</span>
              <span class="sstat-val" style="color:#059669;">₱6.1200/kWh</span>
            </div>
          </div>
          <div style="font-size:8px; color:#047857; margin-top:3px;">
            100% Zero-Carbon Renewable Energy (Geothermal, Solar PV, Run-of-River Hydro) · ACEN Market Leader (51.3%)
          </div>
        `;
      } else if (type === "rap") {
        el.suppMarketBanner.innerHTML = `
          <div class="supp-market-stats-row">
            <div class="supp-market-stat">
              <span class="sstat-lbl">Retail Aggregators</span>
              <span class="sstat-val">20 Aggregators</span>
            </div>
            <div class="supp-market-stat">
              <span class="sstat-lbl">Aggregated Members</span>
              <span class="sstat-val">4,997 (311 Groups)</span>
            </div>
            <div class="supp-market-stat highlight">
              <span class="sstat-lbl">RAP WAP (Q2 2026)</span>
              <span class="sstat-val" style="color:#d97706;">₱5.8400/kWh</span>
            </div>
          </div>
          <div style="font-size:8px; color:#b45309; margin-top:3px;">
            Small end-users (&lt;100 kW) pooled into ≥100 kW within single franchise · MPower (47.8 MW) &amp; ACEN (1,488 Mems) Leaders
          </div>
        `;
      }
    }

    // Render Group Filter Chips
    if (el.suppGroupChipsRow) {
      if (type === "res") {
        const groups = [
          { id: "all", label: "All Groups (41)" },
          { id: "Aboitiz", label: "Aboitiz (5)" },
          { id: "MERALCO", label: "Meralco (5)" },
          { id: "San Miguel", label: "San Miguel (3)" },
          { id: "First Gen", label: "First Gen (3)" },
          { id: "Ayala", label: "Ayala (2)" },
          { id: "Citicore", label: "Citicore (2)" },
          { id: "Independent", label: "Independent (17)" },
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
      el.suppListContainer.innerHTML = `<div style="text-align:center; padding:35px 10px; font-size:11px; color:#94a3b8;">No matching suppliers found</div>`;
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
                ${item.capacity_mw ? `<span class="supp-tag" style="background:#f8fafc; color:#64748b;">Allocation: ${item.capacity_mw.toFixed(1)} MW</span>` : ""}
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
              <button class="supp-simulate-btn" data-srate="${item.rate || 5.83}" data-stype="${type}" data-sname="${escapeHtml(shortname)}">⚡ Simulate in Calculator</button>
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
        document.querySelectorAll(".calc-mode-pill").forEach((p) => {
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
          <ul style="padding-left:14px; margin:4px 0 0; font-size:9.5px; color:#475569; line-height:1.4;">
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

    const rate1 = du1.base_rate || "₱7.3300";
    const rate2 = du2.base_rate || "₱5.7052";

    el.compareResultCard.innerHTML = `
      <table class="compare-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th style="color:#2563eb;">${escapeHtml(du1.acronym)}</th>
            <th style="color:#059669;">${escapeHtml(du2.acronym)}</th>
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
            <td><strong>${rate1}/kWh</strong><br><span style="font-size:8px; color:#059669; font-weight:700;">📅 ${escapeHtml(du1.urr_month || "URR Filing")}</span></td>
            <td><strong>${rate2}/kWh</strong><br><span style="font-size:8px; color:#059669; font-weight:700;">📅 ${escapeHtml(du2.urr_month || "URR Filing")}</span></td>
          </tr>
          <tr>
            <td>Latest URR WESM Spot Rate</td>
            <td><strong style="color:#7c3aed;">₱${(du1.wesm_data?.latest_rate || 5.4513).toFixed(4)}/kWh</strong><br><span style="font-size:8px; color:#7c3aed; font-weight:700;">⚡ ${du1.wesm_data?.genmix_pct || 15}% Spot Mix</span></td>
            <td><strong style="color:#7c3aed;">₱${(du2.wesm_data?.latest_rate || 5.4513).toFixed(4)}/kWh</strong><br><span style="font-size:8px; color:#7c3aed; font-weight:700;">⚡ ${du2.wesm_data?.genmix_pct || 15}% Spot Mix</span></td>
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
            <td><strong style="color:#059669;">🟢 ${du1.psa_summary?.carved_out_mw || 0} MW</strong> (${du1.psa_summary?.carveout_share_pct || 0}%)</td>
            <td><strong style="color:#059669;">🟢 ${du2.psa_summary?.carved_out_mw || 0} MW</strong> (${du2.psa_summary?.carveout_share_pct || 0}%)</td>
          </tr>
          <tr>
            <td>Locked Take-or-Pay MW</td>
            <td><strong style="color:#dc2626;">🔴 ${du1.psa_summary?.locked_mw || 0} MW</strong> (${(100 - (du1.psa_summary?.carveout_share_pct || 0)).toFixed(1)}%)</td>
            <td><strong style="color:#dc2626;">🔴 ${du2.psa_summary?.locked_mw || 0} MW</strong> (${(100 - (du2.psa_summary?.carveout_share_pct || 0)).toFixed(1)}%)</td>
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

    if (state.pricesMode === "matrix") {
      el.pricesContainer.innerHTML = `
        <div class="price-banner-box">
          <div class="price-banner-title">
            <span>Philippine Multi-Market Price Structure</span>
            <span style="font-size:9.5px; background:rgba(255,255,255,0.2); padding:2px 6px; border-radius:12px;">Q2 2026 Benchmark</span>
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
              <div class="market-rate-hero" style="color:#7c3aed;">
                ₱${(spot.national_gwap || 4.4038).toFixed(4)}
                <span class="rate-unit">/kWh</span>
              </div>
            </div>
            <div class="market-stats-row">
              <div class="market-stat-col">
                <div class="market-stat-label">Total Volume</div>
                <div class="market-stat-val">${(spot.volume_gwh || 17360.8).toLocaleString()} GWh</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Market Spend</div>
                <div class="market-stat-val">₱${spot.annual_spend_billion || 76.32}B</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Operator</div>
                <div class="market-stat-val">${escapeHtml(spot.operator || "IEMOP / PEMC")}</div>
              </div>
            </div>
            <div class="market-spread-box">
              <span>Regional GWAP: Luzon ₱4.3140 · Visayas ₱4.9967 · Mindanao ₱3.9837</span>
            </div>
            <div class="market-citation">Source: 2025–2026 WESM Final True-Up Filings</div>
          </div>

          <!-- CREM Retail Open Access -->
          <div class="market-price-card">
            <div class="market-price-header">
              <div class="market-name-wrap">
                <span class="market-badge-pill crem">Retail</span>
                <span class="market-title-text">Competitive Retail (CREM WAP)</span>
              </div>
              <div class="market-rate-hero" style="color:#2563eb;">
                ₱${(retail.crem_wap || 5.8300).toFixed(4)}
                <span class="rate-unit">/kWh</span>
              </div>
            </div>
            <div class="market-stats-row">
              <div class="market-stat-col">
                <div class="market-stat-label">Total Demand</div>
                <div class="market-stat-val">${(retail.crem_demand_mw || 5080.7).toFixed(1)} MW</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Active EUs</div>
                <div class="market-stat-val">${(retail.crem_eus || 2692).toLocaleString()}</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Suppliers</div>
                <div class="market-stat-val">${retail.crem_suppliers || 41} RES</div>
              </div>
            </div>
            <div class="market-spread-box savings">
              <span>Savings vs Captive: -14.8% (-₱1.0150/kWh)</span>
              <span>RES Margin: +₱1.4262/kWh</span>
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
              <div class="market-rate-hero" style="color:#059669;">
                ₱${(retail.geop_wap || 6.1200).toFixed(4)}
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
              <span>Savings vs Captive: -10.6% (-₱0.7250/kWh)</span>
              <span>Green Premium: +₱0.29/kWh</span>
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
              <div class="market-rate-hero" style="color:#b45309;">
                ₱${(retail.rap_wap || 5.8400).toFixed(4)}
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
              <span>Savings vs Captive: -14.7% (-₱1.0050/kWh)</span>
              <span>CREM Parity: +₱0.0100/kWh</span>
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
              <div class="market-rate-hero" style="color:#475569;">
                ₱${(captive.national_captive_wap || 6.8450).toFixed(4)}
                <span class="rate-unit">/kWh</span>
              </div>
            </div>
            <div class="market-stats-row">
              <div class="market-stat-col">
                <div class="market-stat-label">Luzon Base</div>
                <div class="market-stat-val">₱${(captive.luzon_captive_wap || 6.9820).toFixed(4)}</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Visayas Base</div>
                <div class="market-stat-val">₱${(captive.visayas_captive_wap || 6.4210).toFixed(4)}</div>
              </div>
              <div class="market-stat-col">
                <div class="market-stat-label">Mindanao Base</div>
                <div class="market-stat-val">₱${(captive.mindanao_captive_wap || 6.1540).toFixed(4)}</div>
              </div>
            </div>
            <div class="market-spread-box">
              <span>Regulated monopoly generation charge filed monthly under ERC URR rules.</span>
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
              <span style="font-size:12px; font-weight:800; color:#0f172a;">⚡ Regional Spot Clearing (GWAP)</span>
              <span style="font-size:9px; font-weight:700; color:#7c3aed; background:#ede9fe; padding:2px 8px; border-radius:10px;">National: ₱4.4038</span>
            </div>
            <div class="spot-regions-row">
              <div class="spot-region-box">
                <div class="spot-region-name">Luzon</div>
                <div class="spot-region-rate">₱4.3140</div>
                <div class="spot-region-sub">12,512.8 GWh</div>
              </div>
              <div class="spot-region-box">
                <div class="spot-region-name">Visayas</div>
                <div class="spot-region-rate" style="color:#d97706;">₱4.9967</div>
                <div class="spot-region-sub">2,992.9 GWh (High)</div>
              </div>
              <div class="spot-region-box cheapest">
                <div class="spot-region-name">Mindanao</div>
                <div class="spot-region-rate">₱3.9837</div>
                <div class="spot-region-sub">1,855.1 GWh (Lowest)</div>
              </div>
            </div>
          </div>

          <div class="spot-gwap-card">
            <div style="font-size:11px; font-weight:800; color:#0f172a; margin-bottom:4px;">
              🏆 DU Spot Market Exposure Leaderboard
            </div>
            <div style="font-size:8.5px; color:#64748b; margin-bottom:6px;">
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
                    <td><b>${escapeHtml(d.acronym)}</b> <span style="color:#64748b; font-size:8px;">(${escapeHtml(d.grid)})</span></td>
                    <td style="color:#7c3aed;">₱${d.wesm_data.latest_rate.toFixed(4)}</td>
                    <td>₱${d.wesm_data.avg_rate.toFixed(4)}</td>
                    <td><span style="background:#eff6ff; color:#1d4ed8; padding:1px 4px; border-radius:4px;">${d.wesm_data.genmix_pct}%</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (state.pricesMode === "arbitrage") {
      const curDu = dus.find((d) => d.id === state.arbitrageDuId) || dus[0];
      let duBase = 7.3300;
      if (curDu && curDu.base_rate) {
        const m = curDu.base_rate.match(/[\d.]+/);
        if (m) duBase = parseFloat(m[0]);
      }

      const cremRate = 5.8300;
      const geopRate = 6.1200;
      const duSpotRate = curDu.wesm_data?.latest_rate || (curDu.grid === "Visayas" ? 4.9967 : curDu.grid === "Mindanao" ? 3.9837 : 4.3140);

      const cremDelta = duBase - cremRate;
      const cremDeltaPct = ((cremDelta / duBase) * 100).toFixed(1);
      const geopDelta = duBase - geopRate;
      const geopDeltaPct = ((geopDelta / duBase) * 100).toFixed(1);
      const spotDelta = duBase - duSpotRate;
      const spotDeltaPct = ((spotDelta / duBase) * 100).toFixed(1);

      el.pricesContainer.innerHTML = `
        <div class="arbitrage-card">
          <label style="font-size:9.5px; font-weight:800; color:#475569; display:block; margin-bottom:4px;">
            Select Distribution Utility for Arbitrage Analysis:
          </label>
          <select id="modalArbitrageSelect" class="calc-select" style="margin-bottom:10px;">
            ${dus.map((d) => `<option value="${d.id}" ${d.id === curDu.id ? "selected" : ""}>${escapeHtml(d.acronym)} — ${escapeHtml(d.province)} (${d.base_rate || "₱7.3300"}/kWh)</option>`).join("")}
          </select>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="font-size:13px; font-weight:900; color:#0f172a;">${escapeHtml(curDu.acronym)}</span>
                <span style="font-size:9.5px; color:#64748b; margin-left:4px;">${escapeHtml(curDu.province)}</span>
              </div>
              <span style="font-size:12px; font-weight:900; color:#b91c1c; background:#fee2e2; padding:2px 8px; border-radius:12px;">
                Captive: ₱${duBase.toFixed(4)}/kWh
              </span>
            </div>
            <div style="font-size:8.5px; color:#64748b; margin-top:3px;">
              Filing: ${curDu.urr_month || "Latest URR"} · Spot Gen Mix: ${curDu.wesm_data?.genmix_pct || 15}%
            </div>
          </div>

          <div style="font-size:10px; font-weight:800; color:#0f172a; margin-top:10px; margin-bottom:4px;">
            📈 Net Spread vs Captive Base Tariff:
          </div>
          <div class="arbitrage-delta-grid">
            <div class="arbitrage-delta-box ${cremDelta >= 0 ? "positive" : "negative"}">
              <div class="arbitrage-delta-label">🔵 CREM Net</div>
              <div class="arbitrage-delta-val">${cremDelta >= 0 ? `+₱${cremDelta.toFixed(4)}` : `-₱${Math.abs(cremDelta).toFixed(4)}`}</div>
              <div class="arbitrage-delta-sub">${cremDelta >= 0 ? `-${cremDeltaPct}% savings` : `+${Math.abs(cremDeltaPct)}% premium`}</div>
            </div>
            <div class="arbitrage-delta-box ${geopDelta >= 0 ? "positive" : "negative"}">
              <div class="arbitrage-delta-label">🟢 GEOP Net</div>
              <div class="arbitrage-delta-val">${geopDelta >= 0 ? `+₱${geopDelta.toFixed(4)}` : `-₱${Math.abs(geopDelta).toFixed(4)}`}</div>
              <div class="arbitrage-delta-sub">${geopDelta >= 0 ? `-${geopDeltaPct}% green` : `+${Math.abs(geopDeltaPct)}% premium`}</div>
            </div>
            <div class="arbitrage-delta-box ${spotDelta >= 0 ? "positive" : "negative"}" style="background:${spotDelta >= 0 ? "#faf5ff" : "#fef2f2"}; border-color:${spotDelta >= 0 ? "#e9d5ff" : "#fecaca"};">
              <div class="arbitrage-delta-label" style="color:${spotDelta >= 0 ? "#7c3aed" : "#dc2626"};">⚡ Spot Delta</div>
              <div class="arbitrage-delta-val" style="color:${spotDelta >= 0 ? "#7c3aed" : "#dc2626"};">${spotDelta >= 0 ? `+₱${spotDelta.toFixed(4)}` : `-₱${Math.abs(spotDelta).toFixed(4)}`}</div>
              <div class="arbitrage-delta-sub">${spotDelta >= 0 ? `-${spotDeltaPct}% spread` : `+${Math.abs(spotDeltaPct)}% premium`}</div>
            </div>
          </div>

          <div style="margin-top:10px; padding:7px 10px; background:${cremDelta >= 0 ? "#eff6ff" : "#f8fafc"}; border-radius:8px; border:1px solid ${cremDelta >= 0 ? "#bfdbfe" : "#e2e8f0"}; font-size:9.5px; color:${cremDelta >= 0 ? "#1e40af" : "#475569"}; line-height:1.35;">
            💡 <b>Arbitrage Summary:</b> ${cremDelta >= 0 
              ? `Switching from <b>${escapeHtml(curDu.acronym)}</b> to CREM saves <b>₱${cremDelta.toFixed(4)}/kWh</b> (${cremDeltaPct}%) · Est. <b>₱${Math.round(45000 * cremDelta).toLocaleString()}/mo</b> savings (100 kW load).`
              : `<b>${escapeHtml(curDu.acronym)}</b>'s captive base tariff is competitive (₱${Math.abs(cremDelta).toFixed(4)}/kWh below national CREM WAP). Retail choice available if specialized green or bilateral hedge required.`}
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
        <div style="text-align:center; padding:35px 10px; color:#94a3b8;">
          <div style="font-size:22px; margin-bottom:4px;">🔍</div>
          <div style="font-size:12px; font-weight:700; color:#0f172a;">No matching questions found</div>
          <div style="font-size:10px; color:#64748b; margin-top:4px;">Try searching for "threshold", "switching", "rap", or a question ID like "Q142"</div>
        </div>
      `;
      return;
    }

    const headerNote = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:9.5px; font-weight:700; color:#64748b; margin-bottom:8px; padding:2px 4px;">
        <span>Showing all ${filtered.length} questions${tokens.length > 0 ? " matching query" : " (Q1 to Q501)"}</span>
        <span style="color:#2563eb; font-size:8.5px; font-weight:700;">Tap tile to read</span>
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
          showToast("✓ Copied answer to clipboard");
        } else {
          showToast("✓ Answer copied");
        }
      });
    });
  }

  /**
   * Helper: Escape HTML & Highlight Tokens
   */
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
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
    document.querySelectorAll(".calc-mode-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".calc-mode-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.calcMode = pill.getAttribute("data-mode");
        updateCalculatorModeUI();
      });
    });

    // Calculator Inputs
    el.calcKwInput?.addEventListener("input", (e) => {
      state.calcKw = parseFloat(e.target.value) || 150;
      document.querySelectorAll(".preset-chip").forEach((c) => c.classList.remove("active"));
      recalcSavings();
    });

    document.querySelectorAll(".preset-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".preset-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        const kw = parseFloat(chip.getAttribute("data-kw")) || 150;
        state.calcKw = kw;
        if (el.calcKwInput) el.calcKwInput.value = kw;
        recalcSavings();
      });
    });

    el.calcRapMembersInput?.addEventListener("input", (e) => {
      state.calcRapMembers = parseInt(e.target.value, 10) || 10;
      recalcSavings();
    });

    el.calcRapKwPerMember?.addEventListener("input", (e) => {
      state.calcRapKwPerMember = parseFloat(e.target.value) || 15;
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
      state.calcKwh = parseFloat(e.target.value) || 65000;
      recalcSavings();
    });

    // Copy Calculator Report
    el.copyCalcReportBtn?.addEventListener("click", () => {
      const mode = state.calcMode.toUpperCase();
      const monthly = el.calcMonthlySavings?.textContent || "₱0";
      const annual = el.calcAnnualSavings?.textContent || "₱0";
      const verdict = el.verdictTitle?.textContent || "";
      const text = `RetailMarket PH Analysis (${mode}):\nVerdict: ${verdict}\nEst. Monthly Savings: ${monthly}\nProjected Annual Savings: ${annual}\nBenchmark WAP vs DU URR Captive Rate`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        showToast("✓ Executive report copied to clipboard");
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

    collapseCard();
  }

  // DOM Ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
