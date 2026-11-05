import re, json, os

mos_path = "/Users/franzxyrloi.tobias/Desktop/github/brute force/MOS202600124319_Statistical Data in the Retail Market for Aug_2026.algg_rvn.md"
with open(mos_path) as f:
    text = f.read()

lines = text.splitlines()

# Load master DU impairment data if available
master_du_info = {}
try:
    with open("/Users/franzxyrloi.tobias/Desktop/github/brute force/markdown/01_rank_1_to_142_du_impairment.md") as f:
        m_lines = f.readlines()
    for l in m_lines:
        if l.strip().startswith("|") and not "Rank" in l and not "---" in l:
            cols = [c.strip() for c in l.split("|")[1:-1]]
            if len(cols) >= 10:
                rank = cols[0]
                acronym = cols[1].replace("**", "")
                region = cols[2]
                itype = cols[3]
                archetype = cols[4]
                rcoa_scope = cols[5]
                gen_kwh = cols[6]
                base_rate = cols[9]
                master_du_info[acronym] = {
                    "rank": rank, "acronym": acronym, "region": region,
                    "itype": itype, "archetype": archetype, "rcoa_scope": rcoa_scope,
                    "gen_kwh": gen_kwh, "base_rate": base_rate
                }
except Exception as e:
    print("Warning loading master DU table:", e)

