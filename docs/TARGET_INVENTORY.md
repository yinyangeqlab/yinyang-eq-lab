# Live target inventory — October 17, 2026

The live listening pool contains **41 approved target names** at this checkpoint. This file documents the names and category rules only. No sampled response points, target TXT/CSV files, presets, seeds, or target database exports are included in this source release. A listed name does not grant redistribution rights to its numerical curve.

Curves are normalized to 0 dB at 1 kHz by the working application. IE means in-ear; OE means over-ear. “Both” records the app's pool eligibility, not a claim that a curve works with every measurement rig.

For future additions, require a clear license covering redistribution of the actual curve data. A graph viewer's software license or a publicly downloadable file is insufficient by itself. The earlier 35-target pool has not received a complete license audit; do not infer clearance from its presence on the live site.

## Earlier pool

| Target | Creator or source credit | Pool |
| --- | --- | --- |
| PEQdB Diamond β | PEQdB | Both |
| YinYang EQ Preference Target I | Yin Yang EQ Lab | Both |
| YinYang EQ Preference Target II | Yin Yang EQ Lab | Both |
| YinYang EQ Preference Target II (rev. 2) | Yin Yang EQ Lab | Both |
| Diffuse Field | Headphone Filters library | Both |
| Endgame IE | Headphone Filters library | IE |
| Harman IE 2019 | Headphone Filters library | IE |
| Harman OE 2013 | Headphone Filters library | OE |
| Harman OE 2018 Linear Bass | Headphone Filters library | OE |
| Harman OE 2018 | Headphone Filters library | OE |
| HiFiEndgame MKII | Headphone Filters library | Both |
| HiFiEndgame MKIII | Headphone Filters library | Both |
| HiFiEndgame | Headphone Filters library | Both |
| IEF Preference 2025 | Headphone Filters library | Both |
| KEMAR KB50xx -10dB Tilt | Headphone Filters library | Both |
| Knowles | Headphone Filters library | Both |
| Moondrop VDSF | Headphone Filters library | Both |
| PEQdB HiFi | Headphone Filters library | Both |
| PEQdB Ultra | Headphone Filters library | Both |
| ∆ Harman MoA 2025 | Headphone Filters library | Both |
| ∆ JM-1 -10dB Tilt | Headphone Filters library | Both |
| PEQdB Nirvana | PEQdB | Both |

## SEAP additions

[Tryptify source library](https://github.com/tryptz/Tryptify/tree/116bd40a73208400d96166560d90c57da22afe46/app/src/main/assets/autoeq/targets). SEAP and SEAP Bass Boost each supply one curve shared across both categories, not separate IE/OE versions.

| Target | Creator or source credit | Pool |
| --- | --- | --- |
| SEAP | SEAP (via Tryptify) | Both |
| SEAP Bass Boost | SEAP (via Tryptify) | Both |

## Expanded target additions

Sources: [AutoEq target library](https://github.com/jaakkopasanen/AutoEq/tree/master/targets) and Tryptify above. Rig-specific target descriptions identify the JM-1/5128 basis; the app does not automatically enforce rig compatibility.

| Target | Creator or source credit | Pool |
| --- | --- | --- |
| AutoEq in-ear | AutoEq target library | IE |
| oratory1990 in-ear | AutoEq target library | IE |
| Harman in-ear 2016 | AutoEq target library | IE |
| Harman in-ear 2017-1 | AutoEq target library | IE |
| Harman in-ear 2017-2 | AutoEq target library | IE |
| oratory1990 optimum hifi over-ear | AutoEq target library | OE |
| Harman over-ear 2015 | AutoEq target library | OE |
| JM-1 with Harman filters | AutoEq target library | Both |
| LMG 5128 0.6 | AutoEq target library | Both |
| Diffuse field 5128 -1dB per octave | AutoEq target library | Both |
| HiFiEndgame 2026 | Tryptify target library | Both |

## Explicitly licensed experimental additions

[MrChillStorm source repository](https://github.com/MrChillStorm/Headphone_Target/tree/447d959aa8b363993ac2abdf1dfa264dc2037bdd) publishes these under MIT. The working import retains its copyright/license notice and source provenance. These are experimental 85-phon designs; their names imply neither calibrated playback nor independently validated superiority. No curve values are distributed here.

| Target | Creator or source credit | Pool |
| --- | --- | --- |
| MrChillStorm ISO 226 85 phon 0.00 | MrChillStorm | Both |
| MrChillStorm ISO 226 85 phon 0.25 | MrChillStorm | Both |
| MrChillStorm ISO 226 85 phon 0.3661543 | MrChillStorm | Both |
| MrChillStorm ISO 226 85 phon 0.50 | MrChillStorm | Both |
| MrChillStorm ISO 226 85 phon 0.75 | MrChillStorm | Both |
| MrChillStorm ISO 226 85 phon 1.00 | MrChillStorm | Both |

## Candidates withheld

An initial 37-curve batch was staged but its publish was interrupted. A fresh live database read confirmed none had been added. The owner then required explicit redistribution licenses. Thirty-one unclear-license candidates were removed from the staged catalog; only the six MIT curves above were published. Antdroid/Bassdroid variants, Harpo variants, Morty Bass, Rickdiculous Bass, AX, EJ, Kurin, Coda, markanini, Normative, Comfy, Srg0mes, RikudouGoku, Toranku, and VitorMach variants remain withheld. No creators were contacted.

SenseLab/Aizu research files were not imported: their CSV represents graphic-EQ band gains rather than confirmed absolute target responses. VitorMach's original smoothed export was not reconstructed from its keypoints recipe.
