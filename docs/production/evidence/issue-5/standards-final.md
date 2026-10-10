## Standards

Reviewed the complete fixed diff `git diff 0bf8227a4979f84d5dc23e71bddabbdfeb7a8ce2...5252f732e0dc2fd377af5ccf774991b3841d4577` (commits `d26b800`, `5252f73`) against the previously read AGENTS/TEAM/domain instructions, README, Art/UI Bibles, asset README, controlling Three.js specification and delivery plan. No CONTRIBUTING/CODING_STANDARDS file exists. Repository overrides apply; tooling-enforced rules were excluded.

**Documented-standard breaches: none found within the companion-candidate scope.** Core simulation and formal content/assets remain untouched; browser and renderer work stays at the boundary. Ownership, independent skeleton/mixer instances, static batching and deployment-relative loading follow the documented integration contracts.

**Prior heuristic resolved:** `src/three/AssetPressureField.ts` removes `configure()`'s repeated DPR expression. `configure()` records quality and calls `resize()`, which is now the single setter. No remaining actionable Fowler-baseline smell found; independent Python recalculation deliberately remains separate from application statistics.

**Prior input follow-up resolved at the documented desktop scope:** `src/three/pressure.css:1,13` uses `#app.pressure-app` for the scroll-container rule and explicitly sets lab canvas `touch-action: pan-y`. This defeats global `#app` overflow specificity and the canvas `none` rule. The saved before/after records show `overflowY: auto`, container/canvas `pan-y`, and actual scrolling from 0 to 640 with configuration entering view; the playable scene retains its original input rule. This supplies the relevant verification required by AGENTS.md and Art Bible §16.2 without claiming physical touch acceptance.

**Evidence integrity and gates:** All 34 imported root artifacts match their recorded SHA256 and byte lengths, and their unfiltered Git blobs match the final commit. Scoped `.gitattributes` preserves original line endings. Long measurements retain `d26b800` identity; repaired-build smoke evidence is separate. Zero-response, slower and interrupted rounds remain preserved. Candidate documents retain the DELIVERY_PLAN requirements for physical-device/owner acceptance, formal budgets and Bible acceptance; #5 remains open and #6–#9 expansion remains gated.

Totals: **0 documented breaches; 0 remaining heuristic findings.** Standards review only: no browser operations, build/test or long-measurement reruns, repository edits, publishing or issue closure.