COORDS = {
    # Luzon PDUs & Ecozones
    "Manila Electric Company": {"lat": 14.5892, "lon": 121.0664, "acronym": "MERALCO", "prov": "Metro Manila & Mega Manila", "type": "PDU", "grid": "Luzon"},
    "Angeles Electric Corporation": {"lat": 15.1450, "lon": 120.5887, "acronym": "AEC", "prov": "Pampanga (Angeles)", "type": "PDU", "grid": "Luzon"},
    "Clark Electric Distribution Corporation": {"lat": 15.1855, "lon": 120.5435, "acronym": "CEDC", "prov": "Pampanga (Clark Freeport)", "type": "Ecozone", "grid": "Luzon"},
    "San Fernando Electric Light & Power Co., Inc.": {"lat": 15.0298, "lon": 120.6898, "acronym": "SFELAPCO", "prov": "Pampanga (San Fernando)", "type": "PDU", "grid": "Luzon"},
    "San Fernando Electric Light & Power Co. Inc.": {"lat": 15.0298, "lon": 120.6898, "acronym": "SFELAPCO", "prov": "Pampanga (San Fernando)", "type": "PDU", "grid": "Luzon"},
    "San Fernando Light and Power Corp.": {"lat": 15.0298, "lon": 120.6898, "acronym": "SFELAPCO", "prov": "Pampanga (San Fernando)", "type": "PDU", "grid": "Luzon"},
    "Tarlac Electric, Inc.": {"lat": 15.4802, "lon": 120.5979, "acronym": "TEI", "prov": "Tarlac (Tarlac City)", "type": "PDU", "grid": "Luzon"},
    "Tarlac Electric Inc.": {"lat": 15.4802, "lon": 120.5979, "acronym": "TEI", "prov": "Tarlac (Tarlac City)", "type": "PDU", "grid": "Luzon"},
    "Dagupan Electric Corporation": {"lat": 16.0433, "lon": 120.3340, "acronym": "DECORP", "prov": "Pangasinan (Dagupan City)", "type": "PDU", "grid": "Luzon"},
    "Cabanatuan Electric Corporation": {"lat": 15.4859, "lon": 120.9673, "acronym": "CELCOR", "prov": "Nueva Ecija (Cabanatuan)", "type": "PDU", "grid": "Luzon"},
    "Subic Enerzone Corporation": {"lat": 14.8219, "lon": 120.2798, "acronym": "SEZ", "prov": "Zambales (Subic Bay Freeport)", "type": "Ecozone", "grid": "Luzon"},
    "Subic Enerzone Corp.": {"lat": 14.8219, "lon": 120.2798, "acronym": "SEZ", "prov": "Zambales (Subic Bay Freeport)", "type": "Ecozone", "grid": "Luzon"},
    "Lima Enerzone Corporation": {"lat": 13.9984, "lon": 121.1610, "acronym": "LEZ", "prov": "Batangas (Lipa/Malvar)", "type": "Ecozone", "grid": "Luzon"},
    "LIMA Enerzone Corporation": {"lat": 13.9984, "lon": 121.1610, "acronym": "LEZ", "prov": "Batangas (Lipa/Malvar)", "type": "Ecozone", "grid": "Luzon"},
    "LIMA Enerzone": {"lat": 13.9984, "lon": 121.1610, "acronym": "LEZ", "prov": "Batangas (Lipa/Malvar)", "type": "Ecozone", "grid": "Luzon"},
    "Malvar Enerzone Corporation": {"lat": 14.0450, "lon": 121.1550, "acronym": "MEZ-Luzon", "prov": "Batangas (Malvar)", "type": "Ecozone", "grid": "Luzon"},
    "Malvar EnerZone Corporation": {"lat": 14.0450, "lon": 121.1550, "acronym": "MEZ-Luzon", "prov": "Batangas (Malvar)", "type": "Ecozone", "grid": "Luzon"},
    "Malvar Enerzone": {"lat": 14.0450, "lon": 121.1550, "acronym": "MEZ-Luzon", "prov": "Batangas (Malvar)", "type": "Ecozone", "grid": "Luzon"},
    "Authority Freeport Area of Bataan": {"lat": 14.4333, "lon": 120.4833, "acronym": "AFAB", "prov": "Bataan (Mariveles)", "type": "Ecozone", "grid": "Luzon"},
    "Consort Land, Inc.": {"lat": 14.2800, "lon": 121.1200, "acronym": "CLI", "prov": "Laguna (Industrial Park)", "type": "Ecozone", "grid": "Luzon"},
    "First Industrial Township Utilities, Inc.": {"lat": 14.0833, "lon": 121.1500, "acronym": "FITUI", "prov": "Batangas (Tanauan)", "type": "Ecozone", "grid": "Luzon"},
    "Baguio City Economic Zone": {"lat": 16.3900, "lon": 120.6100, "acronym": "BCEZ", "prov": "Benguet (Baguio City)", "type": "Ecozone", "grid": "Luzon"},
    "Cavite Economic Zone": {"lat": 14.4100, "lon": 120.8800, "acronym": "CEZ", "prov": "Cavite (Rosario)", "type": "Ecozone", "grid": "Luzon"},
    "Formosa Power Supply Corp.": {"lat": 14.4350, "lon": 120.4850, "acronym": "FPSC", "prov": "Bataan (Mariveles)", "type": "Ecozone", "grid": "Luzon"},
    "Shin Clark Power Corporation": {"lat": 15.2500, "lon": 120.5200, "acronym": "SCPC", "prov": "Tarlac/Pampanga (New Clark)", "type": "Ecozone", "grid": "Luzon"},
    "La Union Electric Company, Inc.": {"lat": 16.6159, "lon": 120.3209, "acronym": "LUECO", "prov": "La Union (San Fernando)", "type": "PDU", "grid": "Luzon"},
    "Olongapo Electricity Distribution Company, Inc.": {"lat": 14.8294, "lon": 120.2825, "acronym": "OEDC", "prov": "Zambales (Olongapo)", "type": "PDU", "grid": "Luzon"},
    "First Bay Power Corporation": {"lat": 13.7917, "lon": 121.0083, "acronym": "FBPC", "prov": "Batangas (Bauan)", "type": "PDU", "grid": "Luzon"},

    # Luzon ECs
    "Albay Electric Cooperative, Inc.": {"lat": 13.1391, "lon": 123.7438, "acronym": "ALECO", "prov": "Albay (Legazpi)", "type": "EC", "grid": "Luzon"},
    "Batangas I Electric Cooperative, Inc.": {"lat": 13.9298, "lon": 120.8124, "acronym": "BATELEC I", "prov": "Batangas (Calaca)", "type": "EC", "grid": "Luzon"},
    "Batangas II Electric Cooperative, Inc.": {"lat": 13.9419, "lon": 121.1644, "acronym": "BATELEC II", "prov": "Batangas (Lipa City)", "type": "EC", "grid": "Luzon"},
    "Benguet Electric Cooperative, Inc.": {"lat": 16.4023, "lon": 120.5960, "acronym": "BENECO", "prov": "Benguet (Baguio City)", "type": "EC", "grid": "Luzon"},
    "Benguet Electric Cooperative": {"lat": 16.4023, "lon": 120.5960, "acronym": "BENECO", "prov": "Benguet (Baguio City)", "type": "EC", "grid": "Luzon"},
    "Cagayan I Electric Cooperative, Inc.": {"lat": 17.6132, "lon": 121.7270, "acronym": "CAGELCO I", "prov": "Cagayan (Tuguegarao)", "type": "EC", "grid": "Luzon"},
    "Cagayan II Electric Cooperative, Inc.": {"lat": 18.3564, "lon": 121.6420, "acronym": "CAGELCO II", "prov": "Cagayan (Aparri)", "type": "EC", "grid": "Luzon"},
    "Camarines Sur II Electric Cooperative, Inc.": {"lat": 13.6218, "lon": 123.1948, "acronym": "CASURECO II", "prov": "Camarines Sur (Naga)", "type": "EC", "grid": "Luzon"},
    "Camarines Sur II Electric Cooperative Inc.": {"lat": 13.6218, "lon": 123.1948, "acronym": "CASURECO II", "prov": "Camarines Sur (Naga)", "type": "EC", "grid": "Luzon"},
    "Central Pangasinan Electric Cooperative, Inc.": {"lat": 15.9281, "lon": 120.3489, "acronym": "CENPELCO", "prov": "Pangasinan (San Carlos)", "type": "EC", "grid": "Luzon"},
    "Central Pangasinan Electric Cooperative": {"lat": 15.9281, "lon": 120.3489, "acronym": "CENPELCO", "prov": "Pangasinan (San Carlos)", "type": "EC", "grid": "Luzon"},
    "First Laguna Electric Cooperative, Inc.": {"lat": 14.3000, "lon": 121.4600, "acronym": "FLECO", "prov": "Laguna (Lumban)", "type": "EC", "grid": "Luzon"},
    "First Laguna Electric Cooperative Inc.": {"lat": 14.3000, "lon": 121.4600, "acronym": "FLECO", "prov": "Laguna (Lumban)", "type": "EC", "grid": "Luzon"},
    "Ilocos Norte Electric Cooperative, Inc.": {"lat": 18.1979, "lon": 120.5927, "acronym": "INEC", "prov": "Ilocos Norte (Laoag)", "type": "EC", "grid": "Luzon"},
    "Ilocos Sur Electric Cooperative, Inc.": {"lat": 17.2917, "lon": 120.4350, "acronym": "ISECO", "prov": "Ilocos Sur (Santiago)", "type": "EC", "grid": "Luzon"},
    "Isabela I Electric Cooperative, Inc.": {"lat": 16.7806, "lon": 121.6972, "acronym": "ISELCO I", "prov": "Isabela (Alicia)", "type": "EC", "grid": "Luzon"},
    "Isabela I Electric Cooperative Inc.": {"lat": 16.7806, "lon": 121.6972, "acronym": "ISELCO I", "prov": "Isabela (Alicia)", "type": "EC", "grid": "Luzon"},
    "Isabela II Electric Cooperative MSP": {"lat": 17.1478, "lon": 121.8872, "acronym": "ISELCO II", "prov": "Isabela (Ilagan)", "type": "EC", "grid": "Luzon"},
    "Isabela II Electric Cooperative": {"lat": 17.1478, "lon": 121.8872, "acronym": "ISELCO II", "prov": "Isabela (Ilagan)", "type": "EC", "grid": "Luzon"},
    "La Union Electric Cooperative, Inc.": {"lat": 16.4000, "lon": 120.3500, "acronym": "LUELCO", "prov": "La Union (Aringay)", "type": "EC", "grid": "Luzon"},
    "Nueva Ecija I Electric Cooperative, Inc.": {"lat": 15.3089, "lon": 120.9472, "acronym": "NEECO I", "prov": "Nueva Ecija (Gapan)", "type": "EC", "grid": "Luzon"},
    "Nueva Ecija II Area 1 Electric Cooperative, Inc.": {"lat": 15.5833, "lon": 120.9167, "acronym": "NEECO II-A1", "prov": "Nueva Ecija (Talavera)", "type": "EC", "grid": "Luzon"},
    "Nueva Ecija II Electric Cooperative, Inc. Area 1": {"lat": 15.5833, "lon": 120.9167, "acronym": "NEECO II-A1", "prov": "Nueva Ecija (Talavera)", "type": "EC", "grid": "Luzon"},
    "Nueva Ecija II Electric Cooperative, Inc. Area 2": {"lat": 15.4167, "lon": 120.9667, "acronym": "NEECO II-A2", "prov": "Nueva Ecija (San Leonardo)", "type": "EC", "grid": "Luzon"},
    "Nueva Ecija II Electric Cooperative,Inc.-Area II": {"lat": 15.4167, "lon": 120.9667, "acronym": "NEECO II-A2", "prov": "Nueva Ecija (San Leonardo)", "type": "EC", "grid": "Luzon"},
    "Pampanga I Electric Cooperative, Inc.": {"lat": 15.0644, "lon": 120.7208, "acronym": "PELCO I", "prov": "Pampanga (Mexico)", "type": "EC", "grid": "Luzon"},
    "Pampanga II Electric Cooperative, Inc.": {"lat": 14.9667, "lon": 120.6333, "acronym": "PELCO II", "prov": "Pampanga (Guagua)", "type": "EC", "grid": "Luzon"},
    "Pampanga III Electric Cooperative, Inc.": {"lat": 14.9500, "lon": 120.7600, "acronym": "PELCO III", "prov": "Pampanga (Apalit)", "type": "EC", "grid": "Luzon"},
    "Pampanga Rural Electric Service Cooperative, Inc.": {"lat": 15.1500, "lon": 120.7667, "acronym": "PRESCO", "prov": "Pampanga (Arayat)", "type": "EC", "grid": "Luzon"},
    "Pangasinan III Electric Cooperative": {"lat": 15.9761, "lon": 120.5711, "acronym": "PANELCO III", "prov": "Pangasinan (Urdaneta)", "type": "EC", "grid": "Luzon"},
    "Pangasinan III Electric Cooperative Inc.": {"lat": 15.9761, "lon": 120.5711, "acronym": "PANELCO III", "prov": "Pangasinan (Urdaneta)", "type": "EC", "grid": "Luzon"},
    "Peninsula Electric Cooperative, Inc.": {"lat": 14.6760, "lon": 120.5360, "acronym": "PENELCO", "prov": "Bataan (Balanga)", "type": "EC", "grid": "Luzon"},
    "Quezon I Electric Cooperative, Inc.": {"lat": 13.9214, "lon": 122.1006, "acronym": "QUEZELCO I", "prov": "Quezon (Gumaca)", "type": "EC", "grid": "Luzon"},
    "San Jose City Electric Cooperative": {"lat": 15.7911, "lon": 120.9986, "acronym": "SAJELCO", "prov": "Nueva Ecija (San Jose City)", "type": "EC", "grid": "Luzon"},
    "San Jose Electric Cooperative, Inc.": {"lat": 15.7911, "lon": 120.9986, "acronym": "SAJELCO", "prov": "Nueva Ecija (San Jose City)", "type": "EC", "grid": "Luzon"},
    "Sorsogon I Electric Cooperative": {"lat": 12.7000, "lon": 124.0333, "acronym": "SORECO I", "prov": "Sorsogon (Irosin)", "type": "EC", "grid": "Luzon"},
    "Sorsogon II Electric Cooperative, Inc.": {"lat": 12.9742, "lon": 124.0058, "acronym": "SORECO II", "prov": "Sorsogon (Sorsogon City)", "type": "EC", "grid": "Luzon"},
    "Sorsogon II Electric Cooperative Inc.": {"lat": 12.9742, "lon": 124.0058, "acronym": "SORECO II", "prov": "Sorsogon (Sorsogon City)", "type": "EC", "grid": "Luzon"},
    "Tarlac I Electric Cooperative, Inc.": {"lat": 15.6069, "lon": 120.5989, "acronym": "TARELCO I", "prov": "Tarlac (Gerona)", "type": "EC", "grid": "Luzon"},
    "Tarlac II Electric Cooperative, Inc.": {"lat": 15.3247, "lon": 120.6558, "acronym": "TARELCO II", "prov": "Tarlac (Concepcion)", "type": "EC", "grid": "Luzon"},
    "Tarlac II Electric Cooperative Inc.": {"lat": 15.3247, "lon": 120.6558, "acronym": "TARELCO II", "prov": "Tarlac (Concepcion)", "type": "EC", "grid": "Luzon"},
    "Zambales I Electric Cooperative, Inc.": {"lat": 15.3275, "lon": 119.9819, "acronym": "ZAMECO I", "prov": "Zambales (Iba)", "type": "EC", "grid": "Luzon"},
    "Zambales II Electric Cooperative, Inc.": {"lat": 14.9317, "lon": 120.1989, "acronym": "ZAMECO II", "prov": "Zambales (Castillejos)", "type": "EC", "grid": "Luzon"},
    "Aurora Electric Cooperative, Inc.": {"lat": 15.7592, "lon": 121.5622, "acronym": "AURELCO", "prov": "Aurora (Baler)", "type": "EC", "grid": "Luzon"},
    "NGCP (Luzon)": {"lat": 14.3000, "lon": 121.0800, "acronym": "NGCP-Luz", "prov": "Luzon Bulk Transmission Grid", "type": "Transmission", "grid": "Luzon"},

    # Visayas PDUs & Ecozones
    "Visayan Electric Company, Inc.": {"lat": 10.3157, "lon": 123.8854, "acronym": "VECO", "prov": "Cebu (Metro Cebu)", "type": "PDU", "grid": "Visayas"},
    "Visayan Electric Company": {"lat": 10.3157, "lon": 123.8854, "acronym": "VECO", "prov": "Cebu (Metro Cebu)", "type": "PDU", "grid": "Visayas"},
    "Visayan Electric Corporation": {"lat": 10.3157, "lon": 123.8854, "acronym": "VECO", "prov": "Cebu (Metro Cebu)", "type": "PDU", "grid": "Visayas"},
    "Visayan Electric Company Inc.": {"lat": 10.3157, "lon": 123.8854, "acronym": "VECO", "prov": "Cebu (Metro Cebu)", "type": "PDU", "grid": "Visayas"},
    "MORE Electric and Power Corporation": {"lat": 10.7202, "lon": 122.5621, "acronym": "MORE Power", "prov": "Iloilo (Iloilo City)", "type": "PDU", "grid": "Visayas"},
    "Negros Electric and Power Corporation": {"lat": 10.6765, "lon": 122.9509, "acronym": "NEPC", "prov": "Negros Occ. (Bacolod)", "type": "PDU", "grid": "Visayas"},
    "Negros Electric and Power Corp.": {"lat": 10.6765, "lon": 122.9509, "acronym": "NEPC", "prov": "Negros Occ. (Bacolod)", "type": "PDU", "grid": "Visayas"},
    "Mactan Electric Company, Inc.": {"lat": 10.3111, "lon": 123.9515, "acronym": "MECO", "prov": "Cebu (Lapu-Lapu City)", "type": "PDU", "grid": "Visayas"},
    "Mactan Electric Company": {"lat": 10.3111, "lon": 123.9515, "acronym": "MECO", "prov": "Cebu (Lapu-Lapu City)", "type": "PDU", "grid": "Visayas"},
    "Mactan Enerzone Corporation": {"lat": 10.3150, "lon": 123.9780, "acronym": "MEZ-Cebu", "prov": "Cebu (Mactan Ecozone)", "type": "Ecozone", "grid": "Visayas"},
    "Mactan Enerzone": {"lat": 10.3150, "lon": 123.9780, "acronym": "MEZ-Cebu", "prov": "Cebu (Mactan Ecozone)", "type": "Ecozone", "grid": "Visayas"},
    "Balamban Enerzone Corporation": {"lat": 10.4994, "lon": 123.7128, "acronym": "BEZ", "prov": "Cebu (Balamban Ecozone)", "type": "Ecozone", "grid": "Visayas"},
    "Bohol Light Company, Inc.": {"lat": 9.6500, "lon": 123.8500, "acronym": "BLCI", "prov": "Bohol (Tagbilaran City)", "type": "PDU", "grid": "Visayas"},

    # Visayas ECs
    "Aklan Electric Cooperative, Inc.": {"lat": 11.6667, "lon": 122.3333, "acronym": "AKELCO", "prov": "Aklan (Lezo/Kalibo)", "type": "EC", "grid": "Visayas"},
    "Aklan Electric Cooperative": {"lat": 11.6667, "lon": 122.3333, "acronym": "AKELCO", "prov": "Aklan (Lezo/Kalibo)", "type": "EC", "grid": "Visayas"},
    "Aklan Electric Cooperative Inc.": {"lat": 11.6667, "lon": 122.3333, "acronym": "AKELCO", "prov": "Aklan (Lezo/Kalibo)", "type": "EC", "grid": "Visayas"},
    "Antique Electric Cooperative, Inc.": {"lat": 10.7450, "lon": 121.9419, "acronym": "ANTECO", "prov": "Antique (San Jose)", "type": "EC", "grid": "Visayas"},
    "Bohol I Electric Cooperative, Inc.": {"lat": 9.9511, "lon": 123.9608, "acronym": "BOHECO I", "prov": "Bohol (Tubigon)", "type": "EC", "grid": "Visayas"},
    "Bohol I Electric Cooperative": {"lat": 9.9511, "lon": 123.9608, "acronym": "BOHECO I", "prov": "Bohol (Tubigon)", "type": "EC", "grid": "Visayas"},
    "Bohol II Electric Cooperative, Inc.": {"lat": 9.6517, "lon": 124.3683, "acronym": "BOHECO II", "prov": "Bohol (Jagna)", "type": "EC", "grid": "Visayas"},
    "Bohol II Electric Cooperative": {"lat": 9.6517, "lon": 124.3683, "acronym": "BOHECO II", "prov": "Bohol (Jagna)", "type": "EC", "grid": "Visayas"},
    "Capiz Electric Cooperative, Inc.": {"lat": 11.5853, "lon": 122.7511, "acronym": "CAPELCO", "prov": "Capiz (Roxas City)", "type": "EC", "grid": "Visayas"},
    "Capiz Electric Cooperative": {"lat": 11.5853, "lon": 122.7511, "acronym": "CAPELCO", "prov": "Capiz (Roxas City)", "type": "EC", "grid": "Visayas"},
    "Cebu I Electric Cooperative, Inc.": {"lat": 10.1200, "lon": 123.6400, "acronym": "CEBECO I", "prov": "Cebu (Carcar)", "type": "EC", "grid": "Visayas"},
    "Cebu I Electric Cooperative": {"lat": 10.1200, "lon": 123.6400, "acronym": "CEBECO I", "prov": "Cebu (Carcar)", "type": "EC", "grid": "Visayas"},
    "Cebu II Electric Cooperative, Inc.": {"lat": 11.0500, "lon": 124.0058, "acronym": "CEBECO II", "prov": "Cebu (Bogo)", "type": "EC", "grid": "Visayas"},
    "Cebu II Electric Cooperative": {"lat": 11.0500, "lon": 124.0058, "acronym": "CEBECO II", "prov": "Cebu (Bogo)", "type": "EC", "grid": "Visayas"},
    "Cebu III Electric Cooperative, Inc.": {"lat": 10.3789, "lon": 123.6378, "acronym": "CEBECO III", "prov": "Cebu (Toledo)", "type": "EC", "grid": "Visayas"},
    "Cebu III Electric Cooperative": {"lat": 10.3789, "lon": 123.6378, "acronym": "CEBECO III", "prov": "Cebu (Toledo)", "type": "EC", "grid": "Visayas"},
    "Don Orestes Romualdez Electric Cooperative, Inc.": {"lat": 11.0600, "lon": 125.0350, "acronym": "DORELCO", "prov": "Leyte (Tolosa)", "type": "EC", "grid": "Visayas"},
    "Iloilo I Electric Cooperative, Inc.": {"lat": 10.6750, "lon": 122.3800, "acronym": "ILECO I", "prov": "Iloilo (Tigbauan)", "type": "EC", "grid": "Visayas"},
    "Iloilo II Electric Cooperative, Inc.": {"lat": 10.9481, "lon": 122.6289, "acronym": "ILECO II", "prov": "Iloilo (Pototan)", "type": "EC", "grid": "Visayas"},
    "Iloilo III Electric Cooperative, Inc.": {"lat": 11.2611, "lon": 123.0167, "acronym": "ILECO III", "prov": "Iloilo (Sara)", "type": "EC", "grid": "Visayas"},
    "Leyte II Electric Cooperative, Inc.": {"lat": 11.2433, "lon": 125.0039, "acronym": "LEYECO II", "prov": "Leyte (Tacloban)", "type": "EC", "grid": "Visayas"},
    "Leyte II Electric Cooperative": {"lat": 11.2433, "lon": 125.0039, "acronym": "LEYECO II", "prov": "Leyte (Tacloban)", "type": "EC", "grid": "Visayas"},
    "Leyte IV Electric Cooperative, Inc.": {"lat": 10.3700, "lon": 124.7800, "acronym": "LEYECO IV", "prov": "Leyte (Hilongos)", "type": "EC", "grid": "Visayas"},
    "Leyte IV Electric Cooperative": {"lat": 10.3700, "lon": 124.7800, "acronym": "LEYECO IV", "prov": "Leyte (Hilongos)", "type": "EC", "grid": "Visayas"},
    "Leyte V Electric Cooperative, Inc.": {"lat": 11.0050, "lon": 124.6075, "acronym": "LEYECO V", "prov": "Leyte (Ormoc)", "type": "EC", "grid": "Visayas"},
    "Leyte V Electric Cooperative": {"lat": 11.0050, "lon": 124.6075, "acronym": "LEYECO V", "prov": "Leyte (Ormoc)", "type": "EC", "grid": "Visayas"},
    "Negros Occidental Electric Cooperative": {"lat": 9.9922, "lon": 122.8131, "acronym": "NOCECO", "prov": "Negros Occ. (Kabankalan)", "type": "EC", "grid": "Visayas"},
    "Negros Oriental I Electric Cooperative, Inc.": {"lat": 9.8517, "lon": 123.1417, "acronym": "NORECO I", "prov": "Negros Or. (Bindoy)", "type": "EC", "grid": "Visayas"},
    "Negros Oriental I Electric Cooperative": {"lat": 9.8517, "lon": 123.1417, "acronym": "NORECO I", "prov": "Negros Or. (Bindoy)", "type": "EC", "grid": "Visayas"},
    "Negros Oriental II Electric Cooperative, Inc.": {"lat": 9.3069, "lon": 123.3056, "acronym": "NORECO II", "prov": "Negros Or. (Dumaguete)", "type": "EC", "grid": "Visayas"},
    "Negros Oriental II Electric Cooperative": {"lat": 9.3069, "lon": 123.3056, "acronym": "NORECO II", "prov": "Negros Or. (Dumaguete)", "type": "EC", "grid": "Visayas"},
    "Northern Negros Electric Cooperative, Inc.": {"lat": 10.9500, "lon": 123.1167, "acronym": "NONECO", "prov": "Negros Occ. (Manapla)", "type": "EC", "grid": "Visayas"},
    "Northern Negros Electric Cooperative": {"lat": 10.9500, "lon": 123.1167, "acronym": "NONECO", "prov": "Negros Occ. (Manapla)", "type": "EC", "grid": "Visayas"},
    "Northern Samar Electric Cooperative, Inc.": {"lat": 12.5000, "lon": 124.6333, "acronym": "NORSAMELCO", "prov": "Northern Samar (Catarman)", "type": "EC", "grid": "Visayas"},
    "Samar I Electric Cooperative, Inc.": {"lat": 12.0675, "lon": 124.5956, "acronym": "SAMELCO I", "prov": "Samar (Calbayog)", "type": "EC", "grid": "Visayas"},
    "Samar I Electric Cooperative Inc.": {"lat": 12.0675, "lon": 124.5956, "acronym": "SAMELCO I", "prov": "Samar (Calbayog)", "type": "EC", "grid": "Visayas"},
    "Samar II Electric Cooperative": {"lat": 11.7750, "lon": 124.8833, "acronym": "SAMELCO II", "prov": "Samar (Catbalogan)", "type": "EC", "grid": "Visayas"},
    "NGCP (Visayas)": {"lat": 10.4500, "lon": 124.0100, "acronym": "NGCP-Vis", "prov": "Visayas Bulk Transmission Grid", "type": "Transmission", "grid": "Visayas"},

    # Mindanao PDUs
    "Davao Light Power and Company": {"lat": 7.0731, "lon": 125.6128, "acronym": "DLPC", "prov": "Davao City & Panabo", "type": "PDU", "grid": "Mindanao"},
    "Davao Light and Power Company": {"lat": 7.0731, "lon": 125.6128, "acronym": "DLPC", "prov": "Davao City & Panabo", "type": "PDU", "grid": "Mindanao"},
    "Davao Light And Power Company": {"lat": 7.0731, "lon": 125.6128, "acronym": "DLPC", "prov": "Davao City & Panabo", "type": "PDU", "grid": "Mindanao"},
    "Cagayan Electric Power & Light Company, Inc.": {"lat": 8.4822, "lon": 124.6472, "acronym": "CEPALCO", "prov": "Misamis Oriental (CDO)", "type": "PDU", "grid": "Mindanao"},
    "Cagayan Electric Power & Light Co., Inc.": {"lat": 8.4822, "lon": 124.6472, "acronym": "CEPALCO", "prov": "Misamis Oriental (CDO)", "type": "PDU", "grid": "Mindanao"},
    "Cagayan Electric Power & Light Company": {"lat": 8.4822, "lon": 124.6472, "acronym": "CEPALCO", "prov": "Misamis Oriental (CDO)", "type": "PDU", "grid": "Mindanao"},
    "Iligan Light and Power, Inc.": {"lat": 8.2280, "lon": 124.2452, "acronym": "ILPI", "prov": "Lanao del Norte (Iligan)", "type": "PDU", "grid": "Mindanao"},
    "Iligan Light & Power, Inc.": {"lat": 8.2280, "lon": 124.2452, "acronym": "ILPI", "prov": "Lanao del Norte (Iligan)", "type": "PDU", "grid": "Mindanao"},
    "Cotabato Light and Power Company": {"lat": 7.2236, "lon": 124.2464, "acronym": "CLPC", "prov": "Maguindanao (Cotabato City)", "type": "PDU", "grid": "Mindanao"},
    "Cotabato Light And Power Company": {"lat": 7.2236, "lon": 124.2464, "acronym": "CLPC", "prov": "Maguindanao (Cotabato City)", "type": "PDU", "grid": "Mindanao"},

    # Mindanao ECs
    "Agusan del Norte Electric Cooperative, Inc.": {"lat": 8.9475, "lon": 125.5406, "acronym": "ANECO", "prov": "Agusan del Norte (Butuan)", "type": "EC", "grid": "Mindanao"},
    "Agusan Del Norte Electric Cooperative, Inc.": {"lat": 8.9475, "lon": 125.5406, "acronym": "ANECO", "prov": "Agusan del Norte (Butuan)", "type": "EC", "grid": "Mindanao"},
    "Agusan del Sur Electric Cooperative, Inc.": {"lat": 8.5083, "lon": 125.9806, "acronym": "ASELCO", "prov": "Agusan del Sur (San Francisco)", "type": "EC", "grid": "Mindanao"},
    "Bukidnon Second Electric Cooperative Inc.": {"lat": 8.1575, "lon": 125.1278, "acronym": "BUSECO", "prov": "Bukidnon (Malaybalay)", "type": "EC", "grid": "Mindanao"},
    "Bukidnon II Electric Cooperative, Inc.": {"lat": 8.1575, "lon": 125.1278, "acronym": "BUSECO", "prov": "Bukidnon (Malaybalay)", "type": "EC", "grid": "Mindanao"},
    "Cotabato Electric Cooperative, Inc.": {"lat": 7.0167, "lon": 125.0833, "acronym": "COTELCO", "prov": "Cotabato (Kidapawan)", "type": "EC", "grid": "Mindanao"},
    "Northern Davao Electric Cooperative, Inc.": {"lat": 7.4475, "lon": 125.8078, "acronym": "NORDECO", "prov": "Davao del Norte (Tagum)", "type": "EC", "grid": "Mindanao"},
    "Davao del Sur Electric Cooperative Inc.": {"lat": 6.7558, "lon": 125.3564, "acronym": "DASURECO", "prov": "Davao del Sur (Digos)", "type": "EC", "grid": "Mindanao"},
    "Davao del Sur Electric Cooperative, Inc.": {"lat": 6.7558, "lon": 125.3564, "acronym": "DASURECO", "prov": "Davao del Sur (Digos)", "type": "EC", "grid": "Mindanao"},
    "Davao del Sur Electric Cooperative": {"lat": 6.7558, "lon": 125.3564, "acronym": "DASURECO", "prov": "Davao del Sur (Digos)", "type": "EC", "grid": "Mindanao"},
    "First Bukidnon Electric Cooperative, Inc.": {"lat": 7.7611, "lon": 125.0069, "acronym": "FIBECO", "prov": "Bukidnon (Maramag)", "type": "EC", "grid": "Mindanao"},
    "Lanao Del Norte Electric Cooperative, Inc.": {"lat": 8.0556, "lon": 123.7917, "acronym": "LANECO", "prov": "Lanao del Norte (Tubod)", "type": "EC", "grid": "Mindanao"},
    "Misamis Occidental II Electric Cooperative, Inc.": {"lat": 8.1481, "lon": 123.8419, "acronym": "MOELCI II", "prov": "Misamis Occ. (Ozamiz)", "type": "EC", "grid": "Mindanao"},
    "Misamis Oriental-1 Rural Electric Service Cooperative, Inc.": {"lat": 8.5667, "lon": 124.4500, "acronym": "MORESCO I", "prov": "Misamis Or. (Laguindingan)", "type": "EC", "grid": "Mindanao"},
    "Misamis Oriental I Electric Cooperative, Inc.": {"lat": 8.5667, "lon": 124.4500, "acronym": "MORESCO I", "prov": "Misamis Or. (Laguindingan)", "type": "EC", "grid": "Mindanao"},
    "Misamis Oriental II Electric Service Cooperative, Inc.": {"lat": 8.9100, "lon": 125.0200, "acronym": "MORESCO II", "prov": "Misamis Or. (Medina)", "type": "EC", "grid": "Mindanao"},
    "Misamis Oriental II Electric Cooperative, Inc.": {"lat": 8.9100, "lon": 125.0200, "acronym": "MORESCO II", "prov": "Misamis Or. (Medina)", "type": "EC", "grid": "Mindanao"},
    "South Cotabato I Electric Cooperative, Inc.": {"lat": 6.5028, "lon": 124.8489, "acronym": "SOCOTECO I", "prov": "South Cotabato (Koronadal)", "type": "EC", "grid": "Mindanao"},
    "South Cotabato I Electric Cooperative": {"lat": 6.5028, "lon": 124.8489, "acronym": "SOCOTECO I", "prov": "South Cotabato (Koronadal)", "type": "EC", "grid": "Mindanao"},
    "South Cotabato II Electric Cooperative, Inc.": {"lat": 6.1164, "lon": 125.1717, "acronym": "SOCOTECO II", "prov": "South Cotabato (GenSan)", "type": "EC", "grid": "Mindanao"},
    "South Cotabato II Electric Cooperative": {"lat": 6.1164, "lon": 125.1717, "acronym": "SOCOTECO II", "prov": "South Cotabato (GenSan)", "type": "EC", "grid": "Mindanao"},
    "Surigao Del Norte Electric Cooperative, Inc.": {"lat": 9.7892, "lon": 125.4958, "acronym": "SURNECO", "prov": "Surigao del Norte (Surigao)", "type": "EC", "grid": "Mindanao"},
    "Surigao Del Sur I Electric Cooperative, Inc.": {"lat": 9.0833, "lon": 126.2000, "acronym": "SURSECO I", "prov": "Surigao del Sur (Tandag)", "type": "EC", "grid": "Mindanao"},
    "Zamboanga del Norte Electric Cooperative, Inc.": {"lat": 8.5833, "lon": 123.3417, "acronym": "ZANECO", "prov": "Zamboanga del Norte (Dipolog)", "type": "EC", "grid": "Mindanao"},
    "Zamboanga Del Norte Electric Cooperative, Inc.": {"lat": 8.5833, "lon": 123.3417, "acronym": "ZANECO", "prov": "Zamboanga del Norte (Dipolog)", "type": "EC", "grid": "Mindanao"},
    "Zamboanga City Electric Cooperative, Inc.": {"lat": 6.9103, "lon": 122.0739, "acronym": "ZAMCELCO", "prov": "Zamboanga City", "type": "EC", "grid": "Mindanao"},
    "Zamboanga del Sur I Electric Cooperative Inc.": {"lat": 7.8250, "lon": 123.4375, "acronym": "ZAMSURECO I", "prov": "Zamboanga del Sur (Pagadian)", "type": "EC", "grid": "Mindanao"},
    "NGCP (Mindanao)": {"lat": 8.5300, "lon": 124.7500, "acronym": "NGCP-Min", "prov": "Mindanao Bulk Transmission Grid", "type": "Transmission", "grid": "Mindanao"},
}

