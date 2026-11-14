# Retail Market PH: data and policy checklist

Generated 14 Nov 2026 from `data.js`. Things to verify against the MOS memo (MOS202600124319) and the URR filings. The app runs these same checks itself (tap the ⚡ button), and each one disappears once the data is fixed.

## 1. Totals that disagree

| Figure | Sum of utilities | Summary block | Gap |
|---|---|---|---|
| CREM MW | 5,137.76 | 5,080.7 | +57.06 |
| GEOP end-users | 984 | 985 | -1 |
| GEOP MW | 303.39 | 303.52 | -0.13 |
| Captive eligible end-users, Phases I–IV | 463 | 12,520 | -12,057 |

By grid, CREM MW (utilities vs summary): Luzon 4,245.18 vs 4,178.18; Visayas 609.06 vs 552.34; Mindanao 283.52 vs 350.19.

## 2. Utility count

- The app has 107 entries: 104 distribution utilities plus 3 NGCP entries (NGCP-Luz, NGCP-Vis, NGCP-Min). It now says “104 DUs + 3 NGCP”.
- The RCOA roadmap Annex uses 121 on-grid DUs. Decide whether the app should list all 121 or explain why 17 are left out.

## 3. Captive rates older than 6 months (81 of 107)

Compared against August 2026 retail prices, so savings for these utilities may be off. Oldest first:

FBPC (Annualized URR Benchmark), CLARK ELEC (Annualized URR Benchmark), OEDC (Jan 2025, 19 mo), BENECO (Mar 2025, 17 mo), ISECO (Mar 2025, 17 mo), SAJELCO (Mar 2025, 17 mo), ZAMECO II (Mar 2025, 17 mo), ZAMECO I (Mar 2025, 17 mo), MORESCO I (Apr 2025, 16 mo), NOCECO (Apr 2025, 16 mo), COTELCO (Apr 2025, 16 mo), CASURECO II (May 2025, 15 mo), ZAMSURECO I (May 2025, 15 mo), ANTECO (Jun 2025, 14 mo), SEZ (Jul 2025, 13 mo), TEI (Jul 2025, 13 mo), PANELCO III (Jul 2025, 13 mo), TARELCO I (Jul 2025, 13 mo), LEYECO II (Jul 2025, 13 mo), ILPI (Jul 2025, 13 mo), NONECO (Jul 2025, 13 mo), PELCO III (Jul 2025, 13 mo), ISELCO II (Jul 2025, 13 mo), MOELCI II (Jul 2025, 13 mo), CLPC (Jul 2025, 13 mo), ZAMCELCO (Jul 2025, 13 mo), BATELEC II (Aug 2025, 12 mo), SFELAPCO (Aug 2025, 12 mo), DECORP (Aug 2025, 12 mo), DLPC (Aug 2025, 12 mo), NORDECO (Aug 2025, 12 mo), PRESCO (Aug 2025, 12 mo), NORSAMELCO (Aug 2025, 12 mo), SURSECO I (Aug 2025, 12 mo), MERALCO (Sep 2025, 11 mo), TARELCO II (Sep 2025, 11 mo), ALECO (Sep 2025, 11 mo), SAMELCO I (Sep 2025, 11 mo), ILECO III (Sep 2025, 11 mo), LUECO (Sep 2025, 11 mo), INEC (Sep 2025, 11 mo), QUEZELCO I (Sep 2025, 11 mo), CEBECO I (Oct 2025, 10 mo), MECO (Oct 2025, 10 mo), CEBECO II (Oct 2025, 10 mo), BOHECO I (Oct 2025, 10 mo), NORECO II (Oct 2025, 10 mo), FIBECO (Oct 2025, 10 mo), MORESCO II (Oct 2025, 10 mo), LUELCO (Oct 2025, 10 mo), BOHECO II (Oct 2025, 10 mo), BLCI (Oct 2025, 10 mo), FLECO (Oct 2025, 10 mo), NEECO I (Oct 2025, 10 mo), ILECO I (Nov 2025, 9 mo), NEECO II-A2 (Nov 2025, 9 mo), DORELCO (Nov 2025, 9 mo), SOCOTECO I (Nov 2025, 9 mo), CEDC (Dec 2025, 8 mo), MORE Power (Dec 2025, 8 mo), NEPC (Dec 2025, 8 mo), PENELCO (Dec 2025, 8 mo), BATELEC I (Dec 2025, 8 mo), PELCO II (Dec 2025, 8 mo), CAPELCO (Dec 2025, 8 mo), LEYECO V (Dec 2025, 8 mo), CEBECO III (Dec 2025, 8 mo), ISELCO I (Dec 2025, 8 mo), PELCO I (Dec 2025, 8 mo), AKELCO (Dec 2025, 8 mo), BUSECO (Dec 2025, 8 mo), SURNECO (Dec 2025, 8 mo), ASELCO (Dec 2025, 8 mo), ZANECO (Dec 2025, 8 mo), CENPELCO (Dec 2025, 8 mo), NEECO II-A1 (Dec 2025, 8 mo), SORECO II (Dec 2025, 8 mo), LANECO (Dec 2025, 8 mo), CAGELCO II (Dec 2025, 8 mo), AURELCO (Dec 2025, 8 mo), SAMELCO II (Dec 2025, 8 mo)

