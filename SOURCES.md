# Sources for every figure on the site

## Our data (public/data/stats.json, copied from the analysis site, generated 2026-11-07)
| On-screen figure | Value | Source |
|---|---|---|
| Mapped mangrove area 1996 / 2007 / 2010 / 2020 | 183.56 / 156.77 / 146.06 / 140.78 km² | Global Mangrove Watch v3, area computed by CoastLens at 25 m in the box 67.2–67.8°E, 23.8–24.3°N |
| Loss / gain / stable 1996→2020 | 51.19 / 8.41 / 132.37 km² | GMW v3 map differencing (includes mapping error) |
| "−23%" (home), "42.8 km² (23.3%)" (insights) | derived: (183.56−140.78)/183.56 | computed in page |
| NDVI inside mangroves | 0.320, 0.361, 0.390, 0.374 | Landsat 8 C2 L2, Nov–Feb medians |
| Sentinel-1 VH | −14.94, −14.96 dB | Sentinel-1 GRD, Nov–Feb medians |
| NISAR echo bars (NISAR page) | water −25.33, land −19.29, mangrove −14.63 dB | NISAR L2 GCOV, track 164, pass of 2026-10-11 |
| NISAR passes | 27 passes, 2025-11-21 to 2026-10-11, one flagged (2026-04-14) | NISAR track 164 |
| Coherence ranges | computed in page from the coherence series | NISAR L2 GUNW, track 164 |
| Five flags | see `flags` in stats.json | places.geojson on the analysis site |

## Outside figures (not our measurements)
| Figure | Source | Status |
|---|---|---|
| Global mangrove area 152,604 → 147,359 km² (−3.4%), 1996–2020 | Bunting et al. 2022, Global Mangrove Watch v3 | Check against the paper before final submission |
| Indus Delta 50,973 ha (1990) → 101,446 ha (2023) | Ahmed et al. 2025, Ecological Indicators, "Substantial rehabilitation of mangrove forests along the Indus Delta coastline of Pakistan: A 33-year review" | Taken from the abstract. Read the paper |
| Kharo Chan: 28 of 42 dehs lost to the sea | The News on Sunday, "The sea has grown closer" | News report. Find the primary source or soften the line |
| NISAR launch 30 Jul 2025, 747 km orbit, 12 m antenna, 12-day repeat, L-band ≈ 24 cm, S-band ≈ 9 cm | NASA / ISRO mission pages | Check against science.nasa.gov/mission/nisar |

## Statements without a number that still need a citation
- Mangroves as nursery habitat, wave buffer and carbon store (home page). Add a reference (for example IUCN or FAO) on the About page.
- The four mangrove facts on the home page 3D tree (stilt roots with breathing pores, salt sent to older leaves, hanging seedling pods, root nursery) describe the red / stilt-root mangrove, *Rhizophora*, which is what the 3D model shows. Have a botanist or NGO contact confirm. (The NISAR page's radar tree is still the grey mangrove, *Avicennia marina*.)

## 3D model
- Home page tree: "red-mangrove-tree" by SAVIA_Colombia (Sketchfab, https://sketchfab.com/3d-models/red-mangrove-tree-e806105d83bc440499495e62bb010f7a), licensed CC BY 4.0. Shown unmodified through the Sketchfab Viewer API; the info dots are ours.

## Illustrations (not data)
Clouds, the NISAR page's 3D tree, the radar wave animations, the orbit drawing, and the S-band view.
