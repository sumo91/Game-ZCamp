# Product battle visibility fix — 2026-10-11

ZCamp development task, delivered to root producer for actual CUA visual review.

Candidate: `475e2e0536b78fb13daa6353712b46b773d0611a`, retained on independent branch `codex/threejs-product-visuals` in the existing assigned worktree, based on normally merged/fast-forwarded integration `ac4a6f8`. Branch created without rewriting history or creating another worktree. Clean working tree. Commit changes 5 files, 55 additions / 16 deletions. No core content, damage, targeting, enemy counts, assets, tracker, push, deployment, phone service, or collection infrastructure changes. Further code changes are frozen pending root's short visual check and independent two-axis review.

Frozen external build: `C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation/product-effects-fix-dist`. New static preview on port 5344 explicitly serves that directory (session 74785). Existing 5332/5333 player pages, 4194/4195 phone services and previous frozen dist directories were untouched.

- Normal complete game: http://127.0.0.1:5344/Game-ZCamp/
- Existing short mixed scene: http://127.0.0.1:5344/Game-ZCamp/?dev=pressure&count=100&quality=standard&seconds=15

## Diagnosis and resulting visible behavior

Root supplied `product-final-mixed-effects.jpg` and `.json`: 100 active models, 101 animation mixers, all ordinary models described as hit, 437 total effects and 6 arcane effects. The screenshot visibly resembled a flat white row at the wall. This observation did not establish a broken rig.

A temporary CPU geometry probe exercised the public ModelLibrary and Battlefield render boundary with actual formal GLB nodes, skin weights, clips and real BattleSession events. Its 52 seconds of simulation were advanced in about 3 seconds of CLI execution, not a real-time browser/GPU performance run. Texture decoding was omitted, and the WebGL output adapter was replaced only to inspect scene geometry. Sampled precise posed-skin heights for walker/runner/tank/armored/brute were 1.3679 / 1.2883 / 1.4648 / 1.6465 / 1.8924 m; hit-anchor heights were 0.9144 / 0.8532 / 0.9698 / 0.9373 / 1.2541 m. Actor positions were finite and consistent with the existing projection. This ruled against changing or re-exporting all rigs on the available CPU evidence. The temporary probe was removed; no rendering-test platform was retained. It used level-1 pressure towers, rather than claiming to reproduce the root's level-2 burning cannon screenshot exactly.

The confirmed presentation problem was that all same-type wall attackers converged to the same z depth. Many large pale opaque hit spheres overlapped them. The existing burn cones were placed at x ±0.1 / z 0 around the hit anchor, inside the body. Lightning had only a 0.036 m diameter and cannonballs were dark against the battlefield.

The fix gives ordinary/elite arrivals five stable depth ranks based solely on the existing deterministic display hash. The offset grows continuously over the final 35% of display progress; ground y stays zero. All 100/200/300 actors remain. Core movement and target ordering remain identical. Boss positions and timer-driven ability lanes retain their previous projection. Every actor, slow marker, event fallback and real hit anchor uses the same enemyDisplayPosition function. Event anchor sampling now translates the existing world-space pose to the event's display position instead of temporarily moving the actor and rewriting its skin world matrices.

Living hits use a smaller transparent orange outline facing the game camera, retaining visible silhouettes. Death feedback retains its prior geometry and duration. Flames move to the +Z front of the skin and grow slightly; ballista bolts and chain lightning grow slightly thicker, and cannonballs use a bright bronze color. These changes are visual only. They do not create damage or change animation/core timers. Standard and 流畅 share these effects and crowd projection.

## Validation and review status

Red: `npm test -- --reporter=dot tests/three/coordinates.test.ts` failed because 100 same-type wall attackers occupied one depth, while the expected visible formation requires at least five.

Green: the two public coordinate behavior tests pass, covering stable ranks, grounding, wall/camera boundaries, continuous approach and unchanged Boss ability lanes. One full `npm run check` passed: type checking, 169 Vitest tests, and 4 existing collector tests. One `npm run build` passed. Debug probes and instrumentation were removed.

The developer's CUA inventory returned no available browsers/apps during this task. Root's CUA remains available and will perform the final short static-page screenshot/operation check. This handoff does not claim visual acceptance, real GPU equivalence to the CPU probe, or renewed performance acceptance for the changed graphics. Existing desktop pressure reports remain evidence for their recorded earlier candidate. No new long measurements were run.

Suggested root short review: open the mixed scene, select row 1 / column 3 cannon, legally upgrade to level 2 and choose burning; allow real attacks, pause through the actual button, inspect all 100 active models, several depth ranks, flames at the body front, chain paths and bright projectiles. Switch to 流畅 through the normal quality button and check that the units and feedback remain. A normal full-game build/operation should also show the same projection and effects.
