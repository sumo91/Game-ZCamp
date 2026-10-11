# #5 phone-entry public UI review summary

Date: 2026-10-10. Fixed base: `ff3cd40d2548f23d0b554f51b8745ec55773de9b`; reviewed source: `6d1a168d86fe2ff0b19dc448917e236309a6739e`; integration merge: `7be09fcc8b75c1875e0220a14a4c77cdca4f2ac3`.

This is the root coordinator's independent desktop public UX review, summarized from the local report and statistics/byte audit. It is not iQOO or physical-phone performance acceptance. The merger read existing evidence only and did not operate the browser, existing services, devices, clock or pressure scene.

The actual public phone-entry screen displayed the supplied physical-phone/iQOO preset with the exact Android version still unverified, the three real rounds (100/60 seconds, 200/300 seconds, 300/60 seconds), connected receiver and ready scene, enabled Start, and collapsed advanced controls. For desktop QA, the operator corrected the public advanced declaration to the actual desktop/model/OS and non-iQOO status before starting. A preset remains a declaration, not proof of device identity.

One public Start collapsed advanced settings. Round 1 ran for its actual requested 60 seconds with a real response click. A durable receipt then advanced to round 2. The operator used public Stop during round 2; the screen retained round 1 received, round 2 interrupted and received, and round 3 not started. It did not silently continue. Original stop screenshot SHA and two-round measurements are in [the public audit summary](./public-audit-summary.json); the screenshot and raw results remain local.

| Round | Units / requested seconds | Outcome | Actual sampled seconds / samples | median / P95 / max ms | Responses |
| --- | --- | --- | --- | --- | --- |
| 1 | 100 / 60 | completed | 60.0003 / 8637 | 6.9 / 7 / 20.9 | 1 |
| 2 | 200 / 300 | interrupted: manual-stop | 63.2087 / 9100 | 6.9 / 7 / 14 | 0 |

All original frame intervals remain local. The root audit recalculated the full arrays, counts, actual sampling duration, median/P95/max, desktop declaration, false owner/physical acceptance and fixed collector build SHA. The merger independently rechecked these existing raw values and their SHA/bytes while generating the allowlisted public summary. This is the single-skeleton presentation experiment with core combat absent; it does not replace mixed-asset or core continuous-attack capacity acceptance.

The first supported DOM read was truncated to 200000 characters; its failed local saved read is retained and is not successful complete-data evidence. A subsequent read assembled three segments of at most 100000 characters from the actual public textarea. The complete second-round client UTF-8 bytes match the durable server result exactly: 252389 bytes, SHA256 `819311b42f1a2961b44960833b2743ef89293dad424bce74126a4d2644d695de`. The backup download-event capture timed out; backup download was not verified and is not claimed as passed. Durable automatic collection was verified separately.

The local originals contain private resource timing URLs. No raw JSON, screenshot, QR, private address, actual session token, user-local absolute path or private session metadata is included in this directory. The public JSON was generated from explicitly selected hashes, numeric measurements and scope/outcome fields.

The root later verified a fresh ready quick-entry page at 360×800 in desktop IAB: declared model and unverified Android version, three rounds, receiver connection, a 56 CSS-pixel Start button, touch-response control, loading-ready state and rendered model were actually visible. The original local screenshot SHA256 is `1ea78eeaa67a8244333a7cbed74a2c2410386f8ed6ad1b3958d6b06b36bcb18e` (62606 bytes); only its hash is published. The temporary viewport was reset. This desktop mobile-size layout observation is not physical-phone evidence.

Supported-tool limitations remain in the local report. No physical phone, Vivo interaction, ADB input, network/firewall change, phone scan or full phone three-round performance was performed in this desktop review. #5 stays OPEN. Actual physical-phone evidence, supplementary 雷电 measurements, owner acceptance, formal budgets/group scheme and accepted Art/UI Bible revisions remain pending; #6–9 stay gated.