## 4. Rates that look too low

- Captive generation rate below ₱4.00/kWh: CASURECO II ₱2.9283, BATELEC II ₱3.5309, CEDC ₱3.7991, CLPC ₱3.8846, ZAMECO I ₱3.9871. Check that these are the full generation charge.
- WESM purchase rate below ₱2.50/kWh: SFELAPCO ₱1.26, PANELCO III ₱1.17, MORESCO II ₱2.27, ASELCO ₱1.04, LANECO ₱1.21.

## 5. PSA records (367 PSAs)

- **22 with “Verification Required” instead of an ERC case number:**
  - MERALCO: SOUTH PREMIERE POWER CORP. (SPPC)
  - MERALCO: EXCELLENT ENERGY RESOURCES INC. (EERI)
  - MERALCO: FGP CORPORATION - SANTA RITA (FGPC)
  - MERALCO: SAN BUENAVENTURA POWER LTD. CO. (SBPL)
  - MERALCO: FGP CORPORATION - SAN LORENZO (FGP)
  - MERALCO: QUEZON POWER (PHILIPPINES), LTD. (QPPL)
  - MERALCO: LIMAY POWER INC. (LPI)
  - MERALCO: MARIVELES POWER GENERATION CORPORATION (MPGC)
  - MERALCO: SUAL POWER INC. (SPI) - EPSA 2025
  - MERALCO: SUAL POWER INC. (SPI) (Midmerit)
  - MERALCO: ENERGY DEVELOPMENT CORPORATION (EDC) (Midmerit)
  - MERALCO: PRIME SOLAR SOLUTIONS CORP. (PSSC)
  - MERALCO: SOLAR PHILIPPINES TARLAC CORP. (SPTC)
  - MERALCO: POWERSOURCE FIRST BULACAN SOLAR (PFBS)
  - MERALCO: GIGASOL3, INC.
  - MERALCO: OTHERS
  - MERALCO: SOLAR PHILIPPINES TANAUAN CORP. (SPTanC)
  - MERALCO: SOUTH PREMIERE POWER CORP. (SPPC)-2024
  - MERALCO: SOUTH PREMIERE POWER CORP. (SPPC)-Baseload
  - MERALCO: SUAL POWER INC. (SPI) (Midmerit)/Baseload
  - CLARK ELEC: SAN MIGUEL CONSOLIDATED POWER CORP. (SMCPC)
  - CLARK ELEC: STRATEGIC POWER DEVT. CORP (SPDC)
- **81 with annual cost of ₱0**, across 36 utilities: LUELCO (20), SOCOTECO I (8), LEYECO V (4), SOCOTECO II (4), MERALCO (3), NEECO II-A2 (3), CEPALCO (2), SEZ (2), SFELAPCO (2), DASURECO (2), DLPC (2), FIBECO (2), ISELCO II (2), BLCI (2), NORDECO (2), CEBECO I (1), PANELCO III (1), CEBECO II (1), TARELCO I (1), TARELCO II (1), CELCOR (1), BOHECO I (1), CASURECO II (1), MORESCO I (1), PELCO I (1), NEECO I (1), ASELCO (1), ZANECO (1), ANTECO (1), LANECO (1), FBPC (1), ZAMSURECO I (1), CAGELCO II (1), CLPC (1), ZAMCELCO (1), SAMELCO II (1).
- **Carve-out labels:** 42 marked “Full Carve-Out”, 325 marked “Locked (Legacy Take-or-Pay)”. No source is cited in the data. Confirm they come from the PSA documents.

## 6. Switching penetration at the extremes

