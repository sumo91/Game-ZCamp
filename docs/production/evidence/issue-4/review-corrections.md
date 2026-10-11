# Issue #4 fixed-review corrections

Date: 2026-10-10. Role: ZCamp development. Worktree: `C:/Users/Admin/.codex/worktrees/threejs-issue-4/ZCamp`.

Started clean at `3f16e2b90bab2c813de749b0b57eca0e0daf16d1`; integration baseline `d292a3fa3b493bf6e166063336c44721ca19d002` was already an ancestor. The root integration checkout was untouched.

## Fixed findings

The initial reports remain unchanged and separate: `issue4-standards-final.md` records one low-priority documented structural breach and one non-blocking Duplicated Code heuristic; `issue4-spec-final.md` records one P2 content/model catalog requirement. This delivery implements the corrections; final two-axis review is pending on the new commit.

- `assetCatalog.ts` now owns the typed `walker → skeleton` association. All uncovered enemy IDs return null and continue through the existing development geometry. The catalog also centralizes existing building tier references, with unchanged real-level tiers and fixed main-city appearance.
- `ModelLibrary.load` calls catalog validation before its first GLB request. Every declared building/enemy model reference must exist in `SAMPLE_ASSETS`; covered enemy IDs must exist in the real content catalog. Other enemies are explicitly outside the finished sample and do not block loading. No gameplay values or new content were copied into the presentation catalog.
- `Battlefield.makeEnemy` consumes the catalog result and contains no walker/skeleton asset branch.
- `runtime_surface.py` extracts only the repeated copy/convert/join/apply-transform/UV steps. The creator still decides which source to create; the refiner still decides which saved-source revisions, AO/atlas work and saving to perform. No formal source was opened, reconstructed, saved or exported during this correction.
- README explains the mechanical helper; total #4 evidence records the initial findings, corrections, verification and service cleanup without claiming final review acceptance.

## Verification

`npm run check`: exit 0, TypeScript passed, 15 files / 125 tests passed. `npm run build`: exit 0; only the existing large-bundle notice.

Python AST parsing passed for `runtime_surface.py`, `create_sample_sources.py`, and `refine_sources.py`. The external `issue4-review-surface-probe.py` ran in Blender 5.2.1 LTS against newly created in-memory parts only. Both list and generator inputs matched the frozen pre-refactor mechanical pipeline exactly: 48 vertices, 52 polygons, 192 UV loops, material order and vertex groups preserved, original mesh data/world transforms/modifiers unchanged. The probe did not save or export anything.

Browser: hidden IAB tab 1, Windows Chrome 155, observed DPR 1.5; default viewport, no override. Asset ready; real pause at step 759 and three accepted Lv.1 arrow-tower build commands spent 120 wood. Formal `walker-10` through `walker-13` showed independent walk clips. Resume advanced naturally to wave 2; step 2784 paused a frame containing live `walker-56/57` on walk and death-retained `runner-55` on development with no mixer. The page still labeled other enemies as development placeholders. No core injection, clock acceleration, or Lv.1→5 rerun occurred. Console warnings/errors: empty.

Smoke artifacts, all beside this report:

- `issue4-review-walker.json` / `.jpg`
- `issue4-review-mixed-enemies.json` / `.jpg` (runner is death-retained; do not describe this as an active-runner pose)
- `issue4-review-surface-probe.py`
- `issue4-review-assets-before.json`
- `issue4-review-service.json`

## Asset integrity and cleanup

All 24 production SHA checks passed: 12 `.blend` and 12 public GLB are byte-identical to the pre-correction snapshot and existing asset manifest. All 12 built GLB copies match public. No historical format/source audit was rewritten. No dependencies, core rules, role table, or frozen gameplay changed. No push, merge, or Issue operation was performed.

Before startup, both 5184 and 4190 had no listener. Owned dev session 65838 launched the worktree Vite process PID 15420 on 5184. After smoke the created tab 1 was closed; PID was stopped only after its exact recorded command line matched, session exited, and 5184 had no listener. No viewport override was set, so no temporary override remains. No user service or native app was touched.

#5/#13 owner, physical-device, long-lifecycle and performance acceptance remain unmet. The user's physical phone/雷电 follow-up is separate from this desktop smoke.

Committed on `codex/threejs-issue-4`: `58b5b33062c346a8ff5d7697509969eefeba32e4` — `fix: centralize sample asset coverage and mesh pipeline (#4)`.

`git diff --check d292a3fa3b493bf6e166063336c44721ca19d002` passed for the complete staged delivery before commit. `git diff --check d292a3fa3b493bf6e166063336c44721ca19d002...58b5b33062c346a8ff5d7697509969eefeba32e4` passed after commit. Working tree is clean. The correction commit contains 8 files (87 insertions, 41 deletions); production assets and historical audit outputs have no diff from the initial reviewed SHA.
