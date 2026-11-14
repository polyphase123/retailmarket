"""
Build extras.js for RetailMarket PH: threshold-impact data, trends, map additions,
bill-component shares and the switching guide.

Usage (from the app folder):
    python3 tools/build_extras.py            # reads ../../5. Supporting Files/Workbook/PSA_Master_Analysis_...xlsx
    python3 tools/build_extras.py "<other workbook or pre-extracted .json>"

The workbook is the source of truth for impairment figures (sheet
"RCOA Threshold Roadmap Impact"). Everything else in this file is
documented with its source next to it.
"""
import json, os, sys

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_impact(src):
    if src.endswith(".json"):
        j = json.load(open(src))
        return j["impact"], j.get("sens", [])
    import openpyxl
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    ws = wb["RCOA Threshold Roadmap Impact"]
    rows = list(ws.iter_rows(values_only=True))
    hi = [i for i, r in enumerate(rows) if r and r[0] == "DU"][0]
    H = rows[hi]
    out = []
    for r in rows[hi + 1:]:
        if r and r[0] and isinstance(r[4], (int, float)):
            out.append({H[i]: r[i] for i in range(len(H)) if H[i]})
    ws = wb["Retail Switching Sensitivity"]
    sens = [list(r) for r in ws.iter_rows(values_only=True) if any(v is not None for v in r)][:30]
    return out, sens

# Workbook names that differ from the app's acronyms
ALIAS = {"MORE": "MORE Power", "CENECO/NEPC": "NEPC", "NORDECO/DANECO": "NORDECO",
         "APEC / ALECO": "ALECO", "SUBIC": "SEZ"}
# Island utilities the workbook itself treats as off-grid (its 121 on-grid scope excludes these)
WB_OFFGRID = {"BASELCO", "FICELCO", "MASELCO", "OMECO", "ORMECO", "PALECO", "PROSIELCO"}

# Approximate head-office coordinates for utilities the app has no record of
COORDS = {
    "ABRECO": (17.596, 120.618), "BILECO": (11.56, 124.40), "CAMELCO": (9.25, 124.72),
    "CANORECO": (14.11, 122.95), "CASURECO I": (13.70, 123.06), "CASURECO III": (13.42, 123.41),
    "CASURECO IV": (13.63, 123.50), "COTELCO-PPALMA": (7.19, 124.53), "DORECO": (6.95, 126.22),
    "ESAMELCO": (11.61, 125.43), "GUIMELCO": (10.66, 122.59), "IEC": (13.82, 121.13),
    "IFELCO": (16.80, 121.12), "KAELCO": (17.41, 121.44), "LASURECO": (8.00, 124.29),
    "LEYECO III": (11.25, 124.75), "MAGELCO": (7.17, 124.20), "MOELCI I": (8.55, 123.60),
    "MOPRECO": (17.09, 120.98), "NUVELCO": (16.48, 121.15), "PANELCO I": (16.15, 119.98),
    "QUEZELCO II": (14.74, 121.65), "QUIRELCO": (16.59, 121.49), "SIARELCO": (9.76, 126.05),
    "SOLECO": (10.13, 124.84), "SUKELCO": (6.69, 124.68), "SURSECO II": (8.21, 126.32),
    "ZAMSURECO II": (7.78, 122.59),
    # off-grid
    "PALECO": (9.74, 118.74), "ORMECO": (13.41, 121.18), "OMECO": (12.35, 121.07),
    "MASELCO": (12.37, 123.62), "FICELCO": (13.58, 124.23), "MARELCO": (13.45, 121.84),
    "TIELCO": (12.40, 121.99), "ROMBLON": (12.58, 122.27), "TISELCO": (12.57, 123.73),
    "BATANELCO": (20.45, 121.97), "LUBELCO": (13.86, 120.12), "BANELCO": (11.17, 123.72),
    "DIELCO": (10.01, 125.57), "BASELCO": (6.70, 121.97), "SULECO": (6.05, 121.00),
    "TAWELCO": (5.03, 119.77), "CASELCO": (6.97, 118.51), "PROSIELCO": (9.21, 123.51),
    "BISELCO": (12.00, 120.20),
}

STEPS = [("Y1 100kW", 100), ("Y2 75kW", 75), ("Y3 50kW", 50), ("Y4 20kW", 20), ("Y5 10kW", 10)]