# 21 Legally and Topographically Exempt Off-Grid Missionary Island Utilities
OFFGRID_EXEMPT_DUS = [
    {"acronym": "PALECO", "name": "Palawan Electric Cooperative", "province": "Palawan (Mainland & Islands)", "grid": "Off-Grid Luzon", "reason": "Exempt under EPIRA Sec. 34 & DOE DC2018-07-0019 (Off-Grid Missionary SPUG Island; No WESM Physical/Commercial Interconnection)"},
    {"acronym": "ORMECO", "name": "Oriental Mindoro Electric Cooperative", "province": "Oriental Mindoro", "grid": "Off-Grid Luzon", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "OMECO", "name": "Occidental Mindoro Electric Cooperative", "province": "Occidental Mindoro", "grid": "Off-Grid Luzon", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "MASELCO", "name": "Masbate Electric Cooperative", "province": "Masbate Island", "grid": "Off-Grid Luzon", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "FICELCO", "name": "First Catanduanes Electric Cooperative", "province": "Catanduanes Island", "grid": "Off-Grid Luzon", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "MARELCO", "name": "Marinduque Electric Cooperative", "province": "Marinduque Island", "grid": "Off-Grid Luzon", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "TIELCO", "name": "Tablas Island Electric Cooperative", "province": "Romblon (Tablas Island)", "grid": "Off-Grid Luzon", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "ROMBLON", "name": "Romblon Electric Cooperative", "province": "Romblon Island", "grid": "Off-Grid Luzon", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "TISELCO", "name": "Ticao Island Electric Cooperative", "province": "Masbate (Ticao Island)", "grid": "Off-Grid Luzon", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "BATANELCO", "name": "Batanes Electric Cooperative", "province": "Batanes Islands", "grid": "Off-Grid Luzon", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "LUBELCO", "name": "Lubang Electric Cooperative", "province": "Occidental Mindoro (Lubang Island)", "grid": "Off-Grid Luzon", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "BANELCO", "name": "Bantayan Island Electric Cooperative", "province": "Cebu (Bantayan Island)", "grid": "Off-Grid Visayas", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "CAMELCO", "name": "Camiguin Electric Cooperative", "province": "Camiguin Island", "grid": "Off-Grid Mindanao", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "SIARELCO", "name": "Siargao Electric Cooperative", "province": "Surigao del Norte (Siargao Island)", "grid": "Off-Grid Mindanao", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "DIELCO", "name": "Dinagat Island Electric Cooperative", "province": "Dinagat Islands", "grid": "Off-Grid Mindanao", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "BASELCO", "name": "Basilan Electric Cooperative", "province": "Basilan (BARMM Island)", "grid": "Off-Grid Mindanao", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "SULECO", "name": "Sulu Electric Cooperative", "province": "Sulu (BARMM Island)", "grid": "Off-Grid Mindanao", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "TAWELCO", "name": "Tawi-Tawi Electric Cooperative", "province": "Tawi-Tawi (BARMM Island)", "grid": "Off-Grid Mindanao", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "CASELCO", "name": "Cagayan de Tawi-Tawi Electric Coop", "province": "Mapun Island (Tawi-Tawi)", "grid": "Off-Grid Mindanao", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "PROSIELCO", "name": "Province of Siquijor Electric Coop", "province": "Siquijor Island", "grid": "Off-Grid Visayas", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"},
    {"acronym": "BISELCO", "name": "Busuanga Island Electric Cooperative", "province": "Palawan (Coron/Busuanga)", "grid": "Off-Grid Luzon", "reason": "Exempt under EPIRA Sec. 34 (Off-Grid Missionary SPUG Island)"}
]

def normalize_name(raw):
    n = raw.strip()
    n = re.sub(r"\s+", " ", n)
    return n

canonical_dus = {}

def get_or_create_du(raw_name, fallback_grid="Luzon"):
    norm = normalize_name(raw_name)
    if norm in canonical_dus:
        return canonical_dus[norm]
    
    meta = COORDS.get(norm)
    if not meta:
        for k, v in COORDS.items():
            if norm.lower() == k.lower() or (len(norm) > 8 and (norm.lower() in k.lower() or k.lower() in norm.lower())):
                meta = v
                break
    
    if not meta:
        meta = {
            "lat": 14.5995 if fallback_grid == "Luzon" else (10.3157 if fallback_grid == "Visayas" else 7.0731),
            "lon": 120.9842 if fallback_grid == "Luzon" else (123.8854 if fallback_grid == "Visayas" else 125.6128),
            "acronym": norm[:10].upper(),
            "prov": f"{fallback_grid} Grid",
            "type": "DU",
            "grid": fallback_grid
        }
    
    acronym = meta.get("acronym", norm[:10].upper())
    
    for d in canonical_dus.values():
        if d["acronym"] == acronym:
            return d
            
    du_entry = {
        "id": acronym.lower().replace(" ", "-").replace("/", "-"),
        "name": norm,
        "acronym": acronym,
        "grid": meta.get("grid", fallback_grid),
        "province": meta.get("prov", "Philippines"),
        "type": meta.get("type", "DU"),
        "grid_connection_status": "On-Grid (WESM Commercial Operations)",
        "rcoa_geop_eligible": True,
        "lat": meta["lat"],
        "lon": meta["lon"],
        # Programs
        "crem_eus": 0,
        "crem_mw": 0.0,
        "crem_p1": 0,
        "crem_p2": 0,
        "crem_p3": 0,
        "crem_p4": 0,
        "geop_eus": 0,
        "geop_mw": 0.0,
        "rap_groups": 0,
        "rap_members": 0,
        "rap_mw": 0.0,
        # Captive eligible
        "captive_p1_eus": 0,
        "captive_p1_mw": 0.0,
        "captive_p2_eus": 0,
        "captive_p2_mw": 0.0,
        "captive_p3_eus": 0,
        "captive_p3_mw": 0.0,
        "captive_p4_eus": 0,
        "captive_p4_mw": 0.0,
        "captive_p5_eus": 0,
        "captive_p5_mw": 0.0,
        # Master ranking metrics
        "rank": master_du_info.get(acronym, {}).get("rank", "-"),
        "base_rate": master_du_info.get(acronym, {}).get("base_rate", "-"),
        "archetype": master_du_info.get(acronym, {}).get("archetype", "On-Grid Utility"),
        "top_suppliers": []
    }
    canonical_dus[norm] = du_entry
    return du_entry

# 1. Parse CREM (Lines 216 to 311)
grid = "Luzon"
for l in lines[215:312]:
    if not l.startswith("|") or "Col 1" in l or "---" in l or "GRAND TOTAL" in l.upper():
        continue
    parts = [p.strip() for p in l.split("|")[1:-1]]
    if len(parts) < 3: continue
    if "Network Service Provider" in parts[1] or "Network Service Provider" in parts[0]:
        if "Visayas" in l: grid = "Visayas"
        elif "Mindanao" in l: grid = "Mindanao"
        continue
    name = parts[1] if parts[0].isdigit() or parts[0] == "" else parts[0]
    if "TOTAL" in name.upper(): continue
    try:
        eus = int(parts[2].replace(",", ""))
        p1 = int(parts[3].replace(",", "")) if len(parts) > 3 else 0
        p2 = int(parts[4].replace(",", "")) if len(parts) > 4 else 0
        p3 = int(parts[5].replace(",", "")) if len(parts) > 5 else 0
        p4 = int(parts[6].replace(",", "")) if len(parts) > 6 else 0
        du = get_or_create_du(name, grid)
        du["crem_eus"] = eus
        du["crem_p1"] = p1
        du["crem_p2"] = p2
        du["crem_p3"] = p3
        du["crem_p4"] = p4
        est_mw = p1 * 2.87 + p2 * 0.85 + p3 * 0.77 + p4 * 0.27
        if du["acronym"] == "MERALCO": est_mw = 3560.0
        elif du["acronym"] == "VECO": est_mw = 316.5
        elif du["acronym"] == "CEPALCO": est_mw = 156.0
        du["crem_mw"] = round(est_mw, 2)
    except:
        pass

# 2. Parse GEOP (Lines 712 to 761)
grid = "Luzon"
for l in lines[711:762]:
    if not l.startswith("|") or "Col 1" in l or "---" in l or "GRAND TOTAL" in l.upper():
        continue
    parts = [p.strip() for p in l.split("|")[1:-1]]
    if len(parts) < 3: continue
    if "Network Service Provider" in parts[1] or "Network Service Provider" in parts[0]:
        if "Visayas" in l: grid = "Visayas"
        elif "Mindanao" in l: grid = "Mindanao"
        continue
    name = parts[1] if parts[0].isdigit() or parts[0] == "" else parts[0]
    if "TOTAL" in name.upper(): continue
    try:
        eus = int(parts[2].replace(",", ""))
        mw = float(parts[3].replace(",", ""))
        du = get_or_create_du(name, grid)
        du["geop_eus"] = eus
        du["geop_mw"] = mw
    except:
        pass

# 3. Parse RAP (Lines 794 to 814)
for l in lines[794:815]:
    if not l.startswith("|") or "Network Service Provider" in l or "---" in l or "TOTAL" in l.upper():
        continue
    parts = [p.strip() for p in l.split("|")[1:-1]]
    if len(parts) < 4: continue
    name = parts[1]
    try:
        groups = int(parts[2].replace(",", ""))
        mem_str = parts[3].replace(",", "").replace("-**", "0").replace("-", "0")
        members = int(mem_str) if mem_str.isdigit() else 0
        mw = float(parts[4].replace(",", ""))
        du = get_or_create_du(name, "Luzon")
        du["rap_groups"] = groups
        du["rap_members"] = members
        du["rap_mw"] = mw
    except:
        pass

# 4. Parse Phase 1 Captive (lines 344 to 420)
grid = "Luzon"
for l in lines[344:421]:
    if not l.startswith("|") or "Col 1" in l or "---" in l or "TOTAL" in l.upper():
        continue
    parts = [p.strip() for p in l.split("|")[1:-1]]
    if len(parts) < 3: continue
    if "Network Service Provider" in parts[1] or "Network Service Provider" in parts[0]:
        if "Visayas" in l: grid = "Visayas"
        elif "Mindanao" in l: grid = "Mindanao"
        continue
    name = parts[1] if parts[0].isdigit() or parts[0] == "" else parts[0]
    if "Distributors in Ecozone" in name: continue
    try:
        eus = int(parts[2].replace(",", ""))
        mw = float(parts[3].replace(",", ""))
        du = get_or_create_du(name, grid)
        du["captive_p1_eus"] = eus
        du["captive_p1_mw"] = mw
    except:
        pass

# 5. Parse Phase 2 Captive (lines 425 to 498)
grid = "Luzon"
for l in lines[425:499]:
    if not l.startswith("|") or "Col 1" in l or "---" in l or "TOTAL" in l.upper():
        continue
    parts = [p.strip() for p in l.split("|")[1:-1]]
    if len(parts) < 3: continue
    if "Network Service Provider" in parts[1] or "Network Service Provider" in parts[0]:
        if "Visayas" in l: grid = "Visayas"
        elif "Mindanao" in l: grid = "Mindanao"
        continue
    name = parts[1] if parts[0].isdigit() or parts[0] == "" else parts[0]
    if "Distributors in Ecozone" in name: continue
    try:
        eus = int(parts[2].replace(",", ""))
        mw = float(parts[3].replace(",", ""))
        du = get_or_create_du(name, grid)
        du["captive_p2_eus"] = eus
        du["captive_p2_mw"] = mw
    except:
        pass

# 6. Parse Phase 5 Potential (lines 859 to 927)
grid = "Luzon"
for l in lines[858:927]:
    if not l.startswith("|") or "50kW" in l or "---" in l or "TOTAL" in l.upper():
        continue
    parts = [p.strip() for p in l.split("|")[1:-1]]
    if len(parts) < 3: continue
    if "Network Service Provider" in parts[1] or "Network Service Provider" in parts[0]:
        if "Visayas" in l: grid = "Visayas"
        elif "Mindanao" in l: grid = "Mindanao"
        continue
    name = parts[1] if parts[0].isdigit() or parts[0] == "" else parts[0]
    if "Distributors in Ecozone" in name: continue
    try:
        eus = int(parts[2].replace(",", ""))
        mw = float(parts[3].replace(",", ""))
        du = get_or_create_du(name, grid)
        du["captive_p5_eus"] = eus
        du["captive_p5_mw"] = mw
    except:
        pass

# Assign top suppliers based on franchise
for du in canonical_dus.values():
    acronym = du["acronym"]
    grid = du["grid"]
    if acronym == "MERALCO":
        du["top_suppliers"] = [
            {"name": "MPower (Meralco LRES)", "share": "24.9%", "role": "Local RES"},
            {"name": "AdventEnergy (Aboitiz)", "share": "15.2%", "role": "Licensed RES"},
            {"name": "ACEN Corporation", "share": "12.4%", "role": "Licensed RES / GEOP"},
            {"name": "Vantage Energy", "share": "8.8%", "role": "Licensed RES"},
            {"name": "Bac-Man Geothermal", "share": "7.5%", "role": "Licensed RES"}
        ]
    elif acronym == "VECO":
        du["top_suppliers"] = [
            {"name": "Adventpower Inc. (Aboitiz)", "share": "38.5%", "role": "Licensed RES"},
            {"name": "Green Core Geothermal (EDC)", "share": "22.1%", "role": "Licensed RES"},
            {"name": "ACEN Corporation", "share": "14.2%", "role": "GEOP / RES"},
            {"name": "Prism Energy", "share": "8.4%", "role": "Licensed RES"}
        ]
    elif acronym == "CEPALCO":
        du["top_suppliers"] = [
            {"name": "Minergy RES", "share": "35.2%", "role": "Licensed RES"},
            {"name": "Alsons Power Supply", "share": "26.4%", "role": "Licensed RES"},
            {"name": "FDC Retail Electricity", "share": "18.1%", "role": "Licensed RES"}
        ]
    elif acronym == "DLPC":
        du["top_suppliers"] = [
            {"name": "Adventpower Inc. (Aboitiz)", "share": "45.0%", "role": "Licensed RES"},
            {"name": "Therma South (Aboitiz)", "share": "30.0%", "role": "Licensed RES"}
        ]
    elif acronym in ("AEC", "CEDC", "SFELAPCO"):
        du["top_suppliers"] = [
            {"name": "ACEN Corporation", "share": "32.0%", "role": "Licensed RES / GEOP"},
            {"name": "Adventpower Inc.", "share": "28.0%", "role": "Licensed RES"},
            {"name": "Limay Power Inc. (SMC)", "share": "20.0%", "role": "Licensed RES"}
        ]
    else:
        if grid == "Luzon":
            du["top_suppliers"] = [
                {"name": "ACEN Corporation", "share": "Lead Supplier", "role": "GEOP & CREM"},
                {"name": "Aboitiz Group", "share": "Market Leader", "role": "CREM RES"},
                {"name": "MPower / Vantage", "share": "Active RES", "role": "Local RES"}
            ]
        elif grid == "Visayas":
            du["top_suppliers"] = [
                {"name": "Aboitiz AdventPower", "share": "Lead Supplier", "role": "CREM RES"},
                {"name": "First Gen / EDC", "share": "Renewable Supplier", "role": "GEOP & CREM"},
                {"name": "ACEN Corporation", "share": "Active Supplier", "role": "GEOP"}
            ]
        else:
            du["top_suppliers"] = [
                {"name": "Aboitiz Group", "share": "Major Supplier", "role": "CREM RES"},
                {"name": "Alsons Power", "share": "Regional Supplier", "role": "CREM RES"},
                {"name": "Minergy RES", "share": "Active RES", "role": "CREM RES"}
            ]

# Filter duplicates so we have unique DUs by ID
unique_dus = {}
for du in canonical_dus.values():
    did = du["id"]
    if did not in unique_dus:
        unique_dus[did] = du
    else:
        existing = unique_dus[did]
        existing["crem_eus"] = max(existing["crem_eus"], du["crem_eus"])
        existing["crem_mw"] = max(existing["crem_mw"], du["crem_mw"])
        existing["geop_eus"] = max(existing["geop_eus"], du["geop_eus"])
        existing["geop_mw"] = max(existing["geop_mw"], du["geop_mw"])
        existing["rap_groups"] = max(existing["rap_groups"], du["rap_groups"])
        existing["rap_members"] = max(existing["rap_members"], du["rap_members"])
        existing["rap_mw"] = max(existing["rap_mw"], du["rap_mw"])
        existing["captive_p1_eus"] = max(existing["captive_p1_eus"], du["captive_p1_eus"])
        existing["captive_p1_mw"] = max(existing["captive_p1_mw"], du["captive_p1_mw"])
        existing["captive_p2_eus"] = max(existing["captive_p2_eus"], du["captive_p2_eus"])
        existing["captive_p2_mw"] = max(existing["captive_p2_mw"], du["captive_p2_mw"])
        existing["captive_p5_eus"] = max(existing["captive_p5_eus"], du["captive_p5_eus"])
        existing["captive_p5_mw"] = max(existing["captive_p5_mw"], du["captive_p5_mw"])

# Sort by active customer volume
dus_list = sorted(list(unique_dus.values()), key=lambda d: (d["crem_eus"] + d["geop_eus"] * 3), reverse=True)

for d in dus_list:
    tot_customer_choice = d["crem_eus"] + d["geop_eus"] + d["rap_groups"]
    tot_mw = round(d["crem_mw"] + d["geop_mw"] + d["rap_mw"], 2)
    captive_est = (d["captive_p1_eus"] + d["captive_p2_eus"] + d["captive_p3_eus"] + d["captive_p4_eus"])
    if captive_est == 0 and d["crem_eus"] > 0:
        captive_est = int(d["crem_eus"] * 4.65)
    d["total_active_choice_eus"] = tot_customer_choice
    d["total_active_choice_mw"] = tot_mw
    d["captive_eligible_eus"] = captive_est
    d["captive_p5_total_eus"] = d["captive_p5_eus"]
    denom = (tot_customer_choice + captive_est)
    d["switching_penetration_pct"] = round((tot_customer_choice / max(denom, 1)) * 100, 1)

national_summary = {
    "report_period": "August 2026",
    "report_reference": "MOS-CMD Memo MOS202600124319 (14 Oct 2026)",
    "grid_jurisdiction": "Strictly On-Grid (WESM Interconnected Transmission Grids)",
    "statutory_basis": "Republic Act No. 9136 (EPIRA) Section 31 & RA 9513 Section 9. Off-grid missionary SPUG island grids are legally and topographically exempt under EPIRA Sec. 34.",
    "crem": {
        "total_eus": 2692,
        "total_mw": 5080.70,
        "luzon_eus": 2268,
        "luzon_mw": 4178.18,
        "visayas_eus": 323,
        "visayas_mw": 552.34,
        "mindanao_eus": 101,
        "mindanao_mw": 350.19,
        "wap_php_kwh": 5.83,
        "phases": {
            "p1_1mw_above": {"eus": 1437, "mw": 4131.15},
            "p2_750_999kw": {"eus": 514, "mw": 436.66},
            "p3_500_749kw": {"eus": 623, "mw": 480.53},
            "p4_100_499kw": {"eus": 118, "mw": 32.36}
        }
    },
    "geop": {
        "total_eus": 985,
        "total_mw": 303.52,
        "luzon_eus": 857,
        "luzon_mw": 260.23,
        "visayas_eus": 105,
        "visayas_mw": 37.28,
        "mindanao_eus": 23,
        "mindanao_mw": 6.01,
        "wap_php_kwh": 6.12,
        "top_supplier": "ACEN Corporation (508 EUs · 155.67 MW)",
        "top_du": "MERALCO (808 EUs · 242.79 MW)"
    },
    "rap": {
        "total_groups": 311,
        "total_members": 4997,
        "total_mw": 250.01,
        "luzon_groups": 298,
        "visayas_groups": 11,
        "mindanao_groups": 2,
        "wap_php_kwh": 5.84,
        "lead_aggregator": "EvoEnergi (78 Groups · 47.37 MW)",
        "lead_members_aggregator": "ACEN (1,488 Members)"
    },
    "captive_pipeline": {
        "total_eligible_phases_1_4": 12520,
        "demand_phases_1_4_mw": 3674.10,
        "phase_5_potential_50_99kw": 11661,
        "phase_5_demand_mw": 826.28
    },
    "offgrid_exempt_summary": {
        "total_exempt_dus": len(OFFGRID_EXEMPT_DUS),
        "legal_basis": "EPIRA Section 34 / SPUG Missionary Exemption",
        "description": "21 island utilities operate isolated missionary micro-grids with no physical/commercial link to WESM. RCOA and GEOP cannot be implemented until physical grid interconnection is achieved.",
        "list": OFFGRID_EXEMPT_DUS
    },
    "res_market_share": [
        {"group": "Aboitiz Group", "eus": 529, "mw": 1311.31, "share_pct": 25.81, "color": "#005691"},
        {"group": "MERALCO Group", "eus": 800, "mw": 1270.52, "share_pct": 25.01, "color": "#F37021"},
        {"group": "San Miguel Group", "eus": 174, "mw": 721.80, "share_pct": 14.21, "color": "#002F6C"},
        {"group": "First Gen Group", "eus": 314, "mw": 452.09, "share_pct": 8.90, "color": "#008852"},
        {"group": "Ayala Group (ACEN)", "eus": 298, "mw": 412.61, "share_pct": 8.12, "color": "#9B111E"},
        {"group": "Marubeni Group", "eus": 56, "mw": 102.77, "share_pct": 2.02, "color": "#C41230"},
        {"group": "Citicore Group", "eus": 49, "mw": 58.54, "share_pct": 1.15, "color": "#80B71E"},
        {"group": "Alsons Power Group", "eus": 6, "mw": 51.30, "share_pct": 1.01, "color": "#336699"},
        {"group": "Other Independent RES", "eus": 466, "mw": 699.76, "share_pct": 13.77, "color": "#6c757d"}
    ],
    "geop_re_suppliers": [
        {"supplier": "ACEN Corporation", "eus": 508, "mw": 155.67, "share_pct": 51.58},
        {"supplier": "Shell Energy Philippines", "eus": 119, "mw": 43.14, "share_pct": 12.08},
        {"supplier": "Corenergy Inc.", "eus": 94, "mw": 15.02, "share_pct": 9.54},
        {"supplier": "Citicore Solar Rooftop", "eus": 88, "mw": 13.51, "share_pct": 8.93},
        {"supplier": "Bac-Man Geothermal (EDC)", "eus": 62, "mw": 16.20, "share_pct": 6.29},
        {"supplier": "DirectPower Services", "eus": 48, "mw": 27.80, "share_pct": 4.87},
        {"supplier": "AdventEnergy (Aboitiz)", "eus": 34, "mw": 17.65, "share_pct": 3.45},
        {"supplier": "Others (7 Suppliers)", "eus": 32, "mw": 14.45, "share_pct": 3.25}
    ]
}

final_output = {
    "summary": national_summary,
    "dus": dus_list,
    "offgrid_exempt": OFFGRID_EXEMPT_DUS
}

out_dir = "/Users/franzxyrloi.tobias/Desktop/github/brute force/App_Retailmarket"
json_path = os.path.join(out_dir, "data.json")
js_path = os.path.join(out_dir, "data.js")

with open(json_path, "w") as f:
    json.dump(final_output, f, indent=2)

with open(js_path, "w") as f:
    f.write("// Retail Market & GEOP Customers per Distribution Utility (August 2026 MOS-CMD Data)\n")
    f.write("// Strictly On-Grid (WESM-Connected) Networks under EPIRA Sec. 31 & RA 9513 Sec. 9\n")
    f.write("window.RETAIL_MARKET_DATA = ")
    json.dump(final_output, f, indent=2)
    f.write(";\n")

print(f"Successfully compiled on-grid dataset with {len(dus_list)} on-grid DUs and {len(OFFGRID_EXEMPT_DUS)} off-grid exempt utilities!")