- 0%: 15 utilities (CAGELCO II, BCEZ, CEZ, CLARK ELEC, FPSC, LEYECO IV, COTELCO, CLPC, ZAMCELCO, ZAMECO I, AURELCO, SCPC, SORECO I, SAMELCO II, SURSECO I)
- 100%: ILECO III, FBPC, ZAMSURECO I
- Usually means the eligible-customer count is missing, not truly zero or complete.

## 7. Policy text to confirm (not changed in the app)

- **Phase II (2016) note:** says a Supreme Court “permanent injunction affirmed customer choice as strictly voluntary, with right to remain captive.” The Court's 2017 action was a TRO against *mandatory* contestability. Reword once confirmed.
- **Phase IV:** ✅ Confirmed. ERC Res. No. 22, s. 2025 (docketed 20 Nov 2025) sets 100 kW, in force 26 June 2026. The app's wording “Standardized under…” can stay.
- **Calculator verdicts** cite the same Res. 22 (2025) and say 50–99 kW is “Roadmap Year 1 (2027)”. Keep in step with the latest roadmap.
- **RAP pooling rule** shown on aggregator cards: “Minimum 2+ end-users pooling ≥100 kW within single DU franchise.” Confirm against the current RAP rules.
- **Captive average label** in the data says “URR Filings (May–Sep 2026)”, but the per-utility filings run from 2025. The app now shows the actual range next to it.

## 8. Build scripts

- `build_retail_data.py` and `build_suppliers_from_rosedel.py` still point to the old folder (`brute force/App_Retailmarket`, `brute force/markdown/...`). They now write their output next to the script wherever it lives. The input paths (the MOS memo markdown and `markdown/01_rank_1_to_142_du_impairment.md`) still point to the old locations and need updating.
- **Caution:** `build_retail_data.py` writes only `summary`, `dus` and `offgrid_exempt`. Running it on its own drops the supplier lists and `market_prices`, which `build_suppliers_from_rosedel.py` and manual edits added. Run both, in that order, and re-add the regional GWh figures (`luzon_gwh`, `visayas_gwh`, `mindanao_gwh` under `market_prices.spot_market`) if they disappear.

## 9. Found while adding the v3 features (14 Nov 2026)

- **CAMELCO and SIARELCO:** ✅ Resolved. Both are on-grid. They have been removed from the app's off-grid list (now 19) and appear on the map as on-grid utilities without retail data.
- **The app's 21 off-grid list vs the workbook's 7:** the workbook excludes only BASELCO, FICELCO, MASELCO, OMECO, ORMECO, PALECO and PROSIELCO. The app's off-grid list (now 19) comes from the DOE list. Confirm the scope note.
- **26 on-grid DUs are not in the retail data:** ABRECO, BILECO, CANORECO, CASURECO I/III/IV, COTELCO-PPALMA, DORECO, ESAMELCO, GUIMELCO, IEC, IFELCO, KAELCO, LASURECO, LEYECO III, MAGELCO, MOELCI I, MOPRECO, NUVELCO, PANELCO I, QUEZELCO II, QUIRELCO, SOLECO, SUKELCO, SURSECO II and ZAMSURECO II. They now show on the map as dashed circles. Their map positions are approximate head-office locations; check the coordinates in `tools/build_extras.py`.
- **Workbook region for “APEC / ALECO” is Mindanao.** ALECO is in Albay (Luzon). The app maps it to ALECO, so its roadmap exposure counts under Luzon in the app.
- **Latest URR summary (Sep 2026) looks unreliable for many utilities.** `tools/update_check.py` matched 63 utilities. 35 moved more than 25% and several filed rates near zero (LUECO ₱0.07, SORECO II ₱0.72, TARELCO II ₱1.58). The app shows these as “Newest URR filing” notes and changes nothing. See `CHANGES_REPORT.md`.
- **GEOP threshold:** the calculator treats GEOP as 100 kW. The Omnibus 2026 amendment draft cites a 50 kW GEOP threshold under DOE DC No. 2026-01-0002. Confirm which applies before changing the calculator.
- **SCPC has a captive rate of ₱0.0000** in `data.js`.
- **Whole-bill estimate:** the starting wires-and-other-charges figures are scaled from the Meralco residential bill breakdown (ERC Data Briefer, Sept 2026, p. 473). Per-utility commercial rates would make this exact. The app tells users to replace the figures with their own bill.
- **Trends:** only two complete snapshots exist in the workspace (Q1 2026 from the Budget Cue Cards, Aug 2026 from the MOS memo). Add earlier quarterly MOS memos to `trends.periods` in `tools/build_extras.py` to get a real time series.
- **Translations:** the Filipino and Cebuano text was drafted without a native-speaker review. The app says so on the language screen.