def compact(r):
    o = {"region": r["Region"], "type": r["DU Type"], "archetype": r["DDP Archetype"],
         "kwh2025": round(r["Total 2025 kWh"] or 0), "psa_mw": round(r["Total Contracted PSA MW"] or 0, 2),
         "base_rate": round(r["Base Weighted Rate Php kWh"] or 0, 4), "risk": r.get("Impairment Risk Level"),
         "steps": {}}
    for k, kw in STEPS:
        o["steps"][str(kw)] = {
            "migrated_gwh": round((r[f"{k} Migrated kWh"] or 0) / 1e6, 3),
            "loss_pct": round(r[f"{k} Captive Loss Pct"] or 0, 2),
            "stranded_mw": round(r[f"{k} Stranded MW"] or 0, 3),
            "exposure_php": round(r[f"{k} TakeOrPay Exposure Php"] or 0),
            "hike_php_kwh": round(r[f"{k} Res Tariff Hike Php kWh"] or 0, 4),
        }
    return o

def parse_sens(sens):
    out = []
    for r in sens:
        if r and isinstance(r[0], str) and r[0].endswith("Threshold") and isinstance(r[2], (int, float)):
            kw = int(r[0].split()[0])
            out.append({"kw": kw, "year": r[1], "eligible_gwh": r[2], "mw": r[3], "php_b": r[4],
                        "takeup": {p: {"mw": r[5 + 3 * i], "php_b": r[6 + 3 * i], "hike": r[7 + 3 * i]}
                                   for i, p in enumerate([10, 25, 50, 75, 100])},
                        "note": r[20] if len(r) > 20 else None})
    return out

