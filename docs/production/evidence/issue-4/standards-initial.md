## Standards

Base: `d292a3fa3b493bf6e166063336c44721ca19d002`<br>
Head: `3f16e2b90bab2c813de749b0b57eca0e0daf16d1`<br>
Diff: `git diff d292a3fa3b493bf6e166063336c44721ca19d002...3f16e2b90bab2c813de749b0b57eca0e0daf16d1`<br>
Commit: `3f16e2b feat: add original GLB art sample with event-driven animation`

1. **Documented standard, low priority: move the enemy-to-model association into the presentation catalog.** `docs/specs/ZCamp-Threejs-3D-lowpoly-spec.md:93` requires the typed catalog to associate content IDs with models and says “不在场景分支中散落资产配置”. However, `src/three/Battlefield.ts:321–324` contains `if (definitionId === "walker" && this.library)` followed by `this.library.create("skeleton")`; `assetCatalog.ts` has no enemy-content association. Add a typed enemy lookup beside `buildingAsset` and let `makeEnemy` consume it. This is an actual structural rule breach, not an observed gameplay failure; it does not require expanding the sample's enemy coverage.

2. **Heuristic only, possible Duplicated Code:** `art/threejs/create_sample_sources.py:330–345` and `art/threejs/refine_sources.py:52–65` repeat the copy/convert/join/apply-transform/UV pipeline, including `duplicate=obj.copy(); duplicate.data=obj.data.copy()` and `bpy.ops.uv.smart_project(...)`. Consider extracting that shared mechanical pipeline while keeping initial creation and revision decisions separate. Non-blocking; no source corruption was observed.

The runtime review found no additional concrete ownership, cache, disposal, core-isolation or freeze violations. The library owns shared GLB resources; battlefield removal releases cloned rigs/instance buffers, restart clears transient state, and final exit disposes the library. Saved-source export does not regenerate or save over `.blend` files. Existing behavioral/build and visual evidence were inspected; passed regressions were not rerun. #5/#13 human/device acceptance remains separate.

**Total: 2 findings — 1 documented structural breach, 1 heuristic. Most serious: the scene-owned walker/model association (low priority).**
