## v2 changes (14 Nov 2026)

**Savings calculator**
- Customers below the threshold no longer see a savings figure. 50–99 kW shows what they *would* save once the 50 kW threshold takes effect.
- Retail aggregation can now show an extra cost. The old code forced a minimum ₱0.15/kWh saving.
- The kWh box follows the kW inputs (60% load factor) until you type your own figure. In aggregation mode it covers the whole group.
- You get a warning when kWh is physically impossible for the stated kW, or when the load factor is implausibly low.
- WESM mode is renamed “Spot Ref.” and labelled as a benchmark, not a supply option.
- Every result says it compares generation charges only, and flags the captive rate if it is older than the market data.
- The Copy report now includes utility, offer, rate month and consumption.

**One source of truth**
- Every price, count, supplier total, group share and phase statistic is read from `data.js`. Nothing is typed into the code any more.
- No silent fallbacks to Meralco's ₱7.33 or other placeholder rates.
- The prices screen shows savings vs. the national captive average as a positive “below/above” figure, and shows the real date range of the URR filings.
- NGCP entries are counted separately: “104 DUs + 3 NGCP”.

**Data checks**
- Tap the ⚡ button for sources, calculator assumptions, and live data checks. The red badge counts high-priority issues.
- Captive rates more than 6 months older than the market data are marked ⚠ on the map card, directory, calculator, comparator and arbitrage screen.
- See `DATA_CHECKLIST.md` for the full list to verify.

**Usability and bugs**
- Pinch-to-zoom works again. The smallest text went from 7–9.5 px up to 9–10.5 px.
- Escape closes any open sheet. Close buttons have labels. Keyboard focus is visible.
- Dates use one format (“Sep 2025”). The browser tab title is plain.
- Fixed: tapping a Suppliers tab (RES/GEOP/Aggregators) also cleared the calculator mode.
- Choosing Luzon/Visayas/Mindanao now switches the bottom card to that grid's largest utility.
- Build scripts write output next to themselves instead of the old folder path.

---


## Look and feel pass (14 Nov 2026)

- New palette: navy ink on cool paper. The program colours are retuned: CREM cobalt, GEOP green, RAP amber, WESM violet. Every Tailwind default colour in the CSS and JS has been replaced.
- Typeface: Archivo, bundled in `vendor/fonts` so it works offline. Key figures use its condensed, tabular style, like a meter readout.
- All decorative emoji are removed: about 130 in the code, plus any in the data. Custom line icons replace them in the top bar, bottom navigation and search. Program pills use colour dots, verdicts use simple marks, and drawn chevrons replace ▲▼.
- Map: utilities are now proportional circles. Circle area shows MW for the selected program, NGCP points are squares, and the selected utility gets a navy callout showing its MW.
- The stats ribbon is now a dark readout strip. Metric tiles have a coloured edge instead of tinted fills.
- Labels are sentence case, and the generic drop shadows on cards are gone.
- Directory rows only colour the date when the rate is old; other metadata is plain text.
- Desktop: the phone-mockup bezel is replaced by a plain frame on graph paper, with a short introduction and headline figures beside it.
- Press feedback on buttons, smoother sheets, and an animated tab indicator. Motion is turned off when the device asks for reduced motion.

## v3: new features (14 Nov 2026)

**Threshold simulator** (roadmap button → Threshold simulator)
- Pick 100, 75, 50, 20 or 10 kW and a take-up of 10–100%. The simulator shows take-or-pay exposure, idle contracted MW, the added cost for remaining captive customers, the energy leaving captive supply, and newly eligible 50–99 kW customers.
- National figures come from the impairment workbook's dashboard and its sensitivity sheet: ₱38.34B at 100 kW, ₱56.01B at 50 kW, ₱77.06B at 10 kW, at full take-up.
- Per-utility table for all 121 on-grid DUs, filterable by grid, searchable, ranked by exposure. Tap a row to open the utility.
- Each utility's bottom card (Migration Waves tab) now shows its exposure at every threshold.

**History & trends** (roadmap sheet)
- Threshold timeline from 2013 to 2031, with roadmap steps dashed.
- Q1 2026 → Aug 2026 changes in demand, customers, groups and prices, plus the 2025 price ranges from the Budget Cue Cards.

**Whole-bill estimate** (calculator)
- Adds transmission, distribution, system loss, taxes and other charges, so users see the whole bill under each option and the saving as a share of the whole bill. Figures are editable.

**Market structure** (Suppliers → Market structure)
- HHI by group and by supplier, the five-group share, a bar chart of group shares, and affiliate sourcing against the 50% cap (Module C12.4).

**Complete map**
- 21 off-grid utilities (diamonds) and 26 on-grid utilities missing from the retail data (dashed circles), each with a popup. Toggle them with the layers button. A map key is in the ⚡ screen.

**Share and export**
- A share button on the utility card copies a link that opens that utility. Calculator links reopen the same scenario.
- A print button produces a one-page utility profile that can be saved as PDF.
- A CSV button in the Directory downloads all utilities, including the roadmap exposure columns.

**What changed**
- `tools/update_check.py` compares the app's captive rates with the newest URR summary. It writes `changes.js`, which shows under ⚡ and on each utility card, and `CHANGES_REPORT.md`. Nothing is overwritten.
- `tools/build_extras.py` rebuilds the simulator, trends, map and guide data from the workbook.

**Switching guide** (FAQ → How to switch)
- Six steps based on ERC Res. No. 22, s. 2025 and the Omnibus Rules, including the 90-day Letter of Intent and the 30-day meter deadlines. The calculator's next steps now link to it.

**Languages**
- English, Filipino and Cebuano for navigation, titles, the switching guide and the simulator (⚡ → Language). Data labels and the 501 FAQ stay in English.

**Install and offline**
- Web app manifest, icons and an offline cache (`sw.js`). These only work when the folder is served over http(s), for example on GitHub Pages or with `python3 -m http.server`. Opening `index.html` directly from disk works as before, but without install and offline.
