# RetailMarket PH — Apple Minimalist Mobile Application
**Strictly On-Grid (WESM Interconnected) · Zero API Errors · 60fps Native Feel**

A comprehensive, Apple/Android-grade mobile application mapping every on-grid Distribution Utility (DU / EC / Private DU) in the Philippines along with their Retail Contestable Customers (CREM), Green Energy Option Program (GEOP) customers, Retail Aggregation Program (RAP) groups, and Captive Eligible Pipeline.

Built with an authentic smartphone viewport (**395px × 844px iPhone standard** on desktop, 100% responsive edge-to-edge on mobile phones), native bottom navigation bar, interactive Leaflet map using ESRI Light Gray Base & Reference (**100% free, zero API keys, guaranteed zero 403 blocks**), and real-time customer choice tools.

---

## 1. Core Architectural Pillars

### 📱 1. Apple-Style Native Bottom Navigation (4 Core Views)
- **🗺️ Map View**:
  - Fullscreen interactive map with ESRI Light Gray Base & Reference.
  - Luminous 12px dot pins (🔵 Blue for CREM, 🟢 Green for GEOP, 🟠 Amber halo for RAP).
  - Selected DU active pulsing halo and clean callout tooltip.
  - Dynamic Island Ticker Ribbon updating aggregate metrics live on filter change.
  - 3-Snap Bottom Sheet (`#bottomCard`) with sub-tabs:
    - **Overview**: Base rate vs. Market WAP (₱5.83/kWh), switching penetration, and interconnection status.
    - **RES Suppliers**: Licensed retail suppliers active in this franchise.
    - **Migration Waves**: Breakdown across Phases I–IV and Phase V (50–99 kW) pipeline.
- **📊 Directory & Leaderboard (107 On-Grid Utilities)**:
  - Instant live filter search by name, province, or acronym.
  - Dynamic sort chips: `CREM MW`, `GEOP EUs`, `RAP Grps`, `Switching %`.
  - Tap any DU card to automatically fly to that DU on the map and open its profile sheet.
- **⚡ RCOA & GEOP Customer Choice & Savings Calculator**:
  - Interactive Peak Demand slider (10 kW to 1,500 kW) with preset quick-chips (`45 kW`, `80 kW`, `150 kW`, `600 kW`, `1,000 kW`).
  - Distribution Utility selector with authentic captive base rates across all 107 utilities.
  - Monthly energy consumption input (kWh/month).
  - Real-time statutory eligibility verdict (Phase I, II, III, IV, Phase V Upcoming Pipeline, or RAP Aggregation).
  - Live projected monthly and annual savings calculation vs. market WAP (₱5.83/kWh).
  - Step-by-step guidance on obtaining the Certificate of Contestability (CC) and AMI smart meter installation.
- **💡 501 Guide Questions & FAQ (AI Search)**:
  - Full searchable knowledge base derived from ERC Res. 13 (2024) & Res. 22 (2025).
  - Category chips: `All (501)`, `⚡ Threshold`, `🔄 Switching`, `📦 RAP`, `🌱 GEOP`, `🛡️ SOLR`, `🏢 Condos`, `📊 Metering`.
  - Token-matched search scoring with highlighted keyword snippets.
  - 1-tap "Copy Answer" button with haptic toast notification.

---

## 2. Statutory & Regulatory Fidelity

1. **Strictly On-Grid Mandate**:
   - RCOA, GEOP, and RAP operate exclusively within interconnected WESM networks (Luzon, Visayas, Mindanao).
   - Off-grid island utilities (e.g. PALECO, ORMECO, OMECO, FICELCO) are explicitly classified as exempt missionary SPUG areas under EPIRA Section 34.
2. **Official RCOA 2024–2035 Roadmap**:
   - Integrated timeline modal covering Phases I through VII (from 1 MW bulk industrial down to <10 kW residential choice).
3. **Zero API Key & Zero 403 Forbidden Errors**:
   - Eliminates both CartoCDN API token enforcement and OpenStreetMap volunteer tile server 403 forbidden blocks by using ESRI Canvas tiles (`server.arcgisonline.com`).

---

## 3. File Structure
- `index.html` — Single-page multi-view mobile application shell.
- `style.css` — Apple-inspired CSS with glassmorphism, responsive device frame, and fluid animations.
- `app.js` — Core application logic, Leaflet controller, calculator engine, and FAQ fuzzy search.
- `data.js` & `data.json` — 107 on-grid utility dataset and national market aggregates.
- `faq_data.js` & `faq_data.json` — 501 guide questions, section titles, and tags.
- `vendor/leaflet.js` & `vendor/leaflet.css` — Bundled Leaflet library.
