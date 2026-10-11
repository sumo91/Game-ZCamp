## Standards

Fixed targeted range: `1b7774d9ee05dd7083d9f5f4bef375fa56c0a3a2...7cc0fb7a8316a7222826758231949e5168b827ed`, commit `7cc0fb7`; actual worktree is clean. Reviewed this nine-file diff, relevant existing callers, installed Three.js ownership code and existing regressions only.

**Original lifecycle P2: closed by code review.** `ModelLibrary.ts:81–94` adds an idempotent resource lease: `if (released) return` and `if (this.rendererUsers === 0) ... resource.dispose()`. Concurrent consumers retain shared GPU resources; the final release disposes deduplicated geometry, material and texture bindings. Three.js 0.186.1 resource handlers remove their renderer-specific disposal listeners (`WebGLGeometries.js:24`, `WebGLTextures.js:328`, `WebGLRenderer.js:1155`). Release precedes renderer disposal, so texture properties remain available for actual GPU deletion.

`HeroGallery.ts:54–60` and `Battlefield.ts:338–359` guard repeated exit, stop/uncache animation instances, release leases, then call `renderer.dispose()` and `renderer.forceContextLoss()`. The extra context-loss call is supported through `WEBGL_lose_context`; resource-disposal cleanup independently covers bindings. Instance skeleton disposal releases each cloned bone texture (`ModelLibrary.ts:71–77`, Three.js `Skeleton.dispose():298–304`).

CPU cache ownership remains correct: lease release preserves the models map, geometry attributes, material definitions and open ImageBitmaps. A subsequent scene clones the same cached assets and recreates GPU bindings. Only final `ModelLibrary.dispose():98–105` closes ImageBitmaps and clears the cache. This resolves the original listener-retention breach of `docs/specs/ZCamp-Threejs-3D-lowpoly-spec.md:102` and the accumulation mechanism relevant to :205.

Failure/exit paths checked: gallery constructor rollback invokes disposal (:16–35); WebGL initialization failure occurs before any asset lease; failed GLTF loading disposes its partial library; completed loading after page exit disposes the late result; `Battlefield.setModels():116–125` releases the previous lease before reacquiring; the page exits presenters before disposing the shared library (`ThreeGame.ts:124–128`). Retry resets instances without releasing an active scene's shared ownership.

Added battle text remains boundary presentation, using drained typed events and completed simulation delta; reset/terminal cleanup removes overlays. No documented breaches or substantial new Fowler smells found. Original duplicated baking remains nonblocking and unchanged; no consolidation requested.

The existing real-GLB regression checks concurrent leases, repeat release, CPU reuse and bone-texture disposal. It does not measure aggregate GPU bytes. No tests or browser operations were performed; this report is ownership verification, not visual/performance acceptance.

Counts: **original P2 closed; 0 new documented breaches; 0 new substantive heuristics**.
