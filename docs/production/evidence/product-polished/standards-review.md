## Standards

Fixed technical ranges: `c3310f8c085edb21078cc03c7af51ed43636c319...d2fcc75d1c39fc8460884ea60baa8c6ae14f7ed8` (A, siege feedback); `c3310f8c085edb21078cc03c7af51ed43636c319...77616d125728191f73418dc309f72b301efe155b` (B, source refinement). Additional evidence range: `77616d125728191f73418dc309f72b301efe155b...191273cff438e54461fa0e7b491a0df0aaa1056a`; final evidence SHA is separate from technical SHA 77616d1.

**Documented breaches: 0.** Reviewed against AGENTS.md, TEAM_PROTOCOL, domain/issue-tracker guidance, Art Bible Three.js precedence, and art/threejs/README.md saved-source, runtime-surface, root/anchor, PBR and rig contracts.

A: `src/three/siegeFeedback.ts` retains event endpoints, immediate settlement feedback and effective simulation delta. New rim geometry/material are released by owner disposal (115–118); cloned trail/ring/burst materials are released on expiration/reset (89, 108). Three sparks share one shot-owned clone (149–162). Fade settings affect presentation only; no core, targeting, quality suppression or asset ownership changes.

B: `art/threejs/refine_product_sources.py` opens saved sources and checks revision before edits (388–394), limits stems to eight unique entries (443), and saves only after semantic/rig/footprint checks (417–437). It edits retained modules, derives runtime UV/PBR through the existing mechanical helper, and leaves factory/export decisions separate. Revision guards make repeated application a no-op; recorded rerun hashes corroborate this without rerunning Blender here.

Independent read-only Git-byte analysis confirmed exactly eight changed blends and eight GLBs, all 50 files for the other 25 assets unchanged, eight before/after manifest hashes and sizes correct, and all 12 runtime metadata hashes correct. Direct GLB parsing confirmed unchanged roots/anchors, building footprint/grounding, one material/primitive with two embedded PNGs, shared ORM/AO, and skeleton fourteen joint transforms, inverse binds and complete four animation streams unchanged; all skin vertices remain weighted.

**Fowler heuristics: 0 material findings across the supplied twelve smells.** No cosmetic refactor requested; tooling-enforced checks excluded.

Evidence SHA 191273c adds only ten documentation/evidence files. Four inspected screenshots show actual game HUD/three building tiers; pause JSON preserves all actor/arcane state through standard→low→standard. Different waves preclude an identical-state visual comparison. Records explicitly disclose arcane fixture conditions and 15 living plus one dying actor, so they support neither 25 mixed-unit nor formal campaign/device performance acceptance.

Risk/validation boundary: author reports existing 169+4 checks, build and asset validation passing; this review ran no long tests. Integrated visual acceptance and owner/physical-phone acceptance remain separate.