def main():
    wb = os.path.join(APP, "..", "..", "5. Supporting Files", "Workbook", "PSA_Master_Analysis_ERC_DDP_and_RCOA_Impairment_2025.xlsx")
    src = sys.argv[1] if len(sys.argv) > 1 else (wb if os.path.exists(wb) else os.path.join(APP, "..", "3. Working Files", "_build", "imp.json"))
    rows, sens = load_impact(src)
    s = open(os.path.join(APP, "data.js")).read()
    data = json.loads(s[s.index("=") + 1:].rstrip().rstrip(";"))
    app_acr = {d["acronym"] for d in data["dus"]}
    app_off = {d["acronym"] for d in data["offgrid_exempt"]}

    impact, missing = {}, []
    for r in rows:
        wb = r["DU"]
        acr = ALIAS.get(wb, wb)
        c = compact(r)
        c["workbook_name"] = wb
        if wb in WB_OFFGRID:
            continue
        impact[acr] = c
        if acr not in app_acr:
            lat, lon = COORDS.get(acr, (None, None))
            missing.append({"acronym": acr, "region": r["Region"], "type": r["DU Type"], "lat": lat, "lon": lon,
                            "app_says_offgrid": acr in app_off})

    offgrid = []
    for d in data["offgrid_exempt"]:
        lat, lon = COORDS.get(d["acronym"], (None, None))
        offgrid.append({**d, "lat": lat, "lon": lon, "workbook_ongrid": d["acronym"] in impact})

    national = {
        "source": "PSA_Master_Analysis_ERC_DDP_and_RCOA_Impairment_2025.xlsx, Executive Dashboard & Impact",
        "scope": "121 on-grid DUs (excludes 21 off-grid island DUs per DOE list, 31 Mar 2026)",
        "steps": [
            {"kw": 100, "label": "100 kW", "status": "In force 26 June 2026 (ERC Res. No. 22, s. 2025)", "gwh": 14701.2, "loss_pct": 21.92, "mw": 2563.49, "php_b": 38.34, "hike": 0.732},
            {"kw": 75, "label": "75 kW", "status": "Model step only; not on the roadmap path", "gwh": 18111.3, "loss_pct": 27.0, "mw": 3152.41, "php_b": 47.17, "hike": 0.9634},
            {"kw": 50, "label": "50 kW", "status": "Roadmap 2027–2029; managed through Contract Transition Plans", "gwh": 21521.3, "loss_pct": 32.08, "mw": 3741.34, "php_b": 56.01, "hike": 1.2295},
            {"kw": 20, "label": "20 kW", "status": "Model step; the roadmap uses 30 kW (interpolated) in 2030", "gwh": 25074.4, "loss_pct": 37.38, "mw": 4349.52, "php_b": 65.16, "hike": 1.5514},
            {"kw": 10, "label": "10 kW", "status": "Proxy for full choice, 2031 (stress test, not a forecast)", "gwh": 29693.4, "loss_pct": 44.27, "mw": 5140.16, "php_b": 77.06, "hike": 2.0614},
        ],
        "mitigation_note": "2027 at 50 kW: ₱56.01B gross exposure falls to ₱4.98B residual after the mitigation hierarchy (workbook dashboard).",
    }

    trends = {
        "note": "Only two complete snapshots exist in the workspace so far. Add a row to `periods` each month.",
        "periods": [
            {"label": "Q1 2026", "asof": "Apr 2026", "source": "ERC 2027 Budget Cue Cards, pp. 134–136",
             "crem_mw": 4991.29, "crem_wap": 5.41, "geop_eus": 883, "geop_mw": 279.21, "geop_wap": 5.91,
             "rap_groups": 168, "rap_members": 2481, "rap_mw": 155.05, "rap_wap": 5.62},
            {"label": "Aug 2026", "asof": "Aug 2026", "source": "MOS-CMD Memo MOS202600124319 (14 Oct 2026)",
             "crem_eus": data["summary"]["crem"]["total_eus"], "crem_mw": data["summary"]["crem"]["total_mw"],
             "crem_wap": data["summary"]["crem"]["wap_php_kwh"], "geop_eus": data["summary"]["geop"]["total_eus"],
             "geop_mw": data["summary"]["geop"]["total_mw"], "geop_wap": data["summary"]["geop"]["wap_php_kwh"],
             "rap_groups": data["summary"]["rap"]["total_groups"], "rap_members": data["summary"]["rap"]["total_members"],
             "rap_mw": data["summary"]["rap"]["total_mw"], "rap_wap": data["summary"]["rap"]["wap_php_kwh"]},
        ],
        "price_2025": {"source": "ERC 2027 Budget Cue Cards, p. 32",
                       "crem": [5.33, 5.73], "geop": [6.02, 6.16], "du_avg_bill": [10.5, 11.6],
                       "crem_savings_2025_php_b": 19.87},
        "thresholds": [
            {"year": 2013, "kw": 1000, "basis": "Phase I, Luzon and Visayas"},
            {"year": 2016, "kw": 750, "basis": "Threshold reduced to 750 kW"},
            {"year": 2021, "kw": 500, "basis": "ERC Res. No. 12, s. 2020 (issued 3 Dec 2020)"},
            {"year": 2026, "kw": 100, "basis": "ERC Res. No. 22, s. 2025; in force 26 June 2026"},
            {"year": 2027, "kw": 50, "basis": "ERC roadmap", "proposed": True},
            {"year": 2030, "kw": 30, "basis": "ERC roadmap", "proposed": True},
            {"year": 2031, "kw": 10, "basis": "ERC roadmap: full choice", "proposed": True},
        ],
    }

    # Share of a typical bill by component, relative to the generation charge.
    bill = {
        "source": "Meralco bill breakdown, ERC Data Briefer (Sept 2026), p. 473",
        "basis_pct": {"generation": 61.35, "transmission": 9.82, "distribution": 10.39, "system_loss": 5.58,
                      "taxes": 9.14, "universal_fit_other": 3.71},
        "caveat": "A residential example. Commercial customers pay demand-based distribution charges, so replace these with figures from the customer's own bill.",
    }

    guide = {
        "sources": ["ERC Resolution No. 22, s. 2025 (docketed 20 Nov 2025; 100 kW in force 26 June 2026)",
                    "Omnibus Rules for Customer Choice Programs (ERC Res. No. 13, s. 2024), Modules D, E and G"],
        "steps": [
            {"key": "eligible", "days": None},
            {"key": "choose", "days": None},
            {"key": "loi", "days": 90},
            {"key": "meter", "days": 30},
            {"key": "crb", "days": None},
            {"key": "switched", "days": None},
        ],
    }

    extras = {"impact": impact, "national": national, "sensitivity": parse_sens(sens),
              "missing_ongrid": missing, "offgrid": offgrid, "trends": trends, "bill": bill, "guide": guide,
              "built_from": os.path.basename(src)}
    with open(os.path.join(APP, "extras.js"), "w") as f:
        f.write("// Generated by tools/build_extras.py. Do not edit by hand; rerun the script.\n")
        f.write("window.RETAIL_MARKET_EXTRAS = ")
        json.dump(extras, f, ensure_ascii=False, indent=1)
        f.write(";\n")
    print(f"extras.js: {len(impact)} DUs with impact data, {len(missing)} on-grid DUs not in data.js, {len(offgrid)} off-grid")

if __name__ == "__main__":
    main()
